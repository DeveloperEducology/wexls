import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import {
  getSessionState,
  getStudentSkillState,
  upsertSessionState,
  upsertStudentSkillState,
} from '@/lib/adaptive/server';

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const studentId = String(payload?.studentId ?? '').trim();
  const microskillKey = String(payload?.microSkillId ?? payload?.microskillId ?? '').trim();
  const sessionId = String(payload?.sessionId ?? '').trim() || null;

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

  try {
    const existingState = await getStudentSkillState(supabase, studentId, microskillId);
    const skillState = existingState ?? await upsertStudentSkillState(supabase, {
      student_id: studentId,
      micro_skill_id: microskillId,
      mastery_score: 0.2,
      confidence: 0.1,
      difficulty_band: 'easy',
      streak: 0,
      attempts_total: 0,
      correct_total: 0,
      avg_latency_ms: 0,
      status: 'learning',
      last_attempt_at: null,
      next_review_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    let sessionState = null;
    if (sessionId) {
      sessionState = await getSessionState(supabase, sessionId);
    }
    if (!sessionState) {
      sessionState = await upsertSessionState(supabase, {
        id: sessionId || undefined,
        student_id: studentId,
        micro_skill_id: microskillId,
        phase: 'warmup',
        target_correct_streak: 5,
        current_streak: 0,
        asked_count: 0,
        correct_count: 0,
        active_difficulty: skillState?.difficulty_band || 'easy',
        recent_question_ids: [],
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      sessionId: sessionState?.id ?? sessionId ?? null,
      phase: sessionState?.phase ?? 'warmup',
      activeDifficulty: sessionState?.active_difficulty ?? skillState?.difficulty_band ?? 'easy',
      mastery: {
        score: Number(skillState?.mastery_score ?? 0.2),
        confidence: Number(skillState?.confidence ?? 0.1),
        status: skillState?.status ?? 'learning',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to start adaptive session.' }, { status: 500 });
  }
}
