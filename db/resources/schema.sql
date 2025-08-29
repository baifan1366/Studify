create schema if not exists resources;

create table if not exists resources.file (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references core.profiles(id) on delete cascade,
  path text not null, -- Supabase storage path
  mime_type text,
  size_bytes bigint,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists resources.note (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references core.profiles(id) on delete cascade,
  title text,
  body text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create or replace trigger t_upd_note
before update on resources.note
for each row execute procedure core.set_updated_at();

-- Create triggers for updated_at
create or replace trigger t_upd_file
before update on resources.file
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_share
before update on resources.share
for each row execute procedure core.set_updated_at();

create table if not exists resources.share (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  resource_kind text not null check (resource_kind in ('file','note')),
  resource_id bigint not null,
  shared_with bigint references core.profiles(id),
  access text not null check (access in ('view','edit','comment')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);