create schema if not exists ai;

create table if not exists ai.agent (
  id uuid primary key default uuid_generate_v1(),
  name text not null,
  owner_id uuid references core.profiles(user_id),
  purpose text,
  config jsonb not null default '{}'
);

create table if not exists ai.run (
  id uuid primary key default uuid_generate_v1(),
  agent_id uuid not null references ai.agent(id) on delete cascade,
  requester_id uuid references core.profiles(user_id),
  input jsonb not null,
  output jsonb,
  status text not null check (status in ('queued','running','succeeded','failed','needs_review')) default 'queued',
  reviewed_by uuid references core.profiles(user_id),
  reviewed_at timestamptz,
  review_note text
);