import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];
const TABLES = {
  grades: ['grades'],
  subjects: ['subjects'],
  units: ['units'],
  microskills: ['micro_skills', 'microskills'],
};

function parseJsonSafely(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function fetchEntity(supabase, entity) {
  const candidates = TABLES[entity] || [];
  for (const table of candidates) {
    for (const orderColumn of ORDER_COLUMNS) {
      const { data, error } = await supabase.from(table).select('*').order(orderColumn, { ascending: true });
      if (!error) return { table, rows: data || [] };
    }
    const fallback = await supabase.from(table).select('*');
    if (!fallback.error) return { table, rows: fallback.data || [] };
  }
  return { table: null, rows: [] };
}

async function mutateEntity(supabase, entity, action, payload) {
  const candidates = TABLES[entity] || [];
  let lastError = null;

  for (const table of candidates) {
    let query = supabase.from(table);
    if (action === 'insert') query = query.insert(payload).select('*').single();
    if (action === 'update') query = query.update(payload.values).eq('id', payload.id).select('*').single();
    if (action === 'delete') query = query.delete().eq('id', payload.id);

    const { data, error } = await query;
    if (!error) return { table, data: data || null };
    lastError = error;
  }

  throw new Error(lastError?.message || `Failed to ${action} ${entity}`);
}

function validateEntity(entity, body) {
  if (entity === 'grades') {
    return {
      name: String(body.name || '').trim(),
      code: String(body.code || '').trim() || null,
      sort_order: Number(body.sort_order ?? 0),
      idx: Number(body.sort_order ?? 0),
    };
  }
  if (entity === 'subjects') {
    return {
      grade_id: String(body.grade_id || '').trim(),
      name: String(body.name || '').trim(),
      slug: String(body.slug || '').trim() || null,
      sort_order: Number(body.sort_order ?? 0),
      idx: Number(body.sort_order ?? 0),
    };
  }
  if (entity === 'units') {
    return {
      subject_id: String(body.subject_id || '').trim(),
      name: String(body.name || '').trim(),
      sort_order: Number(body.sort_order ?? 0),
      idx: Number(body.sort_order ?? 0),
    };
  }
  if (entity === 'microskills') {
    return {
      unit_id: String(body.unit_id || '').trim(),
      code: String(body.code || '').trim() || null,
      name: String(body.name || '').trim(),
      slug: String(body.slug || '').trim() || null,
      sort_order: Number(body.sort_order ?? 0),
      idx: Number(body.sort_order ?? 0),
    };
  }
  return null;
}

export async function GET(req) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const entity = String(searchParams.get('entity') || '').trim();
  const requested = entity && TABLES[entity] ? [entity] : Object.keys(TABLES);

  const result = {};
  for (const key of requested) {
    const fetched = await fetchEntity(supabase, key);
    result[key] = fetched.rows;
  }

  return NextResponse.json(result);
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

  const entity = String(body?.entity || '').trim();
  if (!TABLES[entity]) return NextResponse.json({ error: 'Invalid entity.' }, { status: 400 });

  try {
    const values = validateEntity(entity, body);
    if (!values) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });

    for (const [k, v] of Object.entries(values)) {
      if (typeof v === 'string' && k !== 'code' && k !== 'slug' && !v && k.endsWith('_id')) {
        return NextResponse.json({ error: `${k} is required.` }, { status: 400 });
      }
      if (typeof v === 'string' && k === 'name' && !v) {
        return NextResponse.json({ error: 'name is required.' }, { status: 400 });
      }
    }

    const created = await mutateEntity(supabase, entity, 'insert', values);
    return NextResponse.json({ row: created.data, table: created.table });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to create.' }, { status: 500 });
  }
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

  const entity = String(body?.entity || '').trim();
  const id = String(body?.id || '').trim();
  if (!TABLES[entity] || !id) return NextResponse.json({ error: 'entity and id are required.' }, { status: 400 });

  const values = parseJsonSafely(body.values, body.values);
  if (!values || typeof values !== 'object') {
    return NextResponse.json({ error: 'values object is required.' }, { status: 400 });
  }

  try {
    const updated = await mutateEntity(supabase, entity, 'update', { id, values });
    return NextResponse.json({ row: updated.data, table: updated.table });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to update.' }, { status: 500 });
  }
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

  const entity = String(body?.entity || '').trim();
  const id = String(body?.id || '').trim();
  if (!TABLES[entity] || !id) return NextResponse.json({ error: 'entity and id are required.' }, { status: 400 });

  try {
    await mutateEntity(supabase, entity, 'delete', { id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to delete.' }, { status: 500 });
  }
}

