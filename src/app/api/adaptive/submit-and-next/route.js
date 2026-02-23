import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import {
  appendCycleRecentQuestionIds,
  chooseNextQuestion,
  computeMasteryUpdate,
  computeServerSmartScoreDelta,
  computeSessionUpdate,
  detectMisconceptionCode,
  fetchQuestionsByMicroskill,
  getAdaptivePolicyVersion,
  getRecoveryContextFromAttempts,
  getSessionState,
  getStudentSkillState,
  insertAttemptEvent,
  insertMisconceptionEvent,
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
        !trimmed.toLowerCase().startsWith('<svg') &&
        !/^https?:\/\//i.test(trimmed) &&
        !trimmed.startsWith('/') &&
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
      if (question.type === 'fillInTheBlank' || question.type === 'gridArithmetic') {
        try {
          const parsed = JSON.parse(String(question.correctAnswerText ?? ''));
          if (parsed && typeof parsed === 'object') {
            const arithmeticPart = (question.parts || []).find((part) => part?.type === 'arithmeticLayout');
            const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
            const answerRow = rows.find((row) => String(row?.kind || '').toLowerCase() === 'answer');
            const cells = Array.isArray(answerRow?.cells) ? answerRow.cells : [];

            if (cells.length > 0) {
              const prefix = String(answerRow?.prefix || '');
              const joined = cells.map((cell, idx) => String(parsed[cell?.id ?? `cell_${idx}`] ?? '')).join('');
              return `${prefix}${joined}`.trim();
            }

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

    const [questions, prevSession, prevSkill, priorRecoveryContext] = await Promise.all([
      fetchQuestionsByMicroskill(supabase, microskillId),
      getSessionState(supabase, sessionId),
      getStudentSkillState(supabase, studentId, microskillId),
      getRecoveryContextFromAttempts(supabase, { sessionId }),
    ]);

    const currentQuestion = questions.find((q) => String(q.id) === questionId);
    if (!currentQuestion) {
      return NextResponse.json({ error: 'Question not found for this microskill.' }, { status: 404 });
    }

    const isCorrect = validateAnswer(currentQuestion, answer);
    const detectedMisconceptionCode = detectMisconceptionCode({
      question: currentQuestion,
      answer,
      isCorrect,
    });
    const misconceptionCodeForWrongAnswer = !isCorrect
      ? (detectedMisconceptionCode || `incorrect_${String(currentQuestion?.type || 'unknown').toLowerCase()}`)
      : null;
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
      misconceptionCode: misconceptionCodeForWrongAnswer,
      masteryScore: mastery.masteryScore,
      confidence: mastery.confidence,
      avgLatencyMs: mastery.avgLatencyMs,
    });

    const effectiveRemediationCode = !isCorrect
      ? misconceptionCodeForWrongAnswer
      : (priorRecoveryContext?.misconceptionCode ?? null);
    const effectiveRemediationRemaining = !isCorrect
      ? (effectiveRemediationCode ? 2 : 0)
      : Math.max(0, Number(priorRecoveryContext?.remediationRemaining ?? 0) - 1);
    const inRecoveryNow = effectiveRemediationRemaining > 0;
    const effectivePhase = inRecoveryNow ? 'recovery' : sessionUpdate.phase;

    const cycleRecentQuestionIds = appendCycleRecentQuestionIds({
      prevRecentQuestionIds: prevSession?.recent_question_ids || [],
      newQuestionId: questionId,
      availableQuestionIds: questions.map((q) => q.id),
    });

    const sessionRow = await upsertSessionState(supabase, {
      id: sessionId,
      student_id: studentId,
      micro_skill_id: microskillId,
      phase: effectivePhase,
      target_correct_streak: sessionUpdate.targetCorrectStreak,
      current_streak: sessionUpdate.currentStreak,
      asked_count: sessionUpdate.askedCount,
      correct_count: sessionUpdate.correctCount,
      active_difficulty: sessionUpdate.activeDifficulty,
      last_question_id: questionId,
      recent_question_ids: cycleRecentQuestionIds,
      remediation_recent_question_ids: inRecoveryNow
        ? [...((prevSession?.remediation_recent_question_ids || []).map(String)), String(questionId)]
        : (prevSession?.remediation_recent_question_ids || []),
      active_misconception_code: inRecoveryNow ? effectiveRemediationCode : null,
      remediation_remaining: effectiveRemediationRemaining,
      updated_at: new Date().toISOString(),
      completed_at: effectivePhase === 'done' ? new Date().toISOString() : null,
    });

    const nextResult = chooseNextQuestion({
      questions,
      targetDifficulty: sessionRow?.active_difficulty ?? mastery.difficultyBand,
      recentQuestionIds: sessionRow?.recent_question_ids || sessionUpdate.recentQuestionIds,
      remediationRecentQuestionIds: sessionRow?.remediation_recent_question_ids || [],
      excludeQuestionId: questionId,
      remediation: inRecoveryNow
        ? {
          misconceptionCode: effectiveRemediationCode,
            remaining: effectiveRemediationRemaining,
          }
        : null,
    });

    const smartScoreBreakdown = computeServerSmartScoreDelta({
      isCorrect,
      masteryScore: mastery.masteryScore,
      confidence: mastery.confidence,
      difficulty: currentQuestion?.difficulty || mastery.difficultyBand,
      phase: effectivePhase,
      responseMs,
      streak: sessionUpdate.currentStreak,
      missStreak: isCorrect ? 0 : Number(prevSession?.miss_streak ?? 0) + 1,
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
        phase: effectivePhase,
        currentStreak: sessionUpdate.currentStreak,
        askedCount: sessionUpdate.askedCount,
        correctCount: sessionUpdate.correctCount,
        accuracy: sessionUpdate.accuracy,
      },
      smartScore: smartScoreBreakdown,
      nextQuestion: toPublicQuestion(nextResult.question),
      selectionMeta: {
        policy: getAdaptivePolicyVersion(),
        reason: nextResult.reason,
        debug: nextResult.debug ?? null,
        phase: effectivePhase,
        difficulty: sessionRow?.active_difficulty ?? mastery.difficultyBand,
        remediationCode: effectiveRemediationCode,
        remediationRemaining: effectiveRemediationRemaining,
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
          phase: effectivePhase,
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
      misconception_code: misconceptionCodeForWrongAnswer ?? null,
    });

    if (!isCorrect && misconceptionCodeForWrongAnswer) {
      try {
        await insertMisconceptionEvent(supabase, {
          student_id: studentId,
          micro_skill_id: microskillId,
          session_id: sessionId,
          question_id: questionId,
          misconception_code: misconceptionCodeForWrongAnswer,
          answer_payload: answer,
          created_at: new Date().toISOString(),
        });
      } catch (misconceptionError) {
        // Keep question flow alive, but surface actual persistence issue for debugging.
        console.error('Failed to insert misconception event:', misconceptionError);
      }
    }

    return NextResponse.json(responsePayload);
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to submit and fetch next question.' }, { status: 500 });
  }
}
