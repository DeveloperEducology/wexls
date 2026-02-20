'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import QuestionRenderer from '@/components/practice/QuestionRenderer';
import QuestionParts from '@/components/practice/QuestionParts';
import WorkPad from '@/components/practice/WorkPad';
import { hasInlineHtml, sanitizeInlineHtml } from '@/components/practice/contentUtils';
import styles from './practice.module.css';

const CHALLENGE_STAGES = [
  { stage: 1, tokensNeeded: 5, label: 'Stage 1 of 3' },
  { stage: 2, tokensNeeded: 10, label: 'Stage 2 of 3' },
  { stage: 3, tokensNeeded: 15, label: 'Stage 3 of 3' },
];
const SUBMIT_TIMEOUT_MS = 8000;
const SUBMIT_RETRY_DELAYS_MS = [300, 700];

function parseSolutionParts(solution) {
  if (Array.isArray(solution)) return solution;

  if (solution && typeof solution === 'object') {
    if (solution.type && solution.content !== undefined) return [solution];
    return null;
  }

  if (typeof solution !== 'string') return null;
  const trimmed = solution.trim();
  if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && parsed.type && parsed.content !== undefined) {
      return [parsed];
    }
  } catch {
    return null;
  }

  return null;
}

function parseMaybeJson(text, fallback = null) {
  if (typeof text !== 'string') return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function getCorrectAnswerDisplay(question) {
  if (!question) return '';

  switch (question.type) {
    case 'mcq':
    case 'imageChoice': {
      if (question.isMultiSelect) {
        const indices = Array.isArray(question.correctAnswerIndices) ? question.correctAnswerIndices : [];
        const labels = indices.map((idx) => {
          const option = question.options?.[idx];
          if (typeof option === 'string' && !option.trim().startsWith('<') && !/^https?:\/\//i.test(option)) {
            return option;
          }
          return `Option ${Number(idx) + 1}`;
        });
        return labels.join(', ');
      }

      const idx = Number(question.correctAnswerIndex);
      if (!Number.isFinite(idx) || idx < 0) return '';
      const option = question.options?.[idx];
      if (typeof option === 'string' && !option.trim().startsWith('<') && !/^https?:\/\//i.test(option)) {
        return option;
      }
      return `Option ${idx + 1}`;
    }

    case 'textInput':
    case 'measure':
    case 'fourPicsOneWord':
      return String(question.correctAnswerText || '');

    case 'fillInTheBlank': {
      const parsed = parseMaybeJson(question.correctAnswerText, {});
      if (!parsed || typeof parsed !== 'object') return String(question.correctAnswerText || '');
      return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
    }

    case 'sorting': {
      const orderedIds = parseMaybeJson(question.correctAnswerText, []);
      if (Array.isArray(orderedIds) && orderedIds.length > 0 && Array.isArray(question.items)) {
        const labelById = new Map(question.items.map((item) => [String(item.id), String(item.content ?? item.id)]));
        return orderedIds.map((id) => labelById.get(String(id)) || String(id)).join(', ');
      }
      return String(question.correctAnswerText || '');
    }

    default:
      return String(question.correctAnswerText || '');
  }
}

function isVisualOption(option) {
  if (typeof option !== 'string') return false;
  const value = option.trim().toLowerCase();
  return (
    value.startsWith('<svg') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('data:image/')
  );
}

function getOptionLabel(option, index) {
  if (typeof option === 'object' && option !== null) {
    const label = option.label ?? option.text ?? '';
    if (label) return String(label);
  }
  if (typeof option === 'string' && !isVisualOption(option)) return option;
  return `Option ${index + 1}`;
}

function renderMaybeInlineHtml(value, className = '') {
  if (!hasInlineHtml(value)) {
    return <span className={className}>{value}</span>;
  }
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(String(value ?? '')) }}
    />
  );
}

