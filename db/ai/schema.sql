create schema if not exists ai;

create table if not exists ai.agent (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  name text not null,
  owner_id bigint references core.profiles(id),
  purpose text,
  config jsonb not null default '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists ai.run (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  agent_id bigint not null references ai.agent(id) on delete cascade,
  requester_id bigint references core.profiles(id),
  input jsonb not null,
  output jsonb,
  status text not null check (status in ('queued','running','succeeded','failed','needs_review')) default 'queued',
  reviewed_by bigint references core.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);