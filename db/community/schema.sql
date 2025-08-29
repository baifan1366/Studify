create schema if not exists community;

create table if not exists community.group (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  name text not null,
  description text,
  visibility text check (visibility in ('public','private')) default 'public',
  owner_id bigint not null references profiles(id) on delete cascade,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists community.group_member (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  group_id bigint not null references community.group(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  role text check (role in ('owner','admin','member')) default 'member',
  joined_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (group_id, user_id)
);

create table if not exists community.post (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  group_id bigint references community.group(id) on delete set null,
  author_id bigint not null references profiles(id) on delete cascade,
  title text,
  body text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists community.comment (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  post_id bigint not null references community.post(id) on delete cascade,
  author_id bigint not null references profiles(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists community.reaction (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  post_id bigint not null references community.post(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create table if not exists community.points_ledger (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  points int not null,
  reason text,
  ref jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists community.achievement (
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

create table if not exists community.user_achievement (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  achievement_id bigint not null references community.achievement(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists community.challenges (
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

create table if not exists community.challenge_results (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  challenge_id bigint not null references community.challenges(id) on delete cascade,
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