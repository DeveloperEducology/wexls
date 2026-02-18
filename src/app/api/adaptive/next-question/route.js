import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import {
  chooseNextQuestion,
  fetchQuestionsByMicroskill,
  getSessionState,
  getStudentSkillState,
  toPublicQuestion,
  upsertSessionState,
} from '@/lib/adaptive/server';

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sessionId = String(payload?.sessionId ?? '').trim();
  const studentId = String(payload?.studentId ?? '').trim();
  const microskillKey = String(payload?.microSkillId ?? payload?.microskillId ?? '').trim();

  if (!sessionId || !studentId || !microskillKey) {
    return NextResponse.json({ error: 'sessionId, studentId and microSkillId are required.' }, { status: 400 });
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
    const [sessionState, skillState, questions] = await Promise.all([
      getSessionState(supabase, sessionId),
      getStudentSkillState(supabase, studentId, microskillId),
      fetchQuestionsByMicroskill(supabase, microskillId),
    ]);

    const targetDifficulty =
      sessionState?.active_difficulty ??
      skillState?.difficulty_band ??
      'easy';

    const result = chooseNextQuestion({
      questions,
      targetDifficulty,
      recentQuestionIds: sessionState?.recent_question_ids || [],
      excludeQuestionId: sessionState?.last_question_id || null,
    });

    if (result.question && sessionState?.id) {
      const updatedRecent = [
        ...((sessionState?.recent_question_ids || []).map(String)),
        String(result.question.id),
      ].slice(-20);

      await upsertSessionState(supabase, {
        ...sessionState,
        id: sessionState.id,
        last_question_id: result.question.id,
        recent_question_ids: updatedRecent,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      question: toPublicQuestion(result.question),
      selectionMeta: {
        policy: 'core_bandit_v1',
        reason: result.reason,
        difficulty: targetDifficulty,
        conceptTags: result.question?.adaptiveConfig?.conceptTags || [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to select next question.' }, { status: 500 });
  }
}
