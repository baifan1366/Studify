create schema if not exists analytics;

create table if not exists analytics.event (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint references core.profiles(id),
  session_id text,
  context jsonb not null default '{}',
  name text not null,
  ts timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_event_name_time on analytics.event(name, ts);
create index if not exists idx_event_user_time on analytics.event(user_id, ts);

-- Create trigger for updated_at
create or replace trigger t_upd_analytics_event
before update on analytics.event
for each row execute procedure core.set_updated_at();