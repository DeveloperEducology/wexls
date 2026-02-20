import { mapDbQuestion } from '@/lib/practice/questionMapper';

const SKILL_COLUMNS = ['micro_skill_id', 'microskill_id'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const REMEDIATION_SEQUENCE_LENGTH = 2;
const DEFAULT_POLICY_VERSION = process.env.ADAPTIVE_POLICY_VERSION || 'misconception_v2';

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

function normalizeAnswerArray(answer) {
  if (Array.isArray(answer)) return answer.map((v) => String(v));
  if (answer == null) return [];
  return [String(answer)];
}

function getQuestionMisconceptionCodes(question) {
  const config = question?.adaptiveConfig ?? {};
  const fromSingle = String(config.misconceptionCode ?? '').trim();
  const fromArray = Array.isArray(config.misconceptionCodes)
    ? config.misconceptionCodes.map((v) => String(v || '').trim())
    : [];
  const fromTags = Array.isArray(config.misconceptionTags)
    ? config.misconceptionTags.map((v) => String(v || '').trim())
    : [];

  return [fromSingle, ...fromArray, ...fromTags].filter(Boolean);
}

function getQuestionRemediationCodes(question) {
  const config = question?.adaptiveConfig ?? {};
  const misconceptionCodes = getQuestionMisconceptionCodes(question);
  const fromFor = Array.isArray(config.remediationFor)
    ? config.remediationFor.map((v) => String(v || '').trim())
    : [];
  return [...misconceptionCodes, ...fromFor].filter(Boolean);
}

export function getAdaptivePolicyVersion() {
  return DEFAULT_POLICY_VERSION;
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
  throw new Error(error.message);
}

export async function upsertStudentSkillState(supabase, payload) {
  const run = async (row) => supabase
    .from('student_skill_state')
    .upsert(row, { onConflict: 'student_id,micro_skill_id' })
    .select('*')
    .single();

  let result = await run(payload);
  if (!result.error) return result.data;

  const message = String(result.error?.message || '').toLowerCase();
  const needsLegacyFallback = (
    message.includes('next_review_at') ||
    message.includes('avg_latency_ms') ||
    message.includes('difficulty_band') ||
    message.includes('confidence')
  );
  if (!needsLegacyFallback) throw new Error(result.error.message);

  const legacyPayload = {
    student_id: payload.student_id,
    micro_skill_id: payload.micro_skill_id,
    mastery_score: payload.mastery_score,
    confidence: payload.confidence ?? 0.1,
    difficulty_band: payload.difficulty_band ?? 'easy',
    streak: payload.streak ?? 0,
    attempts_total: payload.attempts_total ?? 0,
    correct_total: payload.correct_total ?? 0,
    updated_at: payload.updated_at,
  };
  result = await run(legacyPayload);
  if (!result.error) return result.data;
  throw new Error(result.error.message);
}

export async function getSessionState(supabase, sessionId) {
  const { data, error } = await supabase
    .from('session_state')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (!error) return data;
  throw new Error(error.message);
}

export async function upsertSessionState(supabase, payload) {
  const run = async (row) => supabase
    .from('session_state')
    .upsert(row)
    .select('*')
    .single();

  let result = await run(payload);
  if (!result.error) return result.data;

  const message = String(result.error?.message || '').toLowerCase();
  const needsLegacyFallback = (
    message.includes('remediation_recent_question_ids') ||
    message.includes('active_misconception_code') ||
    message.includes('remediation_remaining') ||
    message.includes('completed_at')
  );
  if (!needsLegacyFallback) throw new Error(result.error.message);

  const legacyPayload = {
    id: payload.id,
    student_id: payload.student_id,
    micro_skill_id: payload.micro_skill_id,
    phase: payload.phase,
    target_correct_streak: payload.target_correct_streak,
    current_streak: payload.current_streak,
    asked_count: payload.asked_count,
    correct_count: payload.correct_count,
    active_difficulty: payload.active_difficulty,
    last_question_id: payload.last_question_id ?? null,
    recent_question_ids: payload.recent_question_ids ?? [],
    updated_at: payload.updated_at,
  };
  result = await run(legacyPayload);
  if (!result.error) return result.data;
  throw new Error(result.error.message);
}

export async function insertAttemptEvent(supabase, payload) {
  const { error } = await supabase.from('attempt_events').insert(payload);
  if (!error) return;
  throw new Error(error.message);
}

export async function insertMisconceptionEvent(supabase, payload) {
  const { error } = await supabase.from('misconception_events').insert(payload);
  if (!error) return;

  // Backward compatibility: older DBs may not yet have these adaptive-v2 columns.
  const message = String(error?.message || '').toLowerCase();
  const needsLegacyFallback = (
    message.includes('session_id') ||
    message.includes('question_id') ||
    message.includes('answer_payload') ||
    message.includes('created_at')
  );

  if (!needsLegacyFallback) {
    throw new Error(error.message);
  }

  // Minimal compatible payload for the earliest schema version.
  const legacyPayload = {
    student_id: payload.student_id,
    micro_skill_id: payload.micro_skill_id,
    misconception_code: payload.misconception_code,
    resolved: false,
  };

  const fallbackResult = await supabase.from('misconception_events').insert(legacyPayload);
  if (!fallbackResult.error) return;
  throw new Error(fallbackResult.error.message);
}

export async function getRecoveryContextFromAttempts(supabase, { sessionId }) {
  const { data, error } = await supabase
    .from('attempt_events')
    .select('is_correct,misconception_code,question_id,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      inRecovery: false,
      misconceptionCode: null,
      remediationRemaining: 0,
      anchorQuestionId: null,
    };
  }

  const anchorIndex = data.findIndex((row) => (
    row?.is_correct === false && String(row?.misconception_code ?? '').trim()
  ));

  if (anchorIndex < 0) {
    return {
      inRecovery: false,
      misconceptionCode: null,
      remediationRemaining: 0,
      anchorQuestionId: null,
    };
  }

  const attemptsSinceAnchor = anchorIndex;
  const remediationRemaining = Math.max(0, REMEDIATION_SEQUENCE_LENGTH - attemptsSinceAnchor);
  const anchor = data[anchorIndex];
  return {
    inRecovery: remediationRemaining > 0,
    misconceptionCode: String(anchor?.misconception_code ?? '').trim() || null,
    remediationRemaining,
    anchorQuestionId: anchor?.question_id ? String(anchor.question_id) : null,
  };
}

