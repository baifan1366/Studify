create schema if not exists classroom;

create table if not exists classroom.live_session (
  id uuid primary key default uuid_generate_v1(),
  course_id uuid references courses.course(id) on delete set null,
  title text,
  host_id uuid not null references core.profiles(user_id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null check (status in ('scheduled','live','ended','cancelled')) default 'scheduled'
);
create index if not exists idx_live_time on classroom.live_session(starts_at);

alter table courses.lesson
  add constraint fk_lesson_live_session
  foreign key (live_session_id) references classroom.live_session(id) on delete set null;

create table if not exists classroom.attendance (
  session_id uuid not null references classroom.live_session(id) on delete cascade,
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  join_at timestamptz,
  leave_at timestamptz,
  attention_score numeric(5,2), -- computed from events
  primary key (session_id, user_id)
);

create table if not exists classroom.chat_message (
  id uuid primary key default uuid_generate_v1(),
  session_id uuid not null references classroom.live_session(id) on delete cascade,
  sender_id uuid not null references core.profiles(user_id) on delete cascade,
  message text not null
);

create table if not exists classroom.whiteboard_session (
  id uuid primary key default uuid_generate_v1(),
  session_id uuid references classroom.live_session(id) on delete cascade,
  title text
);

create table if not exists classroom.whiteboard_event (
  id uuid primary key default uuid_generate_v1(),
  wb_id uuid not null references classroom.whiteboard_session(id) on delete cascade,
  actor_id uuid references core.profiles(user_id),
  kind text not null,
  payload jsonb not null
);

create table if not exists classroom.recording (
  id uuid primary key default uuid_generate_v1(),
  session_id uuid not null references classroom.live_session(id) on delete cascade,
  url text not null,
  duration_sec int
);

create index if not exists idx_live_host_time on classroom.live_session(host_id, starts_at);