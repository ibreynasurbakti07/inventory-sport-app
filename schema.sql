-- ERD: categories (1) -> products (many) <- (1) suppliers
--      products (1) -> stock_movements (many)

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  sku text not null unique,
  unit text not null default 'pcs',
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 5 check (min_stock >= 0),
  price numeric(14, 2) not null default 0 check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('in', 'out')),
  quantity integer not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);

-- Jalankan seluruh file ini agar grant dan policy RLS ikut diterapkan.
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.categories, public.suppliers, public.products, public.stock_movements to authenticated;

drop policy if exists "Authenticated users manage categories" on public.categories;
create policy "Authenticated users manage categories" on public.categories
for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage suppliers" on public.suppliers;
create policy "Authenticated users manage suppliers" on public.suppliers
for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage products" on public.products;
create policy "Authenticated users manage products" on public.products
for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage stock movements" on public.stock_movements;
create policy "Authenticated users manage stock movements" on public.stock_movements
for all to authenticated using (true) with check (true);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_supplier_id_idx on public.products(supplier_id);
create index if not exists stock_movements_product_created_idx on public.stock_movements(product_id, created_at desc);

create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.movement_type = 'in' then
    update public.products
    set stock = stock + new.quantity, updated_at = now()
    where id = new.product_id;
  else
    update public.products
    set stock = stock - new.quantity, updated_at = now()
    where id = new.product_id and stock >= new.quantity;

    if not found then
      raise exception 'Stok tidak mencukupi untuk mutasi keluar.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists stock_movement_updates_product on public.stock_movements;
create trigger stock_movement_updates_product
before insert on public.stock_movements
for each row execute function public.apply_stock_movement();

-- Semua pengguna yang sudah login berbagi satu ruang persediaan.