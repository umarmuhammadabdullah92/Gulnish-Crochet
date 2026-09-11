-- =============================================================
-- Gulnish Crochet — Supabase schema
-- Paste this into Supabase: SQL Editor -> New query -> Run
-- (it can be run multiple times safely)
-- =============================================================

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id         text primary key,
  name       text not null,
  price      numeric default 0,
  category   text,
  image      text,
  keywords   jsonb default '[]'::jsonb,
  colors     jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.products add column if not exists keywords jsonb default '[]'::jsonb;

alter table public.products enable row level security;

drop policy if exists "products: public read" on public.products;
create policy "products: public read"
  on public.products for select
  using (true);

drop policy if exists "products: admin write" on public.products;
create policy "products: admin write"
  on public.products for all
  to authenticated
  using (true) with check (true);

-- ---------- SETTINGS (single row, id = 'app') ----------
create table if not exists public.settings (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

drop policy if exists "settings: public read" on public.settings;
create policy "settings: public read"
  on public.settings for select
  using (true);

drop policy if exists "settings: admin write" on public.settings;
create policy "settings: admin write"
  on public.settings for all
  to authenticated
  using (true) with check (true);

-- Bootstraps the settings row so the shop has defaults on first load.
insert into public.settings (id, data)
values (
  'app',
  jsonb_build_object(
    'categories', jsonb_build_array('Purses','Gajrays','Keychains','Bags','Jewellery','Headband'),
    'whatsapp', '03075729901',
    'craftDays', 5,
    'deliveryDays', 3,
    'bankAccountTitle', '',
    'bankAccountNo', '',
    'bankIBAN', '',
    'jazzcashNumber', '',
    'easypaisaNumber', '',
    'version', 3
  )
)
on conflict (id) do nothing;

-- ---------- ORDERS ----------
create table if not exists public.orders (
  id              text primary key,
  phone           text,
  customer_name   text,
  email           text,
  address         text,
  city            text,
  notes           text,
  items           jsonb default '[]'::jsonb,
  total           numeric default 0,
  payment         text,
  status          text default 'Pending',
  placed_at       timestamptz,
  created_at      timestamptz default now()
);

-- Professional order system columns
alter table public.orders add column if not exists status_history jsonb default '[]'::jsonb;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_status text default 'Pending';
alter table public.orders add column if not exists est_delivery timestamptz;
alter table public.orders add column if not exists updated_at timestamptz;
alter table public.orders add column if not exists craft_days int;
alter table public.orders add column if not exists delivery_days int;

update public.orders
set payment_method = coalesce(payment_method, payment),
    payment_status = coalesce(payment_status, 'Pending'),
    status_history = case
      when status_history = '[]'::jsonb then jsonb_build_array(jsonb_build_object('status', status, 'at', coalesce(placed_at, now())))
      else status_history
    end
where payment is not null;

create index if not exists orders_phone_idx on public.orders (phone);

alter table public.orders enable row level security;

drop policy if exists "orders: public read" on public.orders;
create policy "orders: public read"
  on public.orders for select
  using (true);

drop policy if exists "orders: insert" on public.orders;
create policy "orders: insert"
  on public.orders for insert
  with check (true);

drop policy if exists "orders: admin write" on public.orders;
create policy "orders: admin write"
  on public.orders for all
  to authenticated
  using (true) with check (true);

-- =============================================================
-- STORAGE — shop-images bucket
-- Run this ONLY after: Storage -> New bucket -> name it exactly
-- "shop-images" and set it to PUBLIC. Then run the RLS below so
-- visitors can view photos (anonymous read) while only signed-in
-- admins can upload/remove them.
-- =============================================================
insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do nothing;

drop policy if exists "shop-images: public read" on storage.objects;
create policy "shop-images: public read"
  on storage.objects for select
  using (bucket_id = 'shop-images');

drop policy if exists "shop-images: admin insert" on storage.objects;
create policy "shop-images: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'shop-images');

drop policy if exists "shop-images: admin update" on storage.objects;
create policy "shop-images: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'shop-images');

drop policy if exists "shop-images: admin delete" on storage.objects;
create policy "shop-images: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'shop-images');


-- =============================================================
-- SEED PRODUCTS (placeholders - edit names/prices in Product Manager)
-- Adds one product per shop photo so the store is populated.
-- Safe to re-run: it skips ids that already exist.
-- =============================================================
insert into public.products (id, name, price, category, image, keywords, colors) values
  ('seed_gr1_1', 'Premium hand made Rose Purse 1 (price per single purse)', 5799, 'gr1', 'images/purses/purse-1.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_2', 'Premium hand made Rose Purse 2 (price per single purse)', 5799, 'gr1', 'images/purses/purse-10.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_3', 'Premium hand made Rose Purse 3 (price per single purse)', 5799, 'gr1', 'images/purses/purse-11.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_4', 'Handmade Crochet Purse 4', 4500, 'gr1', 'images/purses/purse-12.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_5', 'Handmade Crochet Purse 5', 4500, 'gr1', 'images/purses/purse-13.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_6', 'Handmade Crochet Purse 6', 5500, 'gr1', 'images/purses/purse-14.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_7', 'Handmade Crochet Purse 7', 4500, 'gr1', 'images/purses/purse-15.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_8', 'Handmade Crochet Purse 8', 5500, 'gr1', 'images/purses/purse-16.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_9', 'Handmade Crochet Purse 9', 5500, 'gr1', 'images/purses/purse-17.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_10', 'Premium hand made Rose Purse 4 (price per single purse)', 5799, 'gr1', 'images/purses/purse-18.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_11', 'Premium hand made Rose Purse 5 (price per single purse)', 5799, 'gr1', 'images/purses/purse-19.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_12', 'Premium hand made Rose Purse 6 (price per single purse)', 5799, 'gr1', 'images/purses/purse-2.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_13', 'Handmade Crochet Purse 13', 4500, 'gr1', 'images/purses/purse-20.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_14', 'Handmade Crochet Purse 14', 4500, 'gr1', 'images/purses/purse-21.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_15', 'Premium hand made Rose Purse 7 (price per single purse)', 5799, 'gr1', 'images/purses/purse-22.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_16', 'Premium hand made Rose Purse 8 (price per single purse)', 5799, 'gr1', 'images/purses/purse-23.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_17', 'Handmade Crochet Purse 17', 5799, 'gr1', 'images/purses/purse-24.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_18', 'Handmade Crochet Purse 18', 5500, 'gr1', 'images/purses/purse-25.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_19', 'Premium hand made Rose Purse 9 (price per single purse)', 5799, 'gr1', 'images/purses/purse-26.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_20', 'Premium hand made Rose Purse 10 (price per single purse)', 5799, 'gr1', 'images/purses/purse-27.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_21', 'Handmade Crochet Purse 21', 2500, 'gr1', 'images/purses/purse-28.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_22', 'Handmade Crochet Purse 22', 5500, 'gr1', 'images/purses/purse-29.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_23', 'Handmade Crochet Purse 23', 5500, 'gr1', 'images/purses/purse-3.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_24', 'Handmade Crochet Purse 24', 2500, 'gr1', 'images/purses/purse-30.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_25', 'Handmade Crochet Purse 25', 2500, 'gr1', 'images/purses/purse-31.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_26', 'Handmade Crochet Purse 26', 5500, 'gr1', 'images/purses/purse-32.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_27', 'Handmade Crochet Purse 27', 4500, 'gr1', 'images/purses/purse-33.png', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_28', 'Handmade Crochet Purse 28', 2500, 'gr1', 'images/purses/purse-4.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_29', 'Handmade Crochet Purse 29', 5500, 'gr1', 'images/purses/purse-5.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_30', 'Handmade Crochet Purse 30', 4500, 'gr1', 'images/purses/purse-6.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_31', 'Handmade Crochet Purse 31', 5500, 'gr1', 'images/purses/purse-7.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_32', 'Handmade Crochet Purse 32', 4500, 'gr1', 'images/purses/purse-8.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr1_33', 'Handmade Crochet Purse 33', 5500, 'gr1', 'images/purses/purse-9.webp', '["handbag","purse","crochet bag","handmade","gift","woolen"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_1', 'Handmade Crochet Gajray 1', 1199, 'gr2', 'images/gajrays/gajray-1.webp', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_2', 'Handmade Crochet Gajray 2', 3999, 'gr2', 'images/gajrays/gajray-9.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_4', 'Handmade Crochet Gajray 4', 2499, 'gr2', 'images/gajrays/gajray-4.webp', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_5', 'Handmade Crochet Gajray 5', 3999, 'gr2', 'images/gajrays/gajray-5.webp', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_6', 'Handmade Crochet Gajray 6', 2499, 'gr2', 'images/gajrays/gajray-6.jpg', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_8', 'Handmade Crochet Gajray 8', 2499, 'gr2', 'images/gajrays/gajray-8.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_10', 'Handmade Crochet Gajray 10', 3999, 'gr2', 'images/gajrays/gajray-10.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_11', 'Handmade Crochet Gajray 11', 2499, 'gr2', 'images/gajrays/gajray-11.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_12', 'Handmade Crochet Gajray 12', 2499, 'gr2', 'images/gajrays/gajray-12.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_13', 'Handmade Crochet Gajray 13', 2499, 'gr2', 'images/gajrays/gajray-13.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_14', 'Handmade Crochet Gajray 14', 2499, 'gr2', 'images/gajrays/gajray-14.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_15', 'Handmade Crochet Gajray 15', 2499, 'gr2', 'images/gajrays/gajray-15.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_16', 'Handmade Crochet Gajray 16', 2499, 'gr2', 'images/gajrays/gajray-16.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr2_17', 'Handmade Crochet Gajray 17', 2499, 'gr2', 'images/gajrays/gajray-17.png', '["wedding","eid","hair","flowers","party","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_1', 'Handmade Crochet Keychain 1', 450, 'gr3', 'images/keychains/keychain-1.webp', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_2', 'Handmade Crochet Keychain 2', 450, 'gr3', 'images/keychains/keychain-10.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_3', 'Handmade Crochet Keychain 3', 450, 'gr3', 'images/keychains/keychain-11.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_4', 'Handmade Crochet Keychain 4', 450, 'gr3', 'images/keychains/keychain-12.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_5', 'Handmade Crochet Keychain 5', 450, 'gr3', 'images/keychains/keychain-13.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_6', 'Handmade Crochet Keychain 6', 450, 'gr3', 'images/keychains/keychain-14.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_7', 'Handmade Crochet Keychain 7', 450, 'gr3', 'images/keychains/keychain-15.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_8', 'Handmade Crochet Keychain 8', 450, 'gr3', 'images/keychains/keychain-16.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_9', 'Handmade Crochet Keychain 9', 450, 'gr3', 'images/keychains/keychain-17.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_10', 'Handmade Crochet Keychain 10', 450, 'gr3', 'images/keychains/keychain-18.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_11', 'Handmade Crochet Keychain 11', 450, 'gr3', 'images/keychains/keychain-19.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_12', 'Handmade Crochet Keychain 12', 450, 'gr3', 'images/keychains/keychain-2.webp', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_13', 'Handmade Crochet Keychain 13', 450, 'gr3', 'images/keychains/keychain-20.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_14', 'Handmade Crochet Keychain 14', 450, 'gr3', 'images/keychains/keychain-3.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_15', 'Handmade Crochet Keychain 15', 450, 'gr3', 'images/keychains/keychain-4.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_16', 'Handmade Crochet Keychain 16', 450, 'gr3', 'images/keychains/keychain-5.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_17', 'Handmade Crochet Keychain 17', 450, 'gr3', 'images/keychains/keychain-6.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_18', 'Handmade Crochet Keychain 18', 450, 'gr3', 'images/keychains/keychain-7.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_19', 'Handmade Crochet Keychain 19', 450, 'gr3', 'images/keychains/keychain-8.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr3_20', 'Handmade Crochet Keychain 20', 450, 'gr3', 'images/keychains/keychain-9.png', '["keyring","small gift","cute","handmade","gift","wholesale"]'::jsonb, '[]'::jsonb),
  ('seed_gr4_1', 'Earbuds Bag', 5999, 'gr4', 'images/bags/bag-1.webp', '["handbag","tote","shopper bag","handmade","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr4_2', 'Handmade Crochet Bag 2', 5999, 'gr4', 'images/bags/bag-2.webp', '["handbag","tote","shopper bag","handmade","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_1', 'Handmade Crochet Jewellery Set 1', 1499, 'gr5', 'images/jewellery/jewellery-1.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_2', 'Handmade Crochet Jewellery Set 2', 1499, 'gr5', 'images/jewellery/jewellery-2.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_3', 'Handmade Crochet Jewellery Set 3', 1499, 'gr5', 'images/jewellery/jewellery-3.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_4', 'Handmade Crochet Jewellery Set 4', 1499, 'gr5', 'images/jewellery/jewellery-4.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_5', 'Handmade Crochet Jewellery Set 5', 1599, 'gr5', 'images/jewellery/jewellery-5.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_6', 'Handmade Crochet Jewellery Set 6', 1499, 'gr5', 'images/jewellery/jewellery-6.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_7', 'Handmade Crochet Jewellery Set 7', 1599, 'gr5', 'images/jewellery/jewellery-7.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_8', 'Handmade Crochet Jewellery Set 8', 1499, 'gr5', 'images/jewellery/jewellery-8.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr5_9', 'Handmade Crochet Jewellery Set 9', 1499, 'gr5', 'images/jewellery/jewellery-9.webp', '["necklace","earrings","bridal","wedding","gift","accessory"]'::jsonb, '[]'::jsonb),
  ('seed_gr6_1', 'Handmade Crochet Headband 1', 1299, 'gr6', 'images/headbands/headband-1.webp', '["hairband","hair accessory","girl","handmade","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr6_2', 'Handmade Crochet Headband 2', 1299, 'gr6', 'images/headbands/headband-2.webp', '["hairband","hair accessory","girl","handmade","gift"]'::jsonb, '[]'::jsonb),
  ('seed_gr6_3', 'Handmade Crochet Headband 3', 1299, 'gr6', 'images/headbands/headband-3.webp', '["hairband","hair accessory","girl","handmade","gift"]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;

-- 81 products
