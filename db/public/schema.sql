create table if not exists profiles (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('admin','student','tutor')),
  avatar_url text,
  bio text,
  timezone text default 'Asia/Kuala_Lumpur',
  status text not null check (status in ('active','banned')) default 'active',
  banned_reason text null,
  banned_at timestamptz,
  points int not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz,
  deleted_at timestamptz
);

create table if not exists notifications (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists audit_log (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  actor_id bigint references profiles(id),
  action text not null,
  subject_type text,
  subject_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists checkins (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  checkin_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists report (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  reporter_id bigint references profiles(id),
  subject_type text not null,
  subject_id text not null,
  reason text,
  status text not null check (status in ('open','reviewing','resolved','rejected')) default 'open',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists action (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  report_id bigint references report(id) on delete set null,
  actor_id bigint references profiles(id),
  action text not null, -- hide, delete, warn, ban
  notes text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists ban (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint references profiles(id) on delete cascade,
  reason text,
  expires_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);