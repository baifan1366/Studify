create schema if not exists resources;

create table if not exists resources.file (
  id uuid primary key default uuid_generate_v1(),
  owner_id uuid not null references core.profiles(user_id) on delete cascade,
  path text not null, -- Supabase storage path
  mime_type text,
  size_bytes bigint
);

create table if not exists resources.note (
  id uuid primary key default uuid_generate_v1(),
  owner_id uuid not null references core.profiles(user_id) on delete cascade,
  title text,
  body text,
  updated_at timestamptz default now()
);
create trigger t_upd_note before update on resources.note for each row execute procedure core.set_updated_at();

create table if not exists resources.share (
  id uuid primary key default uuid_generate_v1(),
  resource_kind text not null check (resource_kind in ('file','note')),
  resource_id uuid not null,
  shared_with uuid references core.profiles(user_id),
  access text not null check (access in ('view','edit','comment'))
);