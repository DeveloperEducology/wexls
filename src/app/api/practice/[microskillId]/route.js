import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { mapDbQuestion } from '@/lib/practice/questionMapper';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';

const SKILL_COLUMNS = ['micro_skill_id', 'microskill_id'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value ?? '').trim();
  if (!str) return null;
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
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

function toPublicQuestion(question) {
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

export async function GET(_req, { params }) {
  const { microskillId: microskillKey } = await params;
  const microskillId = await resolveMicroskillIdByKey(microskillKey);

  if (!microskillId) {
    return NextResponse.json(
      { error: 'Microskill not found.' },
      { status: 404 }
    );
  }

  const supabase = createServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured on server.' },
      { status: 500 }
    );
  }

  let data = null;
  let error = null;

  for (const skillColumn of SKILL_COLUMNS) {
    for (const orderColumn of ORDER_COLUMNS) {
      ({ data, error } = await supabase
        .from('questions')
        .select('*')
        .eq(skillColumn, microskillId)
        .order(orderColumn, { ascending: true }));

      if (!error) break;
      if (!error.message?.includes(skillColumn) && !error.message?.includes(orderColumn)) {
        break;
      }
    }
    if (!error) break;
  }

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch questions from Supabase.' },
      { status: 500 }
    );
  }

  const firstQuestion = Array.isArray(data) && data.length > 0 ? toPublicQuestion(mapDbQuestion(data[0])) : null;

  return NextResponse.json({
    source: 'supabase',
    question: firstQuestion,
  });
}
