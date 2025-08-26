create schema if not exists gamification;

create table if not exists gamification.points_ledger (
  id uuid primary key default uuid_generate_v1(),
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  points int not null,
  reason text,
  ref jsonb
);

create table if not exists gamification.achievement (
  id uuid primary key default uuid_generate_v1(),
  code text unique not null,
  name text not null,
  description text,
  rule jsonb -- unlock rule definition
);

create table if not exists gamification.user_achievement (
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  achievement_id uuid not null references gamification.achievement(id) on delete cascade,
  unlocked_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

-- challenge
create table if not exists gamification.challenges (
  id uuid primary key default uuid_generate_v1(),
  title text not null,
  description text,
  max_score int not null,
  passing_score int not null,
  metadata jsonb
);

-- challenge result
create table if not exists gamification.challenge_results (
  id uuid primary key default uuid_generate_v1(),
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  challenge_id uuid not null references gamification.challenges(id) on delete cascade,
  score int not null,
  max_score int not null,
  passed boolean not null,
  attempted_at timestamptz default now(),
  unique(user_id, challenge_id)
);