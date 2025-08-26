create schema if not exists analytics;

create table if not exists analytics.event (
  id uuid primary key default uuid_generate_v1(),
  user_id uuid references core.profiles(user_id),
  session_id uuid,
  context jsonb not null default '{}',
  name text not null,
  ts timestamptz not null default now()
);
create index if not exists idx_event_name_time on analytics.event(name, ts);
create index if not exists idx_event_user_time on analytics.event(user_id, ts);