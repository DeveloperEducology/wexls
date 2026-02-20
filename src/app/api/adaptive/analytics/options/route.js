import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const MICROSKILL_TABLES = ['micro_skills', 'microskills'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];

async function fetchMicroskills(supabase) {
  for (const table of MICROSKILL_TABLES) {
    for (const orderColumn of ORDER_COLUMNS) {
      const { data, error } = await supabase
        .from(table)
        .select('id,code,name,slug')
        .order(orderColumn, { ascending: true })
        .limit(500);
      if (!error) return data || [];
    }
    const fallback = await supabase.from(table).select('id,code,name,slug').limit(500);
    if (!fallback.error) return fallback.data || [];
  }
  return [];
}

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured on server.' }, { status: 500 });
  }

  const [{ data: attempts, error: attemptsError }, microskills] = await Promise.all([
    supabase
      .from('attempt_events')
      .select('student_id,micro_skill_id,created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    fetchMicroskills(supabase),
  ]);

  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message || 'Failed to load options.' }, { status: 500 });
  }

  const studentMap = new Map();
  const skillUseMap = new Map();
  for (const row of attempts || []) {
    const studentId = String(row.student_id || '').trim();
    const microSkillId = String(row.micro_skill_id || '').trim();
    if (studentId && !studentMap.has(studentId)) {
      studentMap.set(studentId, { id: studentId });
    }
    if (microSkillId) {
      skillUseMap.set(microSkillId, (skillUseMap.get(microSkillId) || 0) + 1);
    }
  }

  const microskillOptions = microskills.map((skill) => ({
    id: String(skill.id),
    code: skill.code || '',
    name: skill.name || '',
    slug: skill.slug || '',
    usageCount: skillUseMap.get(String(skill.id)) || 0,
  }));

  return NextResponse.json({
    studentOptions: Array.from(studentMap.values()),
    microSkillOptions: microskillOptions,
  });
}

