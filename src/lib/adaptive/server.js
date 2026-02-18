import { mapDbQuestion } from '@/lib/practice/questionMapper';

const SKILL_COLUMNS = ['micro_skill_id', 'microskill_id'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value ?? '').trim();
  if (!str) return null;
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMaybeJson(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isMissingTableError(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  );
}

function normalizeDifficulty(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return DIFFICULTIES.includes(normalized) ? normalized : 'easy';
}

function shiftDifficulty(current, direction) {
  const idx = DIFFICULTIES.indexOf(normalizeDifficulty(current));
  const next = Math.max(0, Math.min(DIFFICULTIES.length - 1, idx + direction));
  return DIFFICULTIES[next];
}

function getMeasureTarget(question) {
  if (!question || question.type !== 'measure') return null;

  return (
    parseNumber(question.adaptiveConfig?.target_units) ??
    parseNumber(question.adaptiveConfig?.line_units) ??
    parseNumber(question.adaptiveConfig?.line_length) ??
    parseNumber(question.adaptiveConfig?.target_length) ??
    parseNumber(question.correctAnswerText)
  );
}

function shuffleLetters(letters) {
  const out = [...letters];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getFourPicsPuzzle(question) {
  if (!question || question.type !== 'fourPicsOneWord') return { wordLength: null, letterBank: null };
  const answer = String(question.correctAnswerText ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!answer) return { wordLength: null, letterBank: null };
  return {
    wordLength: answer.length,
    letterBank: shuffleLetters(answer.split('')),
  };
}

export function toPublicQuestion(question) {
  if (!question) return null;
  const fourPics = getFourPicsPuzzle(question);
  return {
    id: question.id,
    microSkillId: question.microSkillId ?? null,
    type: question.type,
    difficulty: question.difficulty ?? 'easy',
    complexity: Number(question.complexity ?? 0),
    parts: question.parts ?? [],
    options: question.options ?? [],
    items: question.items ?? [],
    dragItems: question.dragItems ?? [],
    dropGroups: question.dropGroups ?? [],
    adaptiveConfig: question.adaptiveConfig ?? null,
    measureTarget: getMeasureTarget(question),
    wordLength: fourPics.wordLength,
    letterBank: fourPics.letterBank,
    isMultiSelect: Boolean(question.isMultiSelect),
    isVertical: Boolean(question.isVertical),
    showSubmitButton: Boolean(question.showSubmitButton),
  };
}

export async function fetchQuestionsByMicroskill(supabase, microskillId) {
  let data = null;
  let error = null;

  for (const skillColumn of SKILL_COLUMNS) {
    for (const orderColumn of ORDER_COLUMNS) {
      ({ data, error } = await supabase
        .from('questions')
        .select('*')
        .eq(skillColumn, microskillId)
        .order(orderColumn, { ascending: true }));

      if (!error) return (data ?? []).map(mapDbQuestion);
      if (!error.message?.includes(skillColumn) && !error.message?.includes(orderColumn)) break;
    }
  }

  throw new Error(error?.message ?? 'Failed to fetch questions for microskill.');
}

export function validateAnswer(question, answer) {
  if (!question) return false;

  switch (question.type) {
    case 'mcq':
    case 'imageChoice':
      if (question.isMultiSelect) {
        const selected = Array.isArray(answer) ? [...answer].map(Number).sort() : [];
        const correct = Array.isArray(question.correctAnswerIndices)
          ? [...question.correctAnswerIndices].map(Number).sort()
          : [];
        return JSON.stringify(selected) === JSON.stringify(correct);
      }
      return Number(answer) === Number(question.correctAnswerIndex);

    case 'textInput':
      return String(answer ?? '').trim().toLowerCase() === String(question.correctAnswerText ?? '').trim().toLowerCase();

    case 'fillInTheBlank': {
      const correctAnswers = parseMaybeJson(question.correctAnswerText, {});
      if (!correctAnswers || typeof correctAnswers !== 'object') return false;
      return Object.keys(correctAnswers).every((key) => (
        String(answer?.[key] ?? '').trim().toLowerCase() === String(correctAnswers[key]).trim().toLowerCase()
      ));
    }

    case 'dragAndDrop':
      return (question.dragItems || [])
        .filter((item) => item.targetGroupId != null && String(item.targetGroupId).trim() !== '')
        .every((item) => String(answer?.[item.id] ?? '') === String(item.targetGroupId));

    case 'sorting': {
      const expectedOrder = parseMaybeJson(question.correctAnswerText, null);
      if (Array.isArray(expectedOrder) && expectedOrder.length > 0) {
        return JSON.stringify((answer || []).map(String)) === JSON.stringify(expectedOrder.map(String));
      }
      return false;
    }

    case 'fourPicsOneWord':
      return (Array.isArray(answer) ? answer.join('') : String(answer ?? '')).toUpperCase() === String(question.correctAnswerText ?? '').toUpperCase();

    case 'measure': {
      const expected = parseNumber(question.correctAnswerText);
      const actual = parseNumber(answer);
      if (expected == null || actual == null) return false;
      return Math.abs(actual - expected) < 0.0001;
    }

    default:
      return false;
  }
}

export async function getStudentSkillState(supabase, studentId, microskillId) {
  const { data, error } = await supabase
    .from('student_skill_state')
    .select('*')
    .eq('student_id', studentId)
    .eq('micro_skill_id', microskillId)
    .maybeSingle();

  if (!error) return data;
  if (isMissingTableError(error)) return null;
  throw new Error(error.message);
}

export async function upsertStudentSkillState(supabase, payload) {
  const { data, error } = await supabase
    .from('student_skill_state')
    .upsert(payload, { onConflict: 'student_id,micro_skill_id' })
    .select('*')
    .single();

  if (!error) return data;
  if (isMissingTableError(error)) return null;
  throw new Error(error.message);
}

export async function getSessionState(supabase, sessionId) {
  const { data, error } = await supabase
    .from('session_state')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (!error) return data;
  if (isMissingTableError(error)) return null;
  throw new Error(error.message);
}

export async function upsertSessionState(supabase, payload) {
  const { data, error } = await supabase
    .from('session_state')
    .upsert(payload)
    .select('*')
    .single();

  if (!error) return data;
  if (isMissingTableError(error)) return null;
  throw new Error(error.message);
}

export async function insertAttemptEvent(supabase, payload) {
  const { error } = await supabase.from('attempt_events').insert(payload);
  if (!error) return;
  if (isMissingTableError(error)) return;
  throw new Error(error.message);
}

export function chooseNextQuestion({
  questions,
  targetDifficulty,
  recentQuestionIds = [],
  excludeQuestionId = null,
}) {
  const recentSet = new Set((recentQuestionIds || []).map(String));
  if (excludeQuestionId) recentSet.add(String(excludeQuestionId));

  const candidates = questions.filter((q) => !recentSet.has(String(q.id)));
  const pool = candidates.length > 0 ? candidates : questions;
  if (pool.length === 0) return { question: null, reason: 'no_questions' };

  const normalizedTarget = normalizeDifficulty(targetDifficulty);
  const same = pool.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget);
  if (same.length > 0) {
    const randomIndex = Math.floor(Math.random() * same.length);
    return { question: same[randomIndex], reason: 'target_band_reinforcement' };
  }

  const currentIdx = DIFFICULTIES.indexOf(normalizedTarget);
  const nearbyPool = pool.filter((q) => {
    const qIdx = DIFFICULTIES.indexOf(normalizeDifficulty(q.difficulty));
    return Math.abs(qIdx - currentIdx) === 1;
  });
  if (nearbyPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * nearbyPool.length);
    return { question: nearbyPool[randomIndex], reason: 'adjacent_band_fallback' };
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return { question: pool[randomIndex], reason: 'any_available' };
}

