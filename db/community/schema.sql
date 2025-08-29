create schema if not exists community;

create table if not exists community.group (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  name text not null,
  description text,
  visibility text check (visibility in ('public','private')) default 'public',
  owner_id bigint not null references core.profiles(id) on delete cascade,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists community.group_member (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  group_id bigint not null references community.group(id) on delete cascade,
  user_id bigint not null references core.profiles(id) on delete cascade,
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
  author_id bigint not null references core.profiles(id) on delete cascade,
  title text,
  body text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search tsvector generated always as (core.to_tsv_en(coalesce(title,'')||' '||coalesce(body,''))) stored
);
create index if not exists idx_post_search on community.post using gin(search);

-- Create triggers for updated_at
create or replace trigger t_upd_group
before update on community.group
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_group_member
before update on community.group_member
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_post
before update on community.post
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_comment
before update on community.comment
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_reaction
before update on community.reaction
for each row execute procedure core.set_updated_at();

create table if not exists community.comment (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  post_id bigint not null references community.post(id) on delete cascade,
  author_id bigint not null references core.profiles(id) on delete cascade,
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
  user_id bigint not null references core.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);