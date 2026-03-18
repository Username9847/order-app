-- order-app schema (PostgreSQL)

create table if not exists menus (
  id bigserial primary key,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists options (
  id bigserial primary key,
  menu_id bigint not null references menus(id) on delete cascade,
  name text not null,
  extra_price integer not null default 0 check (extra_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'IN_PROGRESS', 'COMPLETED')),
  total_amount integer not null check (total_amount >= 0)
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  menu_id bigint not null references menus(id),
  menu_name_snapshot text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0)
);

create table if not exists order_item_options (
  id bigserial primary key,
  order_item_id bigint not null references order_items(id) on delete cascade,
  option_id bigint not null references options(id),
  option_name_snapshot text not null,
  extra_price integer not null default 0 check (extra_price >= 0)
);