export function computeMasteryUpdate({
  prevState,
  isCorrect,
  responseMs,
  hintUsed,
  attemptsOnQuestion,
}) {
  const prevScore = Number(prevState?.mastery_score ?? 0.2);
  const prevConfidence = Number(prevState?.confidence ?? 0.1);
  const prevStreak = Number(prevState?.streak ?? 0);
  const prevAttemptsTotal = Number(prevState?.attempts_total ?? 0);
  const prevCorrectTotal = Number(prevState?.correct_total ?? 0);
  const prevAvgLatency = Number(prevState?.avg_latency_ms ?? 0);
  const prevDifficulty = normalizeDifficulty(prevState?.difficulty_band ?? 'easy');

  let delta = isCorrect ? 0.05 : -0.06;
  if (Number(responseMs) > 0 && Number(responseMs) <= 6000) delta += 0.01;
  if (Number(responseMs) > 12000) delta -= 0.01;
  if (hintUsed) delta -= 0.02;
  if (Number(attemptsOnQuestion ?? 1) > 1) delta -= 0.01;

  const masteryScore = Math.max(0.01, Math.min(0.99, prevScore + delta));
  const confidence = Math.max(0.05, Math.min(0.99, prevConfidence + 0.03));
  const streak = isCorrect ? prevStreak + 1 : 0;
  const attemptsTotal = prevAttemptsTotal + 1;
  const correctTotal = prevCorrectTotal + (isCorrect ? 1 : 0);
  const avgLatencyMs = prevAttemptsTotal > 0
    ? Math.round(((prevAvgLatency * prevAttemptsTotal) + Number(responseMs || 0)) / attemptsTotal)
    : Math.round(Number(responseMs || 0));

  let difficultyBand = prevDifficulty;
  if (streak >= 5 && masteryScore > 0.75) difficultyBand = shiftDifficulty(prevDifficulty, 1);
  if (!isCorrect && masteryScore < 0.35) difficultyBand = shiftDifficulty(prevDifficulty, -1);

  const nextReviewHours = masteryScore >= 0.85 ? 72 : (masteryScore >= 0.6 ? 24 : 8);
  const nextReviewAt = new Date(Date.now() + nextReviewHours * 60 * 60 * 1000).toISOString();
  const status = masteryScore >= 0.85 && confidence >= 0.6 ? 'proficient' : 'learning';

  return {
    prevScore,
    masteryScore,
    confidence,
    streak,
    attemptsTotal,
    correctTotal,
    avgLatencyMs,
    difficultyBand,
    nextReviewAt,
    status,
  };
}

