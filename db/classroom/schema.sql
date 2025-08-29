create schema if not exists classroom;

create table if not exists classroom.live_session (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint references courses.course(id) on delete set null,
  title text,
  host_id bigint not null references core.profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null check (status in ('scheduled','live','ended','cancelled')) default 'scheduled',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_live_time on classroom.live_session(starts_at);

alter table courses.lesson
  add constraint fk_lesson_live_session
  foreign key (live_session_id) references classroom.live_session(id) on delete set null;

create table if not exists classroom.attendance (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  session_id bigint not null references classroom.live_session(id) on delete cascade,
  user_id bigint not null references core.profiles(id) on delete cascade,
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
  sender_id bigint not null references core.profiles(id) on delete cascade,
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
  actor_id bigint references core.profiles(id),
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

create index if not exists idx_live_host_time on classroom.live_session(host_id, starts_at);

-- Create triggers for updated_at
create or replace trigger t_upd_live_session
before update on classroom.live_session
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_attendance
before update on classroom.attendance
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_chat_message
before update on classroom.chat_message
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_whiteboard_session
before update on classroom.whiteboard_session
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_recording
before update on classroom.recording
for each row execute procedure core.set_updated_at();