export function detectMisconceptionCode({ question, answer, isCorrect }) {
  if (!question || isCorrect) return null;
  const config = question.adaptiveConfig ?? {};

  if (question.type === 'mcq' || question.type === 'imageChoice') {
    const optionMap = config.misconceptionByOption || config.misconception_map || {};
    if (question.isMultiSelect) {
      const selected = normalizeAnswerArray(answer).map(Number).filter(Number.isFinite);
      for (const idx of selected) {
        const mapped = optionMap?.[idx] ?? optionMap?.[String(idx)];
        if (mapped) return String(mapped);
        const option = question.options?.[idx];
        const optionCode = option && typeof option === 'object'
          ? option.misconceptionCode || option.misconception_code
          : null;
        if (optionCode) return String(optionCode);
      }
      return config.misconceptionCode ? String(config.misconceptionCode) : 'mcq_multi_select_error';
    }

    const selectedIdx = Number(answer);
    if (Number.isFinite(selectedIdx)) {
      const mapped = optionMap?.[selectedIdx] ?? optionMap?.[String(selectedIdx)];
      if (mapped) return String(mapped);
      const option = question.options?.[selectedIdx];
      const optionCode = option && typeof option === 'object'
        ? option.misconceptionCode || option.misconception_code
        : null;
      if (optionCode) return String(optionCode);
      return `option_${selectedIdx}_misconception`;
    }
    return config.misconceptionCode ? String(config.misconceptionCode) : 'mcq_unanswered';
  }

  if (question.type === 'fillInTheBlank' || question.type === 'textInput' || question.type === 'measure') {
    const expectedRaw = question.correctAnswerText;
    const expectedNumeric = parseNumber(expectedRaw);
    const actualNumeric = parseNumber(
      typeof answer === 'object' && answer !== null
        ? Object.values(answer).join('')
        : answer
    );

    if (expectedNumeric != null && actualNumeric != null) {
      const diff = actualNumeric - expectedNumeric;
      if (Math.abs(diff) === 1) return 'off_by_one';
      if (Math.abs(diff) === 10) return 'place_value_shift';
      if (diff > 0) return 'overestimate';
      if (diff < 0) return 'underestimate';
    }
  }

  if (config.misconceptionCode) return String(config.misconceptionCode);
  return `incorrect_${String(question?.type || 'unknown').toLowerCase()}`;
}