function getSelectedAnswerDisplay(question, answer) {
  if (!question) return '';

  if (question.type === 'mcq' || question.type === 'imageChoice') {
    if (question.isMultiSelect) {
      const selected = Array.isArray(answer) ? answer : [];
      if (selected.length === 0) return 'No option selected';
      return selected
        .map((idx) => getOptionLabel(question.options?.[idx], Number(idx)))
        .join(', ');
    }
    const idx = Number(answer);
    if (!Number.isFinite(idx)) return 'No option selected';
    return getOptionLabel(question.options?.[idx], idx);
  }

  if (question.type === 'fillInTheBlank') {
    if (!answer || typeof answer !== 'object') return 'No answer';
    const parts = Array.isArray(question.parts) ? question.parts : [];
    const arithmeticPart = parts.find((part) => part?.type === 'arithmeticLayout');
    const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
    const answerRow = rows.find((row) => String(row?.kind || '').toLowerCase() === 'answer');
    const cells = Array.isArray(answerRow?.cells) ? answerRow.cells : [];

    if (cells.length > 0) {
      const prefix = String(answerRow?.prefix || '');
      const joined = cells
        .map((cell, idx) => String(answer?.[cell?.id ?? `cell_${idx}`] ?? ''))
        .join('');
      return `${prefix}${joined}`.trim() || 'No answer';
    }

    return Object.entries(answer).map(([k, v]) => `${k}: ${v}`).join(', ');
  }

  if (Array.isArray(answer)) {
    return answer.join(', ');
  }

  if (answer && typeof answer === 'object') {
    return JSON.stringify(answer);
  }

  return String(answer ?? '');
}

