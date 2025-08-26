create schema if not exists community;

create table if not exists community.group (
  id uuid primary key default uuid_generate_v1(),
  name text not null,
  description text,
  visibility text check (visibility in ('public','private')) default 'public',
  owner_id uuid not null references core.profiles(user_id) on delete cascade
);

create table if not exists community.group_member (
  group_id uuid not null references community.group(id) on delete cascade,
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  role text check (role in ('owner','admin','member')) default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists community.post (
  id uuid primary key default uuid_generate_v1(),
  group_id uuid references community.group(id) on delete set null,
  author_id uuid not null references core.profiles(user_id) on delete cascade,
  title text,
  body text,
  search tsvector generated always as (core.to_tsv_en(coalesce(title,'')||' '||coalesce(body,''))) stored,
  updated_at timestamptz default now()
);
create index if not exists idx_post_search on community.post using gin(search);
create trigger t_upd_post before update on community.post for each row execute procedure core.set_updated_at();

create table if not exists community.comment (
  id uuid primary key default uuid_generate_v1(),
  post_id uuid not null references community.post(id) on delete cascade,
  author_id uuid not null references core.profiles(user_id) on delete cascade,
  body text not null
);

create table if not exists community.reaction (
  post_id uuid not null references community.post(id) on delete cascade,
  user_id uuid not null references core.profiles(user_id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id, emoji)
);