create schema if not exists core;

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
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('admin','student','tutor','parent')),
  avatar_url text,
  bio text,
  timezone text default 'Asia/Kuala_Lumpur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_upd_profiles before update on core.profiles
for each row execute procedure core.set_updated_at();
create index if not exists idx_profiles_role on core.profiles(role);

-- Parent ↔ Student linking (household)
create table if not exists core.parent_student (
  parent_id uuid not null references core.profiles(user_id) on delete cascade,
  student_id uuid not null references core.profiles(user_id) on delete cascade,
  relation text default 'parent',
  created_at timestamptz default now(),
  primary key (parent_id, student_id)
);

-- Notifications
create table if not exists core.notifications (
  id uuid primary key default uuid_generate_v1(),
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false
);
create index if not exists idx_notifications_user on core.notifications(user_id, is_read);

-- Audit log
create table if not exists core.audit_log (
  id uuid primary key default uuid_generate_v1(),
  actor_id uuid references core.profiles(user_id),
  action text not null,
  subject_type text,
  subject_id text,
  meta jsonb not null default '{}'
);

-- checkins
create table if not exists core.checkins (
  id uuid primary key default uuid_generate_v1(),
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  checkin_at timestamptz not null default now()
);

alter table core.profiles
  add column if not exists last_login timestamptz,
  add column if not exists status text not null check (status in ('active','banned')) default 'active',
  add column if not exists banned_reason text,
  add column if not exists banned_at timestamptz,
  add column if not exists preferences jsonb not null default '{}',
  add column if not exists points int not null default 0;