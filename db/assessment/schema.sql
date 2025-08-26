create schema if not exists assessment;

create table if not exists assessment.question_bank (
  id uuid primary key default uuid_generate_v1(),
  owner_id uuid not null references core.profiles(user_id) on delete cascade,
  title text not null,
  topic_tags text[] default '{}'
);

create table if not exists assessment.question (
  id uuid primary key default uuid_generate_v1(),
  bank_id uuid references assessment.question_bank(id) on delete cascade,
  stem text not null,
  kind text not null check (kind in ('mcq','true_false','short','essay','code')),
  choices jsonb, -- for mcq
  answer jsonb,  -- canonical answer
  difficulty int check (difficulty between 1 and 5)
);
create index if not exists idx_question_bank on assessment.question(bank_id);

create table if not exists assessment.quiz (
  id uuid primary key default uuid_generate_v1(),
  course_id uuid references courses.course(id) on delete set null,
  title text not null,
  settings jsonb not null default '{"shuffle":true,"time_limit":null}'
);

create table if not exists assessment.quiz_question (
  quiz_id uuid not null references assessment.quiz(id) on delete cascade,
  question_id uuid not null references assessment.question(id) on delete restrict,
  points numeric(6,2) not null default 1,
  position int not null default 1,
  primary key (quiz_id, question_id)
);

create table if not exists assessment.attempt (
  id uuid primary key default uuid_generate_v1(),
  quiz_id uuid not null references assessment.quiz(id) on delete cascade,
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  score numeric(8,2) default 0
);
create index if not exists idx_attempt_user on assessment.attempt(user_id, quiz_id);

create table if not exists assessment.answer (
  attempt_id uuid not null references assessment.attempt(id) on delete cascade,
  question_id uuid not null references assessment.question(id) on delete cascade,
  response jsonb,
  is_correct boolean,
  points_awarded numeric(6,2) default 0,
  primary key (attempt_id, question_id)
);

-- Assignments & submissions (for homework)
create table if not exists assessment.assignment (
  id uuid primary key default uuid_generate_v1(),
  course_id uuid not null references courses.course(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz
);

create table if not exists assessment.submission (
  id uuid primary key default uuid_generate_v1(),
  assignment_id uuid not null references assessment.assignment(id) on delete cascade,
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  content_url text,
  text_content text,
  plagiarism_score numeric(5,2)
);
create index if not exists idx_submission_by_user on assessment.submission(user_id, assignment_id);

create table if not exists assessment.grade (
  assignment_id uuid not null references assessment.assignment(id) on delete cascade,
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  grader_id uuid references core.profiles(user_id),
  score numeric(8,2) not null,
  feedback text,
  graded_at timestamptz default now(),
  primary key (assignment_id, user_id)
);