import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUuid(value) {
  const v = String(value ?? '').trim();
  return UUID_REGEX.test(v) ? v : null;
}

function coalesceNextReview(a, b) {
  const t1 = a ? new Date(a).getTime() : Number.POSITIVE_INFINITY;
  const t2 = b ? new Date(b).getTime() : Number.POSITIVE_INFINITY;
  const min = Math.min(t1, t2);
  return Number.isFinite(min) ? new Date(min).toISOString() : null;
}

function mergeSkillRows(guestRow, userRow, userStudentId) {
  if (!userRow) {
    return {
      ...guestRow,
      id: guestRow.id,
      student_id: userStudentId,
      updated_at: new Date().toISOString(),
    };
  }

  const guestAttempts = Number(guestRow.attempts_total ?? 0);
  const userAttempts = Number(userRow.attempts_total ?? 0);
  const totalAttempts = guestAttempts + userAttempts;

  const mergedAvgLatency = totalAttempts > 0
    ? Math.round(
      ((Number(guestRow.avg_latency_ms ?? 0) * guestAttempts) + (Number(userRow.avg_latency_ms ?? 0) * userAttempts))
      / totalAttempts
    )
    : 0;

  const guestMastery = Number(guestRow.mastery_score ?? 0.2);
  const userMastery = Number(userRow.mastery_score ?? 0.2);
  const guestConfidence = Number(guestRow.confidence ?? 0.1);
  const userConfidence = Number(userRow.confidence ?? 0.1);

  return {
    id: userRow.id,
    student_id: userStudentId,
    micro_skill_id: userRow.micro_skill_id,
    mastery_score: Math.max(guestMastery, userMastery),
    confidence: Math.max(guestConfidence, userConfidence),
    difficulty_band: guestMastery > userMastery ? guestRow.difficulty_band : userRow.difficulty_band,
    streak: Math.max(Number(guestRow.streak ?? 0), Number(userRow.streak ?? 0)),
    attempts_total: totalAttempts,
    correct_total: Number(guestRow.correct_total ?? 0) + Number(userRow.correct_total ?? 0),
    avg_latency_ms: mergedAvgLatency,
    last_attempt_at: [guestRow.last_attempt_at, userRow.last_attempt_at]
      .filter(Boolean)
      .map((v) => new Date(v).toISOString())
      .sort()
      .at(-1) || null,
    next_review_at: coalesceNextReview(guestRow.next_review_at, userRow.next_review_at),
    status: (guestRow.status === 'proficient' || userRow.status === 'proficient') ? 'proficient' : 'learning',
    updated_at: new Date().toISOString(),
  };
}

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const guestStudentId = ensureUuid(payload?.guestStudentId);
  const userStudentId = ensureUuid(payload?.userStudentId);

  if (!guestStudentId || !userStudentId) {
    return NextResponse.json({ error: 'guestStudentId and userStudentId must be UUIDs.' }, { status: 400 });
  }
  if (guestStudentId === userStudentId) {
    return NextResponse.json({ merged: false, reason: 'same_id' });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
  }

  try {
    const { data: guestSkills, error: guestSkillError } = await supabase
      .from('student_skill_state')
      .select('*')
      .eq('student_id', guestStudentId);
    if (guestSkillError) throw guestSkillError;

    const { data: userSkills, error: userSkillError } = await supabase
      .from('student_skill_state')
      .select('*')
      .eq('student_id', userStudentId);
    if (userSkillError) throw userSkillError;

    const userByMicroskill = new Map((userSkills || []).map((row) => [String(row.micro_skill_id), row]));
    let mergedSkillRows = 0;

    for (const guestRow of (guestSkills || [])) {
      const userRow = userByMicroskill.get(String(guestRow.micro_skill_id));
      const merged = mergeSkillRows(guestRow, userRow, userStudentId);
      const { error } = await supabase
        .from('student_skill_state')
        .upsert(merged, { onConflict: 'student_id,micro_skill_id' });
      if (!error) mergedSkillRows += 1;
    }

    await supabase.from('student_skill_state').delete().eq('student_id', guestStudentId);

    const { error: attemptUpdateError } = await supabase
      .from('attempt_events')
      .update({ student_id: userStudentId })
      .eq('student_id', guestStudentId);
    if (attemptUpdateError) throw attemptUpdateError;

    const { error: sessionUpdateError } = await supabase
      .from('session_state')
      .update({ student_id: userStudentId, updated_at: new Date().toISOString() })
      .eq('student_id', guestStudentId);
    if (sessionUpdateError) throw sessionUpdateError;

    const { error: misconceptionUpdateError } = await supabase
      .from('misconception_events')
      .update({ student_id: userStudentId })
      .eq('student_id', guestStudentId);
    if (misconceptionUpdateError) throw misconceptionUpdateError;

    return NextResponse.json({
      merged: true,
      guestStudentId,
      userStudentId,
      mergedSkillRows,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to merge guest progress.' }, { status: 500 });
  }
}
