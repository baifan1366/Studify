create schema if not exists gamification;

create table if not exists gamification.points_ledger (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  points int not null,
  reason text,
  ref jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists gamification.achievement (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  code text unique not null,
  name text not null,
  description text,
  rule jsonb, -- unlock rule definition
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists gamification.user_achievement (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  achievement_id bigint not null references gamification.achievement(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, achievement_id)
);

-- challenge
create table if not exists gamification.challenges (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  title text not null,
  description text,
  max_score int not null,
  passing_score int not null,
  metadata jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- challenge result
create table if not exists gamification.challenge_results (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references core.profiles(id) on delete cascade,
  challenge_id bigint not null references gamification.challenges(id) on delete cascade,
  score int not null,
  max_score int not null,
  passed boolean not null,
  attempted_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(user_id, challenge_id)
);