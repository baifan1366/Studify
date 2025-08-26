create schema if not exists moderation;

create table if not exists moderation.report (
  id uuid primary key default uuid_generate_v1(),
  reporter_id uuid references core.profiles(user_id),
  subject_type text not null,
  subject_id text not null,
  reason text,
  status text not null check (status in ('open','reviewing','resolved','rejected')) default 'open'
);

create table if not exists moderation.action (
  id uuid primary key default uuid_generate_v1(),
  report_id bigint references moderation.report(id) on delete set null,
  actor_id uuid references core.profiles(user_id),
  action text not null, -- hide, delete, warn, ban
  notes text
);

create table if not exists moderation.ban (
  user_id uuid primary key references core.profiles(user_id) on delete cascade,
  reason text,
  expires_at timestamptz
);