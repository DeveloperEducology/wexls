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

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const studentId = String(payload?.studentId ?? '').trim();
  const microskillKey = String(payload?.microSkillId ?? payload?.microskillId ?? '').trim();
  const limitRaw = Number(payload?.limit ?? 30);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 30;

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

  const { data, error } = await supabase
    .from('attempt_events')
    .select('id,question_id,is_correct,response_ms,attempts_on_question,hint_used,selected_difficulty,concept_tags,misconception_code,correct_payload,created_at')
    .eq('student_id', studentId)
    .eq('micro_skill_id', microskillId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to fetch score breakdown.' }, { status: 500 });
  }

  const rows = (data || []).map((row) => {
    const payloadObj = row.correct_payload || {};
    const phase = String(payloadObj?.sessionUpdate?.phase ?? 'core');
    const confidence = Number(payloadObj?.masteryUpdate?.confidence ?? 0.4);
    const mastery = Number(payloadObj?.masteryUpdate?.newScore ?? 0.5);
    return {
      id: row.id,
      questionId: row.question_id,
      createdAt: row.created_at,
      isCorrect: Boolean(row.is_correct),
      estimatedDelta: estimateDelta(row),
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

  return NextResponse.json({
    studentId,
    microSkillId: microskillId,
    count: rows.length,
    rows,
  });
}
