-- 017: weekly sales — what's on sale at the family's store this week, imported from a
-- flyer photo / link / pasted text (or, later, a retailer API). The planner builds the
-- week around these; the grocery list marks them.
create table if not exists public.weekly_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  store text not null default '',
  valid_from date,
  valid_to date,
  source text not null default 'photo',          -- photo | link | text | kroger
  items jsonb not null default '[]'::jsonb,      -- [{name, price, unit, category, brand, note}]
  added_by text,
  created_at timestamptz not null default now()
);
create index if not exists weekly_sales_user_created_idx on public.weekly_sales(user_id, created_at desc);
alter table public.weekly_sales enable row level security;
create policy "weekly_sales: own" on public.weekly_sales for all
  using (user_id = auth.uid() or household_id = public.my_household_id())
  with check (user_id = auth.uid());
