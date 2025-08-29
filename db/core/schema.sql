create schema if not exists core;

-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp" with schema public;

-- updated_at automations
create or replace function core.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;$$;

-- text search helper (regconfig per lang)
create or replace function core.to_tsv_en(text)
returns tsvector language sql immutable as $$
  select to_tsvector('english', coalesce($1,''));
$$;

-- Profiles extend auth.users
create table if not exists core.profiles (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('admin','student','tutor','parent')),
  avatar_url text,
  bio text,
  timezone text default 'Asia/Kuala_Lumpur',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger t_upd_profiles before update on core.profiles
for each row execute procedure core.set_updated_at();
create index if not exists idx_profiles_role on core.profiles(role);

-- Parent Student linking (household)
create table if not exists core.parent_student (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  parent_id bigint not null references core.profiles(id) on delete cascade,
  student_id bigint not null references core.profiles(id) on delete cascade,
  relation text default 'parent',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (parent_id, student_id)
);

-- Notifications
create table if not exists core.notifications (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_notifications_user on core.notifications(user_id, is_read);

-- Audit log
create table if not exists core.audit_log (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  actor_id bigint references core.profiles(id),
  action text not null,
  subject_type text,
  subject_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- checkins
create table if not exists core.checkins (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  checkin_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table core.profiles
  add column if not exists last_login timestamptz,
  add column if not exists status text not null check (status in ('active','banned')) default 'active',
  add column if not exists banned_reason text,
  add column if not exists banned_at timestamptz,
  add column if not exists preferences jsonb not null default '{}',
  add column if not exists points int not null default 0,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Create triggers for updated_at
create or replace trigger t_upd_profiles
before update on core.profiles
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_notifications
before update on core.notifications
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_parent_student
before update on core.parent_student
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_checkins
before update on core.checkins
for each row execute procedure core.set_updated_at();