export function computeSessionUpdate({
  prevSession,
  isCorrect,
  currentQuestionId,
  activeDifficulty,
}) {
  const askedCount = Number(prevSession?.asked_count ?? 0) + 1;
  const correctCount = Number(prevSession?.correct_count ?? 0) + (isCorrect ? 1 : 0);
  const currentStreak = isCorrect ? Number(prevSession?.current_streak ?? 0) + 1 : 0;
  const targetCorrectStreak = Number(prevSession?.target_correct_streak ?? 5);
  const priorPhase = String(prevSession?.phase ?? 'warmup');

  let phase = priorPhase;
  if (priorPhase === 'warmup' && askedCount >= 3) phase = 'core';
  if (priorPhase === 'core' && currentStreak >= 3) phase = 'challenge';
  if (priorPhase === 'challenge' && !isCorrect) phase = 'recovery';
  if (priorPhase === 'recovery' && currentStreak >= 2) phase = 'core';
  if (currentStreak >= targetCorrectStreak && activeDifficulty === 'hard') phase = 'done';

  const recentQuestionIds = [
    ...((prevSession?.recent_question_ids || []).map(String)),
    String(currentQuestionId),
  ].slice(-20);

  return {
    phase,
    askedCount,
    correctCount,
    currentStreak,
    targetCorrectStreak,
    activeDifficulty,
    recentQuestionIds,
  };
}
