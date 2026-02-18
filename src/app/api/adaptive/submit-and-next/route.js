import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import {
  chooseNextQuestion,
  computeMasteryUpdate,
  computeSessionUpdate,
  fetchQuestionsByMicroskill,
  getSessionState,
  getStudentSkillState,
  insertAttemptEvent,
  toPublicQuestion,
  upsertSessionState,
  upsertStudentSkillState,
  validateAnswer,
} from '@/lib/adaptive/server';

function buildBasicFeedback(question) {
  const getOptionLabel = (option, index) => {
    if (typeof option === 'object' && option !== null) {
      const label = option.label ?? option.text ?? '';
      if (label) return String(label);
    }
    if (typeof option === 'string') {
      const trimmed = option.trim();
      if (
        !trimmed.startsWith('<') &&
        !/^https?:\/\//i.test(trimmed) &&
        !trimmed.startsWith('data:image/')
      ) {
        return option;
      }
    }
    return `Option ${index + 1}`;
  };

  return {
    solution: question?.solution ?? '',
    correctAnswerDisplay: (() => {
      if (!question) return '';
      if (question.type === 'mcq' || question.type === 'imageChoice') {
        if (question.isMultiSelect) {
          const indices = Array.isArray(question.correctAnswerIndices)
            ? question.correctAnswerIndices.map((i) => Number(i)).filter(Number.isFinite)
            : [];
          return indices.map((idx) => getOptionLabel(question.options?.[idx], idx)).join(', ');
        }
        const idx = Number(question.correctAnswerIndex);
        if (Number.isFinite(idx) && idx >= 0) {
          return getOptionLabel(question.options?.[idx], idx);
        }
      }
      if (question.type === 'fillInTheBlank') {
        try {
          const parsed = JSON.parse(String(question.correctAnswerText ?? ''));
          if (parsed && typeof parsed === 'object') {
            return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
          }
        } catch {}
      }
      return String(question?.correctAnswerText ?? '');
    })(),
    correctOptionIndices: (() => {
      if (!question) return [];
      if (question.isMultiSelect && Array.isArray(question.correctAnswerIndices)) {
        return question.correctAnswerIndices.map((i) => Number(i)).filter(Number.isFinite);
      }
      const idx = Number(question.correctAnswerIndex);
      return Number.isFinite(idx) ? [idx] : [];
    })(),
  };
}

function extractIdempotencyResponse(correctPayload) {
  if (!correctPayload || typeof correctPayload !== 'object') return null;
  const idempotency = correctPayload.idempotency;
  if (!idempotency || typeof idempotency !== 'object') return null;
  return idempotency.responsePayload && typeof idempotency.responsePayload === 'object'
    ? idempotency.responsePayload
    : null;
}

