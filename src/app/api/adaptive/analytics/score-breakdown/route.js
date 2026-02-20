import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';

function difficultyWeight(difficulty) {
  return ({
    easy: 1.0,
    medium: 1.2,
    hard: 1.45,
  })[String(difficulty || 'easy').toLowerCase()] || 1.0;
}

function phaseWeight(phase) {
  return ({
    warmup: 0.95,
    core: 1.0,
    challenge: 1.2,
    recovery: 0.85,
    done: 1.0,
  })[String(phase || 'core').toLowerCase()] || 1.0;
}

function estimateDelta(row) {
  const payload = row?.correct_payload || {};
  const mastery = Number(payload?.masteryUpdate?.newScore ?? 0.5);
  const confidence = Number(payload?.masteryUpdate?.confidence ?? 0.4);
  const phase = String(payload?.sessionUpdate?.phase ?? 'core');
  const responseMs = Math.max(1, Number(row?.response_ms ?? 0));
  const dWeight = difficultyWeight(row?.selected_difficulty);
  const pWeight = phaseWeight(phase);
  const fastGuessPenalty = responseMs < 1200 ? 2.2 : (responseMs < 2200 ? 1.2 : 0);
  const lowConfidencePenalty = confidence < 0.35 ? 0.6 : 0;

  if (row?.is_correct) {
    const baseGain = 2.6 + (mastery * 2.8) + (confidence * 1.6);
    return Math.round(Math.max(1, (baseGain * dWeight * pWeight) - fastGuessPenalty - lowConfidencePenalty));
  }

  const baseLoss = 3.8;
  const phaseLossWeight = phase === 'recovery' ? 0.8 : 1.0;
  const difficultyLossWeight = 0.85 + ((dWeight - 1) * 0.5);
  return -Math.round(Math.max(2, (baseLoss * phaseLossWeight * difficultyLossWeight) + fastGuessPenalty));
}

function summarizeAdaptive(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      phaseCounts: {},
      topMisconceptions: [],
      recoveryFunnel: {
        entries: 0,
        successfulExits: 0,
        unresolved: 0,
        avgAttemptsToExit: 0,
      },
      remediationHits: 0,
      remediationMisses: 0,
    };
  }

  const phaseCounts = {};
  const misconceptionCounts = {};
  let remediationHits = 0;
  let remediationMisses = 0;

  for (const row of rows) {
    const phase = String(row?.factors?.phase || 'core');
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;

    const code = String(row?.factors?.misconceptionCode || '').trim();
    if (code) misconceptionCounts[code] = (misconceptionCounts[code] || 0) + 1;

    if (row?.selectionMeta?.reason === 'misconception_remediation') remediationHits += 1;
    else if (String(row?.selectionMeta?.remediationCode || '').trim()) remediationMisses += 1;
  }

  const chronological = [...rows].reverse();
  let inRecovery = false;
  let currentAttempts = 0;
  let entries = 0;
  let successfulExits = 0;
  const attemptsToExit = [];

  for (const row of chronological) {
    const phase = String(row?.factors?.phase || 'core');
    if (phase === 'recovery') {
      if (!inRecovery) {
        inRecovery = true;
        entries += 1;
        currentAttempts = 0;
      }
      currentAttempts += 1;
      continue;
    }

    if (inRecovery) {
      successfulExits += 1;
      attemptsToExit.push(Math.max(1, currentAttempts));
      inRecovery = false;
      currentAttempts = 0;
    }
  }

  const unresolved = inRecovery ? 1 : 0;
  const avgAttemptsToExit = attemptsToExit.length > 0
    ? Number((attemptsToExit.reduce((a, b) => a + b, 0) / attemptsToExit.length).toFixed(2))
    : 0;

  const topMisconceptions = Object.entries(misconceptionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([code, count]) => ({ code, count }));

  return {
    phaseCounts,
    topMisconceptions,
    recoveryFunnel: {
      entries,
      successfulExits,
      unresolved,
      avgAttemptsToExit,
    },
    remediationHits,
    remediationMisses,
  };
}

