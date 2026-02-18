-- Adaptive learning core tables

create extension if not exists pgcrypto;

create table if not exists public.student_skill_state (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  micro_skill_id uuid not null,
  mastery_score numeric(5,4) not null default 0.2000,
  confidence numeric(5,4) not null default 0.1000,
  difficulty_band text not null default 'easy',
  streak int not null default 0,
  attempts_total int not null default 0,
  correct_total int not null default 0,
  avg_latency_ms int not null default 0,
  last_attempt_at timestamptz,
  next_review_at timestamptz,
  status text not null default 'learning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, micro_skill_id)
);

create index if not exists idx_student_skill_state_student
  on public.student_skill_state(student_id);

create index if not exists idx_student_skill_state_review
  on public.student_skill_state(next_review_at);

create table if not exists public.attempt_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  student_id uuid not null,
  micro_skill_id uuid not null,
  question_id uuid not null references public.questions(id) on delete cascade,
  is_correct boolean not null,
  response_ms int not null,
  attempts_on_question int not null default 1,
  hint_used boolean not null default false,
  answer_payload jsonb,
  correct_payload jsonb,
  selected_difficulty text not null default 'easy',
  concept_tags text[] not null default '{}',
  misconception_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_attempt_events_student_skill_time
  on public.attempt_events(student_id, micro_skill_id, created_at desc);

create index if not exists idx_attempt_events_session
  on public.attempt_events(session_id, created_at);

create table if not exists public.session_state (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  micro_skill_id uuid not null,
  phase text not null default 'warmup',
  target_correct_streak int not null default 5,
  current_streak int not null default 0,
  asked_count int not null default 0,
  correct_count int not null default 0,
  active_difficulty text not null default 'easy',
  last_question_id uuid,
  recent_question_ids uuid[] not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_session_state_student_skill
  on public.session_state(student_id, micro_skill_id, updated_at desc);

create table if not exists public.misconception_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  micro_skill_id uuid not null,
  misconception_code text not null,
  severity int not null default 1,
  source_attempt_id uuid references public.attempt_events(id) on delete set null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_misconception_open
  on public.misconception_events(student_id, micro_skill_id, resolved, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_student_skill_state_updated_at on public.student_skill_state;
create trigger trg_student_skill_state_updated_at
before update on public.student_skill_state
for each row execute function public.set_updated_at();

drop trigger if exists trg_session_state_updated_at on public.session_state;
create trigger trg_session_state_updated_at
before update on public.session_state
for each row execute function public.set_updated_at();
