-- FORMO database schema for Supabase / PostgreSQL.
-- Run this in the Supabase SQL editor, then set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env
-- and run `npm run seed`.
--
-- All access goes through the Express API using the service role key.
-- RLS is enabled with no public policies, so the anon key cannot read or write anything directly.

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  addresses jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  blurb text,
  virtual boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  slug text not null unique,
  name text not null,
  tagline text,
  category text references categories(slug) on update cascade,
  price numeric(10,2) not null,
  compare_at numeric(10,2),
  stock int not null default 0,
  tone text,
  images jsonb not null default '[]',
  colors jsonb not null default '[]',
  sizes jsonb not null default '[]',
  description text,
  features jsonb not null default '[]',
  dimensions text,
  material text,
  weight text,
  care text,
  featured boolean not null default false,
  is_new boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  sold int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on products (category);

create table if not exists reviews (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  user_id text references users(id) on delete set null,
  name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  verified boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on reviews (product_id);

create table if not exists coupons (
  id text primary key,
  code text not null unique,
  type text not null check (type in ('percent', 'flat')),
  value numeric(10,2) not null,
  min_order numeric(10,2) not null default 0,
  max_uses int,
  used int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  number text not null unique,
  user_id text references users(id) on delete set null,
  email text not null,
  customer jsonb not null,
  address jsonb not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon text,
  payment jsonb not null,
  status text not null,
  timeline jsonb not null default '[]',
  access_key text not null,
  shipment jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id);

create table if not exists ideas (
  id text primary key,
  problem text not null,
  name text,
  email text,
  phone text,
  image text,
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists subscribers (
  id text primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists wishlist (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table users enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table reviews enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table ideas enable row level security;
alter table subscribers enable row level security;
alter table wishlist enable row level security;

-- Public bucket for product photos and custom-request uploads.
insert into storage.buckets (id, name, public) values ('formo-media', 'formo-media', true)
on conflict (id) do nothing;
