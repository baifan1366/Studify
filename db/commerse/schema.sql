create schema if not exists commerce;

create table if not exists commerce.product (
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

create table if not exists commerce.order (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  buyer_id bigint not null references core.profiles(id) on delete restrict,
  status text not null check (status in ('pending','paid','failed','refunded')) default 'pending',
  total_cents int not null default 0,
  currency text not null default 'MYR',
  meta jsonb not null default '{}',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists commerce.order_item (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  order_id bigint not null references commerce.order(id) on delete cascade,
  product_id bigint not null references commerce.product(id) on delete restrict,
  quantity int not null default 1,
  unit_price_cents int not null,
  subtotal_cents int not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_order_items_order on commerce.order_item(order_id);

-- Create triggers for updated_at
create or replace trigger t_upd_product
before update on commerce.product
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_order
before update on commerce.order
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_order_item
before update on commerce.order_item
for each row execute procedure core.set_updated_at();

create or replace trigger t_upd_payment
before update on commerce.payment
for each row execute procedure core.set_updated_at();

-- Payments (abstract, integrate with Stripe/ToyyibPay etc.)
create table if not exists commerce.payment (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4() unique,
  order_id bigint not null references commerce.order(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount_cents int not null,
  status text not null check (status in ('pending','succeeded','failed','refunded')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);