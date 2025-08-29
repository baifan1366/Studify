create schema if not exists courses;

create table if not exists courses.course (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references core.profiles(id) on delete restrict,
  title text not null,
  description text,
  visibility text not null check (visibility in ('public','private','unlisted')) default 'private',
  price_cents int default 0,
  currency text default 'MYR',
  tags text[] default '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search tsvector generated always as (
    core.to_tsv_en(coalesce(title,'') || ' ' || coalesce(description,''))
  ) stored
);
create index if not exists idx_course_search on courses.course using gin(search);
create trigger t_upd_course before update on courses.course
for each row execute procedure core.set_updated_at();

create table if not exists courses.module (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  title text not null,
  position int not null default 1,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_module_course_pos on courses.module(course_id, position);
create trigger t_upd_module before update on courses.module
for each row execute procedure core.set_updated_at();

create table if not exists courses.lesson (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  module_id bigint references courses.module(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('video','live','document','quiz','assignment','whiteboard')),
  content_url text, -- for video/document
  duration_sec int,
  live_session_id bigint, -- FK to classroom.live_session (defined later)
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_lesson_course on courses.lesson(course_id);
create trigger t_upd_lesson before update on courses.lesson
for each row execute procedure core.set_updated_at();

-- Enrollment & progress
create table if not exists courses.enrollment (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  user_id bigint not null references core.profiles(id) on delete cascade,
  role text not null check (role in ('student','tutor','owner','assistant')) default 'student',
  status text not null check (status in ('active','completed','dropped','locked')) default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);
create index if not exists idx_enroll_user on courses.enrollment(user_id);

create table if not exists courses.progress (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  lesson_id bigint not null references courses.lesson(id) on delete cascade,
  state text not null check (state in ('not_started','in_progress','completed')) default 'not_started',
  progress_pct numeric(5,2) not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- Ratings / reviews
create table if not exists courses.reviews (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  user_id bigint not null references core.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (course_id, user_id)
);

create index if not exists idx_reviews_course on courses.reviews(course_id);
create index if not exists idx_enrollment_course on courses.enrollment(course_id);
create index if not exists idx_progress_user on courses.progress(user_id);