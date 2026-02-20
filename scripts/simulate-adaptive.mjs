#!/usr/bin/env node

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function normalizeDifficulty(value) {
  const v = String(value || '').toLowerCase();
  return DIFFICULTIES.includes(v) ? v : 'easy';
}

function shiftDifficulty(current, direction) {
  const idx = DIFFICULTIES.indexOf(normalizeDifficulty(current));
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, idx + direction))];
}

function computeMasteryUpdate({ prev, isCorrect, responseMs }) {
  const prevScore = Number(prev.masteryScore ?? 0.2);
  const prevConfidence = Number(prev.confidence ?? 0.1);
  const prevStreak = Number(prev.streak ?? 0);
  const prevDiff = normalizeDifficulty(prev.difficultyBand ?? 'easy');
  const attemptsTotal = Number(prev.attemptsTotal ?? 0) + 1;
  const correctTotal = Number(prev.correctTotal ?? 0) + (isCorrect ? 1 : 0);
  const prevAvgLatency = Number(prev.avgLatencyMs ?? 0);

  let delta = isCorrect ? 0.05 : -0.06;
  if (responseMs > 0 && responseMs <= 6000) delta += 0.01;
  if (responseMs > 12000) delta -= 0.01;

  const masteryScore = Math.max(0.01, Math.min(0.99, prevScore + delta));
  const confidence = Math.max(0.05, Math.min(0.99, prevConfidence + 0.03));
  const streak = isCorrect ? prevStreak + 1 : 0;
  const avgLatencyMs = prev.attemptsTotal
    ? Math.round(((prevAvgLatency * prev.attemptsTotal) + responseMs) / attemptsTotal)
    : Math.round(responseMs);

  let difficultyBand = prevDiff;
  if (streak >= 5 && masteryScore > 0.75) difficultyBand = shiftDifficulty(prevDiff, 1);
  if (!isCorrect && masteryScore < 0.35) difficultyBand = shiftDifficulty(prevDiff, -1);

  return { masteryScore, confidence, streak, attemptsTotal, correctTotal, difficultyBand, avgLatencyMs };
}

function computeSessionUpdate({ prev, isCorrect, activeDifficulty, misconceptionCode, masteryScore, confidence, avgLatencyMs }) {
  const askedCount = Number(prev.askedCount || 0) + 1;
  const correctCount = Number(prev.correctCount || 0) + (isCorrect ? 1 : 0);
  const currentStreak = isCorrect ? Number(prev.currentStreak || 0) + 1 : 0;
  const targetCorrectStreak = Number(prev.targetCorrectStreak || 5);
  const priorPhase = String(prev.phase || 'warmup');
  const accuracy = askedCount > 0 ? correctCount / askedCount : 0;

  let phase = priorPhase;
  if (priorPhase === 'warmup' && askedCount >= 3) phase = 'core';
  if (priorPhase === 'core' && currentStreak >= 3 && accuracy >= 0.6) phase = 'challenge';
  if (priorPhase === 'challenge' && !isCorrect) phase = 'recovery';
  if (!isCorrect && misconceptionCode) phase = 'recovery';
  if (priorPhase === 'recovery' && currentStreak >= 2) phase = 'core';

  const stableForDone =
    currentStreak >= targetCorrectStreak &&
    accuracy >= 0.8 &&
    masteryScore >= 0.85 &&
    confidence >= 0.65 &&
    avgLatencyMs <= 9000;
  if (stableForDone && activeDifficulty === 'hard') phase = 'done';

  return { phase, askedCount, correctCount, currentStreak, accuracy };
}

function runSimulation(name, attempts) {
  let skill = {
    masteryScore: 0.2,
    confidence: 0.1,
    streak: 0,
    attemptsTotal: 0,
    correctTotal: 0,
    difficultyBand: 'easy',
    avgLatencyMs: 0,
  };
  let session = {
    phase: 'warmup',
    askedCount: 0,
    correctCount: 0,
    currentStreak: 0,
    targetCorrectStreak: 5,
  };

  console.log(`\\n== ${name} ==`);
  attempts.forEach((a, idx) => {
    const mastery = computeMasteryUpdate({
      prev: skill,
      isCorrect: a.isCorrect,
      responseMs: a.responseMs,
    });
    const nextSession = computeSessionUpdate({
      prev: session,
      isCorrect: a.isCorrect,
      activeDifficulty: mastery.difficultyBand,
      misconceptionCode: a.misconceptionCode || null,
      masteryScore: mastery.masteryScore,
      confidence: mastery.confidence,
      avgLatencyMs: mastery.avgLatencyMs,
    });

    skill = { ...skill, ...mastery };
    session = { ...session, ...nextSession };
    console.log(
      `${String(idx + 1).padStart(2, '0')}: ${a.isCorrect ? '✓' : '✗'}  phase=${session.phase} diff=${skill.difficultyBand} mastery=${skill.masteryScore.toFixed(3)} acc=${(session.accuracy * 100).toFixed(0)}%`
    );
  });
}

runSimulation('Recovery Trigger Scenario', [
  { isCorrect: true, responseMs: 3800 },
  { isCorrect: true, responseMs: 3500 },
  { isCorrect: true, responseMs: 3600 },
  { isCorrect: false, responseMs: 4200, misconceptionCode: 'place_value_shift' },
  { isCorrect: true, responseMs: 4300 },
  { isCorrect: true, responseMs: 4100 },
]);

runSimulation('Mastery Exit Scenario', [
  { isCorrect: true, responseMs: 4200 },
  { isCorrect: true, responseMs: 4300 },
  { isCorrect: true, responseMs: 3900 },
  { isCorrect: true, responseMs: 3600 },
  { isCorrect: true, responseMs: 3300 },
  { isCorrect: true, responseMs: 3500 },
  { isCorrect: true, responseMs: 3400 },
  { isCorrect: true, responseMs: 3100 },
  { isCorrect: true, responseMs: 3200 },
  { isCorrect: true, responseMs: 3000 },
  { isCorrect: true, responseMs: 2900 },
  { isCorrect: true, responseMs: 2800 },
]);

