create schema if not exists assessment;

create table if not exists assessment.question_bank (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references core.profiles(id) on delete cascade,
  title text not null,
  topic_tags text[] default '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists assessment.question (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  bank_id bigint references assessment.question_bank(id) on delete cascade,
  stem text not null,
  kind text not null check (kind in ('mcq','true_false','short','essay','code')),
  choices jsonb, -- for mcq
  answer jsonb,  -- canonical answer
  difficulty int check (difficulty between 1 and 5),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_question_bank on assessment.question(bank_id);

-- Create triggers for updated_at
create or replace trigger t_upd_question_bank
before update on assessment.question_bank
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_question
before update on assessment.question
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_quiz
before update on assessment.quiz
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_quiz_question
before update on assessment.quiz_question
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_attempt
before update on assessment.attempt
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_answer
before update on assessment.answer
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_assignment
before update on assessment.assignment
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_submission
before update on assessment.submission
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_grade
before update on assessment.grade
for each row execute procedure core.set_updated_at();

create table if not exists assessment.quiz (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint references courses.course(id) on delete set null,
  title text not null,
  settings jsonb not null default '{"shuffle":true,"time_limit":null}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists assessment.quiz_question (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  quiz_id bigint not null references assessment.quiz(id) on delete cascade,
  question_id bigint not null references assessment.question(id) on delete restrict,
  points numeric(6,2) not null default 1,
  position int not null default 1,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (quiz_id, question_id)
);

create table if not exists assessment.attempt (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  quiz_id bigint not null references assessment.quiz(id) on delete cascade,
  user_id bigint not null references core.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(8,2) not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_attempt_user on assessment.attempt(user_id, quiz_id);

create table if not exists assessment.answer (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  attempt_id bigint not null references assessment.attempt(id) on delete cascade,
  question_id bigint not null references assessment.question(id) on delete cascade,
  response jsonb,
  is_correct boolean,
  points_awarded numeric(6,2) not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (attempt_id, question_id)
);

-- Assignments & submissions (for homework)
create table if not exists assessment.assignment (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists assessment.submission (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  assignment_id bigint not null references assessment.assignment(id) on delete cascade,
  user_id bigint not null references core.profiles(id) on delete cascade,
  content_url text,
  text_content text,
  plagiarism_score numeric(5,2),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_submission_by_user on assessment.submission(user_id, assignment_id);

create table if not exists assessment.grade (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  assignment_id bigint not null references assessment.assignment(id) on delete cascade,
  user_id bigint not null references core.profiles(id) on delete cascade,
  grader_id bigint references core.profiles(id),
  score numeric(8,2) not null,
  feedback text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (assignment_id, user_id)
);