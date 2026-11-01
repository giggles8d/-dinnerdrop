-- 036: store deals — one shared weekly-ad set per store (+ region) per ad week, read by
-- DinnerDrop's scheduled ad reader on the store's preview day. Families who list that store
-- in Settings → Store deals get these on top of their own snapped flyers. A store carries a
-- current set and a next-week set at once (valid_from in the future = "next week's deals").
create table if not exists public.store_deals (
  id uuid primary key default gen_random_uuid(),
  store text not null,                            -- canonical: Tops, Aldi, Wegmans, Walmart, Kroger…
  region text not null default 'US',             -- 'US' or a market, e.g. 'NY-Southern Tier'
  valid_from date,
  valid_to date,
  source text not null default 'ad',             -- ad | api | snap (shared family flyer)
  items jsonb not null default '[]'::jsonb,      -- [{name, price, unit, category, brand, note}]
  pages int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists store_deals_store_region_week_idx on public.store_deals(lower(store), region, valid_from);
create index if not exists store_deals_valid_idx on public.store_deals(valid_to);
alter table public.store_deals enable row level security;
-- Read-only for signed-in users; writes only via the service role (admin endpoint).
create policy "store_deals: read" on public.store_deals for select using (auth.role() = 'authenticated');
