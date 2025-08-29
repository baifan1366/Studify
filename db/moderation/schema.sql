create schema if not exists moderation;

create table if not exists moderation.report (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  reporter_id bigint references core.profiles(id),
  subject_type text not null,
  subject_id text not null,
  reason text,
  status text not null check (status in ('open','reviewing','resolved','rejected')) default 'open',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists moderation.action (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  report_id bigint references moderation.report(id) on delete set null,
  actor_id bigint references core.profiles(id),
  action text not null, -- hide, delete, warn, ban
  notes text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists moderation.ban (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint references core.profiles(id) on delete cascade,
  reason text,
  expires_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);