async function findIdempotentReplay(supabase, { sessionId, studentId, microskillId, questionId, attemptId }) {
  if (!attemptId) return null;

  const { data, error } = await supabase
    .from('attempt_events')
    .select('correct_payload, created_at')
    .eq('session_id', sessionId)
    .eq('student_id', studentId)
    .eq('micro_skill_id', microskillId)
    .eq('question_id', questionId)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error || !Array.isArray(data)) return null;

  const matched = data.find((row) => {
    const candidate = row?.correct_payload?.idempotency?.attemptId;
    return String(candidate || '') === String(attemptId);
  });

  return extractIdempotencyResponse(matched?.correct_payload);
}

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
  const questionId = String(payload?.questionId ?? '').trim();
  const answer = payload?.answer ?? null;
  const attemptId = String(payload?.attemptId ?? '').trim();
  const responseMs = Number(payload?.responseMs ?? 0);
  const hintUsed = Boolean(payload?.hintUsed ?? false);
  const attemptsOnQuestion = Number(payload?.attemptsOnQuestion ?? 1);

  if (!sessionId || !studentId || !microskillKey || !questionId) {
    return NextResponse.json(
      { error: 'sessionId, studentId, microSkillId and questionId are required.' },
      { status: 400 }
    );
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
    const replayPayload = await findIdempotentReplay(supabase, {
      sessionId,
      studentId,
      microskillId,
      questionId,
      attemptId,
    });
    if (replayPayload) {
      return NextResponse.json({
        ...replayPayload,
        source: 'idempotent_replay',
      });
    }

    const [questions, prevSession, prevSkill] = await Promise.all([
      fetchQuestionsByMicroskill(supabase, microskillId),
      getSessionState(supabase, sessionId),
      getStudentSkillState(supabase, studentId, microskillId),
    ]);

    const currentQuestion = questions.find((q) => String(q.id) === questionId);
    if (!currentQuestion) {
      return NextResponse.json({ error: 'Question not found for this microskill.' }, { status: 404 });
    }

    const isCorrect = validateAnswer(currentQuestion, answer);
    const feedback = buildBasicFeedback(currentQuestion);
    const mastery = computeMasteryUpdate({
      prevState: prevSkill,
      isCorrect,
      responseMs,
      hintUsed,
      attemptsOnQuestion,
    });

    const skillRow = await upsertStudentSkillState(supabase, {
      student_id: studentId,
      micro_skill_id: microskillId,
      mastery_score: mastery.masteryScore,
      confidence: mastery.confidence,
      difficulty_band: mastery.difficultyBand,
      streak: mastery.streak,
      attempts_total: mastery.attemptsTotal,
      correct_total: mastery.correctTotal,
      avg_latency_ms: mastery.avgLatencyMs,
      status: mastery.status,
      last_attempt_at: new Date().toISOString(),
      next_review_at: mastery.nextReviewAt,
      updated_at: new Date().toISOString(),
    });

    const sessionUpdate = computeSessionUpdate({
      prevSession,
      isCorrect,
      currentQuestionId: questionId,
      activeDifficulty: skillRow?.difficulty_band ?? mastery.difficultyBand,
    });

    const sessionRow = await upsertSessionState(supabase, {
      id: sessionId,
      student_id: studentId,
      micro_skill_id: microskillId,
      phase: sessionUpdate.phase,
      target_correct_streak: sessionUpdate.targetCorrectStreak,
      current_streak: sessionUpdate.currentStreak,
      asked_count: sessionUpdate.askedCount,
      correct_count: sessionUpdate.correctCount,
      active_difficulty: sessionUpdate.activeDifficulty,
      last_question_id: questionId,
      recent_question_ids: sessionUpdate.recentQuestionIds,
      updated_at: new Date().toISOString(),
      completed_at: sessionUpdate.phase === 'done' ? new Date().toISOString() : null,
    });

    const nextResult = chooseNextQuestion({
      questions,
      targetDifficulty: sessionRow?.active_difficulty ?? mastery.difficultyBand,
      recentQuestionIds: sessionRow?.recent_question_ids || sessionUpdate.recentQuestionIds,
      excludeQuestionId: questionId,
    });

    const responsePayload = {
      result: {
        isCorrect,
        feedback,
      },
      masteryUpdate: {
        prevScore: mastery.prevScore,
        newScore: mastery.masteryScore,
        confidence: mastery.confidence,
        difficultyBand: mastery.difficultyBand,
        streak: mastery.streak,
      },
      sessionUpdate: {
        phase: sessionUpdate.phase,
        currentStreak: sessionUpdate.currentStreak,
        askedCount: sessionUpdate.askedCount,
        correctCount: sessionUpdate.correctCount,
      },
      nextQuestion: toPublicQuestion(nextResult.question),
      selectionMeta: {
        policy: 'core_bandit_v1',
        reason: nextResult.reason,
      },
    };

    await insertAttemptEvent(supabase, {
      session_id: sessionId,
      student_id: studentId,
      micro_skill_id: microskillId,
      question_id: questionId,
      is_correct: isCorrect,
      response_ms: Math.max(0, responseMs),
      attempts_on_question: Math.max(1, attemptsOnQuestion),
      hint_used: hintUsed,
      answer_payload: answer,
      correct_payload: {
        correctAnswerText: currentQuestion.correctAnswerText,
        masteryUpdate: {
          prevScore: mastery.prevScore,
          newScore: mastery.masteryScore,
          confidence: mastery.confidence,
          difficultyBand: mastery.difficultyBand,
        },
        sessionUpdate: {
          phase: sessionUpdate.phase,
          currentStreak: sessionUpdate.currentStreak,
          askedCount: sessionUpdate.askedCount,
          correctCount: sessionUpdate.correctCount,
        },
        idempotency: {
          attemptId: attemptId || null,
          responsePayload,
        },
      },
      selected_difficulty: currentQuestion.difficulty ?? 'easy',
      concept_tags: currentQuestion.adaptiveConfig?.conceptTags || [],
      misconception_code: currentQuestion.adaptiveConfig?.misconceptionCode ?? null,
    });

    return NextResponse.json(responsePayload);
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to submit and fetch next question.' }, { status: 500 });
  }
}
