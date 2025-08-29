create schema if not exists courses;

create table if not exists courses.course (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  owner_id bigint not null references profiles(id) on delete restrict,
  title text not null,
  description text,
  visibility text not null check (visibility in ('public','private','unlisted')) default 'private',
  price_cents int default 0,
  currency text default 'MYR',
  tags text[] default '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists courses.module (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  title text not null,
  position int not null default 1,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists courses.lesson (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  module_id bigint references courses.module(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('video','live','document','quiz','assignment','whiteboard')),
  content_url text,
  duration_sec int,
  live_session_id bigint null references classroom.live_session(id) on delete set null, 
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists courses.enrollment (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  role text not null check (role in ('student','tutor','owner','assistant')) default 'student',
  status text not null check (status in ('active','completed','dropped','locked')) default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create table if not exists courses.progress (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  user_id bigint not null references profiles(id) on delete cascade,
  lesson_id bigint not null references courses.lesson(id) on delete cascade,
  state text not null check (state in ('not_started','in_progress','completed')) default 'not_started',
  progress_pct numeric(5,2) not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists courses.reviews (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  course_id bigint not null references courses.course(id) on delete cascade,
  user_id bigint not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (course_id, user_id)
);

create table if not exists courses.product (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  kind text not null check (kind in ('course','plugin','resource')),
  ref_id bigint, -- FK to target entity (e.g., courses.course.id)
  title text not null,
  price_cents int not null,
  currency text not null default 'MYR',
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists courses.order (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  buyer_id bigint not null references profiles(id) on delete restrict,
  status text not null check (status in ('pending','paid','failed','refunded')) default 'pending',
  total_cents int not null default 0,
  currency text not null default 'MYR',
  meta jsonb not null default '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists courses.order_item (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  order_id bigint not null references courses.order(id) on delete cascade,
  product_id bigint not null references courses.product(id) on delete restrict,
  quantity int not null default 1,
  unit_price_cents int not null,
  subtotal_cents int not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists courses.payment (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  order_id bigint not null references courses.order(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount_cents int not null,
  status text not null check (status in ('pending','succeeded','failed','refunded')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