function getOrCreateStudentId() {
  if (typeof window === 'undefined') return null;

  const key = 'practice_student_id';
  const existing = window.localStorage.getItem(key);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (existing) {
    if (uuidRegex.test(existing)) return existing;
    const maybeSuffix = existing.replace(/^student-/, '');
    if (uuidRegex.test(maybeSuffix)) {
      window.localStorage.setItem(key, maybeSuffix);
      return maybeSuffix;
    }
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

function getAdaptiveSessionStorageKey(skillId) {
  return `adaptive_session_${String(skillId)}`;
}

function getStoredAdaptiveSessionId(skillId) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(getAdaptiveSessionStorageKey(skillId));
}

function setStoredAdaptiveSessionId(skillId, sessionId) {
  if (typeof window === 'undefined' || !sessionId) return;
  window.localStorage.setItem(getAdaptiveSessionStorageKey(skillId), String(sessionId));
}

async function resolveStudentId() {
  const guestId = getOrCreateStudentId();

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const authUserId = data?.user?.id ? String(data.user.id) : '';
    if (!authUserId) return guestId;

    if (typeof window !== 'undefined' && guestId && guestId !== authUserId) {
      try {
        await fetch('/api/adaptive/merge-guest-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestStudentId: guestId,
            userStudentId: authUserId,
          }),
        });
      } catch {
        // best effort merge only
      }
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('practice_student_id', authUserId);
    }
    return authUserId;
  } catch {
    return guestId;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitWithRetry(url, body) {
  let lastErrorMessage = 'Could not fetch next adaptive question.';

  for (let attempt = 0; attempt <= SUBMIT_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = await res.json();
      clearTimeout(timeoutId);

      if (!res.ok) {
        lastErrorMessage = payload.error || lastErrorMessage;
        throw new Error(lastErrorMessage);
      }

      return payload;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        lastErrorMessage = 'Request timed out. Please try again.';
      } else if (error?.message) {
        lastErrorMessage = error.message;
      }

      if (attempt < SUBMIT_RETRY_DELAYS_MS.length) {
        await delay(SUBMIT_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new Error(lastErrorMessage);
    }
  }

  throw new Error(lastErrorMessage);
}

function computeSmartScoreDelta({
  isCorrect,
  masteryScore,
  confidence,
  difficulty,
  phase,
  responseMs,
  streak,
  missStreak,
}) {
  const safeMastery = Number.isFinite(Number(masteryScore)) ? Math.max(0, Math.min(1, Number(masteryScore))) : 0.5;
  const safeConfidence = Number.isFinite(Number(confidence)) ? Math.max(0, Math.min(1, Number(confidence))) : 0.4;
  const safeResponseMs = Math.max(1, Number(responseMs || 0));
  const difficultyWeight = ({
    easy: 1.0,
    medium: 1.2,
    hard: 1.45,
  })[String(difficulty || 'easy').toLowerCase()] || 1.0;
  const phaseWeight = ({
    warmup: 0.95,
    core: 1.0,
    challenge: 1.2,
    recovery: 0.85,
    done: 1.0,
  })[String(phase || 'core').toLowerCase()] || 1.0;

  const fastGuessPenalty = safeResponseMs < 1200 ? 2.2 : (safeResponseMs < 2200 ? 1.2 : 0);
  const lowConfidencePenalty = safeConfidence < 0.35 ? 0.6 : 0;
  const details = {
    masteryScore: safeMastery,
    confidence: safeConfidence,
    difficultyWeight,
    phaseWeight,
    fastGuessPenalty,
    lowConfidencePenalty,
    responseMs: safeResponseMs,
    phase: String(phase || 'core').toLowerCase(),
    difficulty: String(difficulty || 'easy').toLowerCase(),
  };

  if (isCorrect) {
    const baseGain = 2.6 + (safeMastery * 2.8) + (safeConfidence * 1.6);
    const streakBoost = Math.min(1.35, 1 + (Math.max(0, streak) * 0.06));
    const raw = (baseGain * difficultyWeight * phaseWeight * streakBoost) - fastGuessPenalty - lowConfidencePenalty;
    const delta = Math.round(Math.max(1, raw));
    return {
      delta,
      details: {
        ...details,
        mode: 'gain',
        base: baseGain,
        streakBoost,
      },
    };
  }

  const baseLoss = 3.8 + (Math.max(0, missStreak) * 0.8);
  const phaseLossWeight = String(phase || 'core').toLowerCase() === 'recovery' ? 0.8 : 1.0;
  const difficultyLossWeight = 0.85 + ((difficultyWeight - 1) * 0.5);
  const raw = (baseLoss * phaseLossWeight * difficultyLossWeight) + fastGuessPenalty;
  const delta = -Math.round(Math.max(2, raw));
  return {
    delta,
    details: {
      ...details,
      mode: 'loss',
      base: baseLoss,
      phaseLossWeight,
      difficultyLossWeight,
      missStreak: Math.max(0, missStreak),
    },
  };
}

export default function PracticePage() {
  const params = useParams();
  const { microskillId } = params;

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [nextQuestion, setNextQuestion] = useState(null);
  const [seenQuestionIds, setSeenQuestionIds] = useState([]);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transitionStage, setTransitionStage] = useState('idle');
  const [curriculumContext, setCurriculumContext] = useState({
    grade: null,
    subject: null,
    microskill: null,
  });
  const [feedbackData, setFeedbackData] = useState(null);
  const [adaptiveSessionId, setAdaptiveSessionId] = useState(null);
  const [usingAdaptiveApi, setUsingAdaptiveApi] = useState(true);
  const [adaptiveMeta, setAdaptiveMeta] = useState(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [currentStudentId, setCurrentStudentId] = useState('');

  const [userAnswer, setUserAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  const [smartScore, setSmartScore] = useState(0);
  const [smartScoreBreakdown, setSmartScoreBreakdown] = useState(null);
  const [streak, setStreak] = useState(0);
  const [missStreak, setMissStreak] = useState(0);
  const [adaptivePhase, setAdaptivePhase] = useState('warmup');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [tokensCollected, setTokensCollected] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWorkPadOpen, setIsWorkPadOpen] = useState(false);

  const currentChallengeStage = CHALLENGE_STAGES[currentStage];
  const teacherToolsHref = currentStudentId
    ? `/teacher/analytics?studentId=${encodeURIComponent(currentStudentId)}&microSkillId=${encodeURIComponent(String(microskillId || ''))}`
    : '/teacher/analytics';
  const withSubmitBehavior = (question) => {
    if (!question) return question;
    if (question.isMultiSelect) {
      return { ...question, showSubmitButton: true };
    }
    if (question.type !== 'mcq') {
      return { ...question, showSubmitButton: true };
    }
    return question;
  };

  const { microskill, subject, grade } = curriculumContext;
  const skillTitle = microskill ? `${microskill.code} ${microskill.name}` : `Skill ${microskillId}`;
  const solutionParts = parseSolutionParts(feedbackData?.solution);
  const correctAnswerDisplay = feedbackData?.correctAnswerDisplay || '';
  const selectedAnswerDisplay = getSelectedAnswerDisplay(currentQuestion, userAnswer);
  const isOptionType = currentQuestion?.type === 'mcq' || currentQuestion?.type === 'imageChoice';
  const selectedIndexSet = currentQuestion?.isMultiSelect
    ? new Set(Array.isArray(userAnswer) ? userAnswer.map((value) => Number(value)) : [])
    : new Set(Number.isFinite(Number(userAnswer)) ? [Number(userAnswer)] : []);
  const correctIndexSet = new Set(
    Array.isArray(feedbackData?.correctOptionIndices)
      ? feedbackData.correctOptionIndices.map((value) => Number(value))
      : []
  );

  useEffect(() => {
    let active = true;

    const loadFirstQuestion = async () => {
      setLoadingQuestion(true);
      setSubmitError('');
      setUserAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setFeedbackData(null);
      setNextQuestion(null);
      setSeenQuestionIds([]);
      setAdaptiveSessionId(null);
      setUsingAdaptiveApi(true);
      setAdaptiveMeta(null);
      setAdaptivePhase('warmup');
      setMissStreak(0);

      try {
        const studentId = await resolveStudentId();
        setCurrentStudentId(studentId || '');
        let firstQuestion = null;
        let adaptiveInitError = '';

        if (studentId) {
          try {
            const sessionRes = await fetch('/api/adaptive/session/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId,
                microSkillId: microskillId,
                sessionId: getStoredAdaptiveSessionId(microskillId),
              }),
            });
            const sessionPayload = await sessionRes.json();
            if (!active) return;

            if (!sessionRes.ok || !sessionPayload.sessionId) {
              const reason = sessionPayload?.error || 'Adaptive session could not start.';
              throw new Error(reason);
            }

            setAdaptiveSessionId(String(sessionPayload.sessionId));
            setStoredAdaptiveSessionId(microskillId, sessionPayload.sessionId);
            setAdaptivePhase(sessionPayload.phase || 'warmup');

            const nextRes = await fetch('/api/adaptive/next-question', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionPayload.sessionId,
                studentId,
                microSkillId: microskillId,
              }),
            });
            const nextPayload = await nextRes.json();
            if (!active) return;

            if (!nextRes.ok || !nextPayload.question) {
              const reason = nextPayload?.error || 'Adaptive question selection failed.';
              throw new Error(reason);
            }

            firstQuestion = nextPayload.question;
            setUsingAdaptiveApi(true);
            setAdaptiveMeta(nextPayload.selectionMeta || null);
          } catch (adaptiveError) {
            setUsingAdaptiveApi(false);
            setAdaptiveSessionId(null);
            adaptiveInitError = adaptiveError?.message || 'Adaptive init failed';
          }
        }

        if (!firstQuestion) {
          const res = await fetch(`/api/practice/${microskillId}`, { cache: 'no-store' });
          const payload = await res.json();
          if (!active) return;

          if (!res.ok || !payload?.question) {
            throw new Error(payload?.error || 'Could not load first question.');
          }

          firstQuestion = payload.question;
          if (adaptiveInitError) {
            setSubmitError(`Adaptive disabled: ${adaptiveInitError}`);
          }
        }

        setCurrentQuestion(firstQuestion);
        setQuestionStartedAt(Date.now());
        setSeenQuestionIds(firstQuestion?.id ? [String(firstQuestion.id)] : []);
      } catch (error) {
        if (!active) return;
        setSubmitError(error?.message || 'Could not load first question. Please refresh.');
        setCurrentQuestion(null);
      } finally {
        if (!active) return;
        setLoadingQuestion(false);
      }
    };

    loadFirstQuestion();

    return () => {
      active = false;
    };
  }, [microskillId]);

  useEffect(() => {
    let active = true;

    const loadCurriculumContext = async () => {
      try {
        const res = await fetch(`/api/curriculum/microskill/${microskillId}`, { cache: 'no-store' });
        const payload = await res.json();
        if (!active || !res.ok) return;

        setCurriculumContext({
          grade: payload.grade ?? null,
          subject: payload.subject ?? null,
          microskill: payload.microskill ?? null,
        });
      } catch {
        if (!active) return;
      }
    };

    loadCurriculumContext();
    return () => {
      active = false;
    };
  }, [microskillId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hrs: String(hrs).padStart(2, '0'),
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
    };
  };

  const time = formatTime(elapsedTime);

  const applyNextQuestion = (upcoming) => {
    if (upcoming) {
      setCurrentQuestion(upcoming);
      setQuestionStartedAt(Date.now());
      setNextQuestion(null);
      setUserAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setFeedbackData(null);
      setSubmitError('');
      setTransitionStage('idle');
      return;
    }

    setCurrentQuestion(null);
    setUserAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedbackData(null);
    setSubmitError('');
    setTransitionStage('idle');
  };

  const handleSubmit = async (answer = userAnswer) => {
    if (!currentQuestion || isAnswered || isSubmitting) return;
    setSubmitError('');
    setFeedbackData(null);
    setUserAnswer(answer);
    setIsAnswered(true); // optimistic: hide question immediately
    setIsCorrect(null); // pending server verdict

    setIsSubmitting(true);
    try {
      const studentId = await resolveStudentId();
      setCurrentStudentId(studentId || '');
      const responseMs = Math.max(1, Date.now() - Number(questionStartedAt || Date.now()));
      const submitBody = {
        studentId,
        microSkillId: microskillId,
        sessionId: adaptiveSessionId,
        questionId: currentQuestion.id,
        attemptId: crypto.randomUUID(),
        answer,
        responseMs,
        hintUsed: false,
        attemptsOnQuestion: 1,
        seenQuestionIds,
      };

      let payload = null;
      if (usingAdaptiveApi && adaptiveSessionId) {
        try {
          payload = await submitWithRetry('/api/adaptive/submit-and-next', submitBody);
        } catch (adaptiveError) {
          setUsingAdaptiveApi(false);
          setAdaptiveSessionId(null);
          setSubmitError(`Adaptive submit failed, switched to fallback mode: ${adaptiveError?.message || 'Unknown error'}`);
          payload = await submitWithRetry(`/api/practice/${microskillId}/submit`, submitBody);
        }
      } else {
        payload = await submitWithRetry(`/api/practice/${microskillId}/submit`, submitBody);
      }

      const correct = Boolean(payload?.result?.isCorrect ?? payload?.isCorrect);
      setIsCorrect(correct);
      setFeedbackData(payload?.result?.feedback || payload?.feedback || null);
      setQuestionsAnswered((prev) => prev + 1);
      const returnedPhase = payload?.sessionUpdate?.phase || adaptivePhase;
      setAdaptivePhase(returnedPhase);
      setAdaptiveMeta(payload?.selectionMeta || null);

      const nextStreak = correct ? streak + 1 : 0;
      const nextMissStreak = correct ? 0 : missStreak + 1;
      setStreak(nextStreak);
      setMissStreak(nextMissStreak);

      const scoreResult = computeSmartScoreDelta({
        isCorrect: correct,
        masteryScore: payload?.masteryUpdate?.newScore,
        confidence: payload?.masteryUpdate?.confidence,
        difficulty: currentQuestion?.difficulty || payload?.masteryUpdate?.difficultyBand || 'easy',
        phase: returnedPhase,
        responseMs,
        streak: nextStreak,
        missStreak: nextMissStreak,
      });
      const serverScoreResult = payload?.smartScore && typeof payload.smartScore === 'object'
        ? payload.smartScore
        : null;
      const effectiveScore = serverScoreResult || scoreResult;
      setSmartScore((prev) => Math.max(0, Math.min(100, prev + Number(effectiveScore.delta || 0))));
      setSmartScoreBreakdown({
        delta: Number(effectiveScore.delta || 0),
        details: effectiveScore.details,
        questionId: currentQuestion?.id || null,
      });

      if (correct) {
        const newTokens = tokensCollected + 1;
        setTokensCollected(newTokens);
        if (newTokens >= currentChallengeStage.tokensNeeded && currentStage < 2) {
          setCurrentStage(currentStage + 1);
          setTokensCollected(0);
        }
      } else {
        // keep tokens untouched on wrong answers
      }

      const upcoming = payload?.nextQuestion ?? null;
      setNextQuestion(upcoming);
      if (upcoming?.id) {
        setSeenQuestionIds((prev) =>
          prev.includes(String(upcoming.id)) ? prev : [...prev, String(upcoming.id)]
        );
      }

      // remove extra wait for correct answers; move immediately
      if (correct) {
        applyNextQuestion(upcoming);
      }
    } catch (error) {
      setSubmitError(error?.message || 'Could not fetch next adaptive question.');
      setNextQuestion(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setFeedbackData(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswer = (answer) => {
    setUserAnswer(answer);
    const effectiveQuestion = withSubmitBehavior(currentQuestion);
    if (effectiveQuestion && !effectiveQuestion.showSubmitButton) {
      handleSubmit(answer);
    }
  };

  const handleNext = () => {
    applyNextQuestion(nextQuestion);
  };

  if (loadingQuestion) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <Image
            src="/wexls-logo.svg"
            alt="WEXLS"
            className={styles.loadingBrand}
            width={56}
            height={56}
            priority
          />
          <div className={styles.loadingSpinner} aria-label="Loading practice" role="status" />
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className={styles.container}>
        <div className={styles.completionCard}>
          <h1>Practice Complete</h1>
          {submitError && <p>{submitError}</p>}
          <p>Final SmartScore: <strong>{smartScore}</strong></p>
          <p>Questions Answered: <strong>{questionsAnswered}</strong></p>
          <Link href="/" className={styles.homeButton}>Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.mobileProgress}>
        <div className={styles.mobileProgressLeft}>
          <div className={styles.mobileProgressItem}>
            <span className={styles.mobileProgressLabel}>Questions</span>
            <span className={styles.mobileProgressValue}>{questionsAnswered}</span>
          </div>
          <div className={styles.mobileProgressItem}>
            <span className={styles.mobileProgressLabel}>Time</span>
            <span className={styles.mobileProgressValue}>{time.mins}:{time.secs}</span>
          </div>
        </div>
        <div className={styles.mobileProgressCenter}>
          <div className={styles.mobileSkillName}>{microskill?.code || 'Skill'}</div>
        </div>
        <div className={styles.mobileProgressRight}>
          <div className={styles.mobileProgressItem}>
            <span className={styles.mobileProgressLabel}>SmartScore</span>
            <span className={styles.mobileProgressValue}>{smartScore}</span>
          </div>
        </div>
      </div>

      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Link href="/" className={styles.logo}><span>WEXLS</span></Link>
          <div className={styles.skillTag}>{skillTitle}</div>
        </div>
        <div className={styles.topBarStats}>
          <div className={styles.statPill}><span className={styles.statLabel}>Questions</span><strong>{questionsAnswered}</strong></div>
          <div className={styles.statPill}><span className={styles.statLabel}>Time</span><strong>{time.mins}:{time.secs}</strong></div>
          <div className={styles.statPill}><span className={styles.statLabel}>SmartScore</span><strong>{smartScore}</strong></div>
        </div>
      </header>

      <div className={styles.breadcrumb}>
        <Link href="/">{grade?.name || 'Grade'}</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span>{subject?.name || 'Subject'}</span>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span>{microskill?.code || 'Skill'}</span>
      </div>

      <div className={styles.layout}>
        <main className={styles.mainContent}>
          {/* <div className={styles.headerActions}>
            <button className={styles.exampleButton}><span className={styles.buttonIcon}>💡</span>Learn with an example</button>
            <span className={styles.orText}>or</span>
            <button className={styles.videoButton}><span className={styles.buttonIcon}>▶</span>Watch a video</button>
          </div> */}

          {!isAnswered && (
            <div
              className={`${styles.questionStage} ${
                transitionStage === 'exit'
                  ? styles.questionExit
                  : transitionStage === 'enter'
                    ? styles.questionEnter
                    : ''
              }`}
            >
              <QuestionRenderer
                question={withSubmitBehavior(currentQuestion)}
                userAnswer={userAnswer}
                onAnswer={handleAnswer}
                onSubmit={handleSubmit}
                isAnswered={isAnswered}
                isCorrect={isCorrect}
              />
            </div>
          )}

          {!isAnswered && (
            <div className={styles.workItOutContainer}>
              <button className={styles.workItOutButton} onClick={() => setIsWorkPadOpen(true)}>✏️ Work it out</button>
            </div>
          )}

          {!isAnswered && isWorkPadOpen && (
            <div className={styles.inlineWorkPadWrap}>
              <WorkPad
                open={isWorkPadOpen}
                mode="inline"
                storageKey={currentQuestion?.id || microskillId}
                onClose={() => setIsWorkPadOpen(false)}
              />
            </div>
          )}

          {submitError && <p className={styles.solution}>{submitError}</p>}

          {smartScoreBreakdown && (
            <div className={styles.scoreDebugCard}>
              <div className={styles.scoreDebugTitle}>SmartScore Breakdown</div>
              <div className={styles.scoreDebugDelta}>
                Change: <strong>{smartScoreBreakdown.delta > 0 ? `+${smartScoreBreakdown.delta}` : smartScoreBreakdown.delta}</strong>
              </div>
              <div className={styles.scoreDebugGrid}>
                <span>Phase: {smartScoreBreakdown.details?.phase}</span>
                <span>Difficulty: {smartScoreBreakdown.details?.difficulty}</span>
                <span>Mastery: {Number(smartScoreBreakdown.details?.masteryScore ?? 0).toFixed(2)}</span>
                <span>Confidence: {Number(smartScoreBreakdown.details?.confidence ?? 0).toFixed(2)}</span>
                <span>Response: {Math.round(Number(smartScoreBreakdown.details?.responseMs ?? 0))}ms</span>
                <span>Fast-guess penalty: {Number(smartScoreBreakdown.details?.fastGuessPenalty ?? 0).toFixed(1)}</span>
              </div>
            </div>
          )}

          {adaptiveMeta && (
            <div className={styles.adaptiveDebugCard}>
              <div className={styles.adaptiveDebugTitle}>Adaptive Debug</div>
              <div className={styles.adaptiveDebugGrid}>
                <span>Policy: {adaptiveMeta.policy || 'n/a'}</span>
                <span>Phase: {adaptiveMeta.phase || adaptivePhase || 'n/a'}</span>
                <span>Reason: {adaptiveMeta.reason || 'n/a'}</span>
                <span>Difficulty: {adaptiveMeta.difficulty || currentQuestion?.difficulty || 'n/a'}</span>
                <span>Remediation code: {adaptiveMeta.remediationCode || 'none'}</span>
                <span>Remediation left: {Number(adaptiveMeta.remediationRemaining ?? 0)}</span>
              </div>
            </div>
          )}

          {isAnswered && isCorrect === null && (
            <div className={`${styles.feedback} ${styles.correct}`}>
              <div className={styles.feedbackIcon}>…</div>
              <div className={styles.feedbackContent}>
                <h3>Checking your answer...</h3>
                <p className={styles.solution}>Loading next question...</p>
                <div className={styles.nextLoader} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          {isAnswered && isCorrect === true && (
            <div className={`${styles.feedback} ${styles.correct}`}>
              <div className={styles.feedbackIcon}>✓</div>
              <div className={styles.feedbackContent}>
                <h3>Great job!</h3>
                <p className={styles.solution}>
                  {isSubmitting ? 'Loading next question...' : 'Preparing your next question...'}
                </p>
                {isSubmitting && (
                  <div className={styles.nextLoader} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            </div>
          )}

          {isAnswered && isCorrect === false && (
            <div className={`${styles.feedback} ${styles.incorrect} ${styles.incorrectDetailed}`}>
              <h2 className={styles.incorrectTitle}>Sorry, incorrect...</h2>
              <div className={styles.correctAnswerRow}>
                <span className={styles.correctAnswerLabel}>The correct answer is:</span>
                {renderMaybeInlineHtml(correctAnswerDisplay || 'See explanation below', styles.correctAnswerValue)}
              </div>

              <h3 className={styles.explanationHeading}>Explanation</h3>
              <div className={styles.reviewCard}>
                <h4 className={styles.reviewTitle}>Question</h4>
                <div className={styles.reviewQuestion}>
                  {currentQuestion?.type === 'fillInTheBlank' ? (
                    <QuestionRenderer
                      question={withSubmitBehavior(currentQuestion)}
                      userAnswer={userAnswer}
                      onAnswer={() => {}}
                      onSubmit={() => {}}
                      isAnswered
                      isCorrect={false}
                    />
                  ) : (
                    <QuestionParts parts={currentQuestion?.parts || []} />
                  )}
                </div>

                {isOptionType && Array.isArray(currentQuestion?.options) && currentQuestion.options.length > 0 ? (
                  <div className={styles.reviewOptions}>
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={`review-opt-${index}`}
                        className={`${styles.reviewOption} ${selectedIndexSet.has(index) ? styles.reviewSelected : ''} ${correctIndexSet.has(index) ? styles.reviewCorrect : ''}`}
                      >
                        {renderMaybeInlineHtml(getOptionLabel(option, index), styles.reviewOptionLabel)}
                        {selectedIndexSet.has(index) && <span className={styles.reviewTag}>Your choice</span>}
                        {correctIndexSet.has(index) && <span className={styles.reviewTagCorrect}>Correct</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.reviewAnswerLine}>
                    <strong>You answered:</strong> {renderMaybeInlineHtml(selectedAnswerDisplay || 'No answer')}
                  </p>
                )}
              </div>

              {solutionParts ? (
                <div className={styles.solution}>
                  <QuestionParts parts={solutionParts} />
                </div>
              ) : (
                <p className={styles.solution}>{renderMaybeInlineHtml(feedbackData?.solution || '')}</p>
              )}

              <button onClick={handleNext} disabled={isSubmitting} className={styles.nextButton}>
                {isSubmitting ? 'Loading...' : 'Got it'}
              </button>
            </div>
          )}
        </main>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarLabel}>Questions answered</div>
            <div className={styles.sidebarValue}>{questionsAnswered}</div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarLabel}>Time elapsed</div>
            <div className={styles.timerDisplay}>
              <div className={styles.timeUnit}><div className={styles.timeValue}>{time.hrs}</div><div className={styles.timeLabel}>HR</div></div>
              <div className={styles.timeUnit}><div className={styles.timeValue}>{time.mins}</div><div className={styles.timeLabel}>MIN</div></div>
              <div className={styles.timeUnit}><div className={styles.timeValue}>{time.secs}</div><div className={styles.timeLabel}>SEC</div></div>
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.challengeHeader}>Challenge</div>
            <div className={styles.stageLabel}>{currentChallengeStage.label}</div>
            <div className={styles.tokenInfo}>Collect {currentChallengeStage.tokensNeeded} tokens</div>
            <div className={styles.tokens}>
              {Array.from({ length: currentChallengeStage.tokensNeeded }).map((_, i) => (
                <div key={i} className={`${styles.token} ${i < tokensCollected ? styles.collected : ''}`} />
              ))}
            </div>
          </div>

          <Link href={teacherToolsHref} className={styles.teacherTools}>🛠️ Teacher tools ›</Link>
        </aside>
      </div>

      <button
        type="button"
        className={styles.pencilIcon}
        title="Work it out"
        onClick={() => setIsWorkPadOpen(true)}
      >
        ✏️
      </button>
    </div>
  );
}
