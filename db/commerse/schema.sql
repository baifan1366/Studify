create schema if not exists commerce;

create table if not exists commerce.product (
  id uuid primary key default uuid_generate_v1(),
  kind text not null check (kind in ('course','plugin','resource')),
  ref_id uuid, -- FK to target entity (e.g., courses.course.id)
  title text not null,
  price_cents int not null,
  currency text not null default 'MYR',
  is_active boolean not null default true
);

create table if not exists commerce.order (
  id uuid primary key default uuid_generate_v1(),
  buyer_id uuid not null references core.profiles(user_id) on delete restrict,
  status text not null check (status in ('pending','paid','failed','refunded')) default 'pending',
  total_cents int not null default 0,
  currency text not null default 'MYR',
  meta jsonb default '{}'
);

create table if not exists commerce.order_item (
  id uuid primary key default uuid_generate_v1(),
  order_id uuid not null references commerce.order(id) on delete cascade,
  product_id uuid not null references commerce.product(id) on delete restrict,
  quantity int not null default 1,
  unit_price_cents int not null,
  subtotal_cents int not null
);
create index if not exists idx_order_items_order on commerce.order_item(order_id);

-- Payments (abstract, integrate with Stripe/ToyyibPay etc.)
create table if not exists commerce.payment (
  id uuid primary key default uuid_generate_v1(),
  order_id uuid not null references commerce.order(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount_cents int not null,
  status text not null check (status in ('pending','succeeded','failed','refunded'))
);