export function chooseNextQuestion({
  questions,
  targetDifficulty,
  recentQuestionIds = [],
  remediationRecentQuestionIds = [],
  excludeQuestionId = null,
  remediation = null,
}) {
  const recentSet = new Set((recentQuestionIds || []).map(String));
  const remediationRecentSet = new Set((remediationRecentQuestionIds || []).map(String));
  if (excludeQuestionId) recentSet.add(String(excludeQuestionId));

  const candidates = questions.filter((q) => !recentSet.has(String(q.id)));
  // Full-cycle behavior: only repeat after all questions are used.
  // If cycle is exhausted, start a new cycle but still avoid immediate same-question replay.
  const pool = candidates.length > 0
    ? candidates
    : questions.filter((q) => String(q.id) !== String(excludeQuestionId || ''));
  const normalizedTarget = normalizeDifficulty(targetDifficulty);
  const sameDifficultyCountInPool = pool.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget).length;
  const debug = {
    totalQuestions: questions.length,
    unseenQuestions: candidates.length,
    poolQuestions: pool.length,
    sameDifficultyInPool: sameDifficultyCountInPool,
    targetDifficulty: normalizedTarget,
    recentCount: recentSet.size,
  };

  if (pool.length === 0) return { question: null, reason: 'no_questions', debug };

  const remediationCode = String(remediation?.misconceptionCode ?? '').trim();
  const remediationEnabled = Boolean(remediationCode) && Number(remediation?.remaining ?? 0) > 0;
  if (remediationEnabled) {
    const remediationPool = pool.filter((q) => {
      const codes = getQuestionRemediationCodes(q);
      const hasMatchingCode = codes.some((code) => String(code).toLowerCase() === remediationCode.toLowerCase());
      const notRecentlyUsedForRemediation = !remediationRecentSet.has(String(q.id));
      return hasMatchingCode && notRecentlyUsedForRemediation;
    });

    if (remediationPool.length > 0) {
      const byDifficulty = remediationPool.filter((q) => normalizeDifficulty(q.difficulty) === normalizeDifficulty(targetDifficulty));
      const preferred = byDifficulty.length > 0 ? byDifficulty : remediationPool;
      const randomIndex = Math.floor(Math.random() * preferred.length);
      return {
        question: preferred[randomIndex],
        reason: 'misconception_remediation',
        debug,
      };
    }
  }

  const same = pool.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget);
  if (same.length > 0) {
    const randomIndex = Math.floor(Math.random() * same.length);
    return { question: same[randomIndex], reason: 'target_band_reinforcement', debug };
  }

  const currentIdx = DIFFICULTIES.indexOf(normalizedTarget);
  const nearbyPool = pool.filter((q) => {
    const qIdx = DIFFICULTIES.indexOf(normalizeDifficulty(q.difficulty));
    return Math.abs(qIdx - currentIdx) === 1;
  });
  if (nearbyPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * nearbyPool.length);
    return { question: nearbyPool[randomIndex], reason: 'adjacent_band_fallback', debug };
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return { question: pool[randomIndex], reason: 'any_available', debug };
}

export function appendCycleRecentQuestionIds({
  prevRecentQuestionIds = [],
  newQuestionId = null,
  availableQuestionIds = [],
}) {
  const available = Array.from(new Set((availableQuestionIds || []).map(String)));
  const availableSet = new Set(available);
  if (available.length === 0) return [];

  const seen = [];
  const seenSet = new Set();
  for (const id of (prevRecentQuestionIds || []).map(String)) {
    if (!availableSet.has(id)) continue;
    if (seenSet.has(id)) continue;
    seenSet.add(id);
    seen.push(id);
  }

  if (newQuestionId && availableSet.has(String(newQuestionId)) && !seenSet.has(String(newQuestionId))) {
    seen.push(String(newQuestionId));
    seenSet.add(String(newQuestionId));
  }

  // If cycle is complete, reset to start a fresh cycle on next selection.
  if (seenSet.size >= availableSet.size) {
    return [];
  }

  return seen;
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
  misconceptionCode = null,
  masteryScore = null,
  confidence = null,
  avgLatencyMs = null,
}) {
  const askedCount = Number(prevSession?.asked_count ?? 0) + 1;
  const correctCount = Number(prevSession?.correct_count ?? 0) + (isCorrect ? 1 : 0);
  const currentStreak = isCorrect ? Number(prevSession?.current_streak ?? 0) + 1 : 0;
  const targetCorrectStreak = Number(prevSession?.target_correct_streak ?? 5);
  const priorPhase = String(prevSession?.phase ?? 'warmup');
  const accuracy = askedCount > 0 ? correctCount / askedCount : 0;
  const safeMastery = Number(masteryScore ?? 0);
  const safeConfidence = Number(confidence ?? 0);
  const safeLatency = Number(avgLatencyMs ?? 0);

  let phase = priorPhase;
  if (priorPhase === 'warmup' && askedCount >= 3) phase = 'core';
  if (priorPhase === 'core' && currentStreak >= 3 && accuracy >= 0.6) phase = 'challenge';
  if (priorPhase === 'challenge' && !isCorrect) phase = 'recovery';
  if (!isCorrect && misconceptionCode) phase = 'recovery';
  if (priorPhase === 'recovery' && currentStreak >= 2) phase = 'core';
  const stableForDone =
    currentStreak >= targetCorrectStreak &&
    accuracy >= 0.8 &&
    safeMastery >= 0.85 &&
    safeConfidence >= 0.65 &&
    (safeLatency <= 9000 || safeLatency === 0);
  if (stableForDone && activeDifficulty === 'hard') phase = 'done';

  const recentQuestionIds = [
    ...((prevSession?.recent_question_ids || []).map(String)),
    String(currentQuestionId),
  ];

  return {
    phase,
    askedCount,
    correctCount,
    currentStreak,
    targetCorrectStreak,
    activeDifficulty,
    recentQuestionIds,
    accuracy,
  };
}

export function computeServerSmartScoreDelta({
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
