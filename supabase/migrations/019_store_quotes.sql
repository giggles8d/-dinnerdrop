-- 019: per-store basket quotes — the family's open list priced at each of their stores
-- (read from Instacart's list page, sale prices included) so "Which store this week" is real.
create table if not exists public.store_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date,
  store text not null,
  total numeric not null,
  item_count int,
  missing jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  source text not null default 'instacart',
  created_at timestamptz not null default now()
);
create index if not exists store_quotes_user_week_idx on public.store_quotes(user_id, week_start, created_at desc);
alter table public.store_quotes enable row level security;
create policy "store_quotes: own" on public.store_quotes for select using (user_id = auth.uid() or user_id in (select owner_id from public.households where id = public.my_household_id()));