export async function POST(req) {
  try {
    let payload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const studentId = String(payload?.studentId ?? '').trim();
    const microskillKey = String(payload?.microSkillId ?? payload?.microskillId ?? '').trim();
    const limitRaw = Number(payload?.limit ?? 30);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 30;
    const phaseFilter = String(payload?.phase ?? '').trim().toLowerCase();
    const dateFrom = String(payload?.dateFrom ?? '').trim();
    const dateTo = String(payload?.dateTo ?? '').trim();

    if (!studentId || !microskillKey) {
      return NextResponse.json({ error: 'studentId and microSkillId are required.' }, { status: 400 });
    }

    const microskillId = await resolveMicroskillIdByKey(microskillKey);
    if (!microskillId) {
      return NextResponse.json({ error: 'Microskill not found.' }, { status: 404 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
    }

    const buildBaseQuery = (selectClause) => supabase
      .from('attempt_events')
      .select(selectClause)
      .eq('student_id', studentId)
      .eq('micro_skill_id', microskillId);

    let query = buildBaseQuery('id,question_id,is_correct,response_ms,attempts_on_question,hint_used,selected_difficulty,concept_tags,misconception_code,correct_payload,created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(120, limit));

    if (dateFrom) {
      const fromIso = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
      query = query.gte('created_at', fromIso);
    }

    if (dateTo) {
      const toIso = new Date(`${dateTo}T23:59:59.999Z`).toISOString();
      query = query.lte('created_at', toIso);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message ?? 'Failed to fetch score breakdown.' }, { status: 500 });
    }

    let rows = (data || []).map((row) => {
    const payloadObj = row.correct_payload || {};
    const selectionMeta = payloadObj?.idempotency?.responsePayload?.selectionMeta || {};
    const serverSmartScoreDelta = Number(payloadObj?.idempotency?.responsePayload?.smartScore?.delta);
    const phase = String(payloadObj?.sessionUpdate?.phase ?? 'core');
    const confidence = Number(payloadObj?.masteryUpdate?.confidence ?? 0.4);
    const mastery = Number(payloadObj?.masteryUpdate?.newScore ?? 0.5);
    return {
      id: row.id,
      questionId: row.question_id,
      createdAt: row.created_at,
      isCorrect: Boolean(row.is_correct),
      estimatedDelta: Number.isFinite(serverSmartScoreDelta) ? serverSmartScoreDelta : estimateDelta(row),
      selectionMeta: {
        reason: selectionMeta?.reason || null,
        policy: selectionMeta?.policy || null,
        remediationCode: selectionMeta?.remediationCode || null,
        remediationRemaining: Number(selectionMeta?.remediationRemaining ?? 0),
      },
      factors: {
        phase,
        difficulty: String(row.selected_difficulty || 'easy'),
        masteryScore: mastery,
        confidence,
        responseMs: Number(row.response_ms ?? 0),
        attemptsOnQuestion: Number(row.attempts_on_question ?? 1),
        hintUsed: Boolean(row.hint_used),
        conceptTags: row.concept_tags || [],
        misconceptionCode: row.misconception_code || null,
      },
    };
  });

    if (phaseFilter) {
      rows = rows.filter((row) => String(row?.factors?.phase || '').toLowerCase() === phaseFilter);
    }

    rows = rows.slice(0, limit);

    let diagnostics = null;
    if (rows.length === 0) {
      const { data: anyRows } = await buildBaseQuery('created_at')
        .order('created_at', { ascending: true })
        .limit(1);
      const { data: latestRows } = await buildBaseQuery('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const firstAttemptAt = anyRows?.[0]?.created_at || null;
      const lastAttemptAt = latestRows?.[0]?.created_at || null;
      const hasAnyRows = Boolean(firstAttemptAt || lastAttemptAt);

      diagnostics = {
        hasAnyRows,
        dateFilteredOut: Boolean(hasAnyRows && (dateFrom || dateTo)),
        firstAttemptAt,
        lastAttemptAt,
      };
    }

    return NextResponse.json({
      studentId,
      microSkillId: microskillId,
      count: rows.length,
      summary: summarizeAdaptive(rows),
      diagnostics,
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected analytics server error.' },
      { status: 500 }
    );
  }
}
