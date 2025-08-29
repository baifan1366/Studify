create schema if not exists tutoring;

create table if not exists tutoring.tutors (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  headline text,
  subjects text[] not null default '{}',
  hourly_rate numeric(10,2),
  qualifications text,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tutoring.students (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  school text,
  grade text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tutoring.availability (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  tutor_id bigint not null references tutoring.tutors(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  rrule text, -- optional recurrence rule (RFC5545)
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tutoring.appointments (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  tutor_id bigint not null references tutoring.tutors(id) on delete restrict,
  student_id bigint not null references tutoring.students(id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_min int not null check (duration_min > 0),
  status text not null check (status in ('requested','confirmed','completed','cancelled')) default 'requested',
  notes text,
  created_by bigint references profiles(id),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tutoring.file (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references profiles(id) on delete cascade,
  path text not null, -- Supabase storage path
  mime_type text,
  size_bytes bigint,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tutoring.note (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references profiles(id) on delete cascade,
  title text,
  body text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tutoring.share (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  resource_kind text not null check (resource_kind in ('file','note')),
  resource_id bigint not null,
  shared_with bigint references profiles(id),
  access text not null check (access in ('view','edit','comment')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);