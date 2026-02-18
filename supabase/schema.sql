-- Minimal schema for adaptive practice in Supabase

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  microskill_id uuid not null,
  type text not null,
  parts jsonb not null default '[]'::jsonb,
  options jsonb,
  items jsonb,
  drag_items jsonb,
  drop_groups jsonb,
  correct_answer_index int,
  correct_answer_indices jsonb,
  correct_answer_text text,
  solution text,
  difficulty text,
  is_multi_select boolean not null default false,
  is_vertical boolean not null default false,
  show_submit_button boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.student_question_log (
  id bigserial primary key,
  student_id text,
  microskill_id uuid not null,
  question_id uuid not null references public.questions(id) on delete cascade,
  is_correct boolean not null,
  answer_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_microskill_difficulty
  on public.questions(microskill_id, difficulty);

create index if not exists idx_questions_microskill_sort
  on public.questions(microskill_id, sort_order);

create index if not exists idx_student_question_log_student
  on public.student_question_log(student_id);

create or replace function public.submit_and_get_next(
  p_student_id text,
  p_microskill_id uuid,
  p_question_id uuid,
  p_is_correct boolean,
  p_answer_payload jsonb default null
)
returns setof public.questions
language plpgsql
security definer
as $$
declare
  current_sort int := 0;
begin
  select q.sort_order into current_sort
  from public.questions q
  where q.id = p_question_id;

  if current_sort is null then
    current_sort := 0;
  end if;

  return query
  select q.*
  from public.questions q
  where q.microskill_id = p_microskill_id
    and q.sort_order > current_sort
  order by q.sort_order asc
  limit 1;
end;
$$;
