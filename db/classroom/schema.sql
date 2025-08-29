create schema if not exists classroom;

create table if not exists classroom.live_session (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint references courses.course(id) on delete set null,
  title text,
  host_id bigint not null references profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null check (status in ('scheduled','live','ended','cancelled')) default 'scheduled',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists classroom.attendance (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  session_id bigint not null references classroom.live_session(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  join_at timestamptz,
  leave_at timestamptz,
  attention_score numeric(5,2), -- computed from events
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (session_id, user_id)
);

create table if not exists classroom.chat_message (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  session_id bigint not null references classroom.live_session(id) on delete cascade,
  sender_id bigint not null references profiles(id) on delete cascade,
  message text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists classroom.whiteboard_session (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  session_id bigint references classroom.live_session(id) on delete cascade,
  title text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists classroom.whiteboard_event (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  wb_id bigint not null references classroom.whiteboard_session(id) on delete cascade,
  actor_id bigint references profiles(id),
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists classroom.recording (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  session_id bigint not null references classroom.live_session(id) on delete cascade,
  url text not null,
  duration_sec int,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists classroom.question_bank (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references profiles(id) on delete cascade,
  title text not null,
  topic_tags text[] default '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists classroom.question (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  bank_id bigint references classroom.question_bank(id) on delete cascade,
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

create table if not exists classroom.quiz (
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

create table if not exists classroom.quiz_question (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  quiz_id bigint not null references classroom.quiz(id) on delete cascade,
  question_id bigint not null references classroom.question(id) on delete restrict,
  points numeric(6,2) not null default 1,
  position int not null default 1,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (quiz_id, question_id)
);

create table if not exists classroom.attempt (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  quiz_id bigint not null references classroom.quiz(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(8,2) not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists classroom.answer (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  attempt_id bigint not null references classroom.attempt(id) on delete cascade,
  question_id bigint not null references classroom.question(id) on delete cascade,
  response jsonb,
  is_correct boolean,
  points_awarded numeric(6,2) not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (attempt_id, question_id)
);

create table if not exists classroom.assignment (
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

create table if not exists classroom.submission (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  assignment_id bigint not null references classroom.assignment(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  content_url text,
  text_content text,
  plagiarism_score numeric(5,2),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists classroom.grade (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  assignment_id bigint not null references classroom.assignment(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  grader_id bigint references profiles(id),
  score numeric(8,2) not null,
  feedback text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (assignment_id, user_id)
);