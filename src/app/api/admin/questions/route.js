import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const SKILL_COLUMNS = ['micro_skill_id', 'microskill_id'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];

function parseMaybeJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toNumber(value, fallback = null) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const n = value.toLowerCase().trim();
    if (['true', '1', 'yes'].includes(n)) return true;
    if (['false', '0', 'no'].includes(n)) return false;
  }
  return fallback;
}

async function findSkillColumnForMicroskill(supabase, microskillId) {
  for (const col of SKILL_COLUMNS) {
    const { error } = await supabase.from('questions').select('id').eq(col, microskillId).limit(1);
    if (!error) return col;
  }
  return SKILL_COLUMNS[0];
}

function normalizeQuestionBody(body) {
  return {
    type: String(body.type || 'mcq').trim(),
    parts: parseMaybeJson(body.parts, []),
    options: parseMaybeJson(body.options, []),
    items: parseMaybeJson(body.items, []),
    drag_items: parseMaybeJson(body.drag_items ?? body.dragItems, []),
    drop_groups: parseMaybeJson(body.drop_groups ?? body.dropGroups, []),
    correct_answer_index: toNumber(body.correct_answer_index, -1),
    correct_answer_indices: parseMaybeJson(body.correct_answer_indices, []),
    correct_answer_text: body.correct_answer_text != null ? String(body.correct_answer_text) : null,
    solution: String(body.solution || ''),
    difficulty: String(body.difficulty || 'easy').toLowerCase(),
    marks: toNumber(body.marks, 1),
    complexity: toNumber(body.complexity, 0),
    adaptive_config: parseMaybeJson(body.adaptive_config ?? body.adaptiveConfig, null),
    is_multi_select: toBoolean(body.is_multi_select ?? body.isMultiSelect, false),
    is_vertical: toBoolean(body.is_vertical ?? body.isVertical, false),
    show_submit_button: toBoolean(body.show_submit_button ?? body.showSubmitButton, true),
    sort_order: toNumber(body.sort_order ?? body.idx, 0),
    idx: toNumber(body.sort_order ?? body.idx, 0),
  };
}

export async function GET(req) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const microskillId = String(searchParams.get('microSkillId') || searchParams.get('microskillId') || '').trim();
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 80)));

  if (!microskillId) {
    return NextResponse.json({ error: 'microSkillId is required.' }, { status: 400 });
  }

  for (const skillColumn of SKILL_COLUMNS) {
    for (const orderColumn of ORDER_COLUMNS) {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq(skillColumn, microskillId)
        .order(orderColumn, { ascending: true })
        .limit(limit);
      if (!error) return NextResponse.json({ rows: data || [], skillColumn });
    }
  }

  return NextResponse.json({ error: 'Could not fetch questions.' }, { status: 500 });
}

export async function POST(req) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const microskillId = String((body?.micro_skill_id ?? body?.microskill_id ?? body?.microSkillId) || '').trim();
  if (!microskillId) {
    return NextResponse.json({ error: 'microSkillId is required.' }, { status: 400 });
  }

  const skillColumn = await findSkillColumnForMicroskill(supabase, microskillId);
  const payload = normalizeQuestionBody(body);
  payload[skillColumn] = microskillId;

  const { data, error } = await supabase.from('questions').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.message || 'Failed to create question.' }, { status: 500 });
  return NextResponse.json({ row: data, skillColumn });
}

export async function PATCH(req) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const values = parseMaybeJson(body.values, body.values);
  const payload = normalizeQuestionBody(values || {});

  const { data, error } = await supabase.from('questions').update(payload).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message || 'Failed to update question.' }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function DELETE(req) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message || 'Failed to delete question.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
