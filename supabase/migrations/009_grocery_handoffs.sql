-- Migration 009: grocery_handoffs — track when a user sends their list to a store.
-- Additive only. One row per successful Instacart link creation or Kroger cart push.
-- Applied to production 2026-06-07.
create table if not exists public.grocery_handoffs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  store text not null,            -- 'Instacart' | 'Kroger'
  item_count int not null default 0,
  created_at timestamptz default now()
);

alter table public.grocery_handoffs enable row level security;

create policy "Users can view own handoffs"
  on public.grocery_handoffs for select using (auth.uid() = user_id);

create policy "Users can insert own handoffs"
  on public.grocery_handoffs for insert with check (auth.uid() = user_id);

create index if not exists grocery_handoffs_created_at_idx on public.grocery_handoffs(created_at);
create index if not exists grocery_handoffs_store_idx on public.grocery_handoffs(store);
