-- Migration 027 (2026-10-25): per-item purchase history from forwarded/uploaded receipts.
-- Additive only. One row per receipt line: where and when each thing was bought, at what price,
-- and whether it came, was replaced, or was refunded. Feeds "Past orders" on History and the
-- per-dinner "Your week, checked" card.
create table if not exists public.item_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  receipt_id uuid references public.receipts(id) on delete cascade,
  store text,
  bought_on date,
  name text not null,
  name_key text not null,                  -- normalized name for grouping (lib/list normalizeItemName)
  qty numeric,
  price numeric,
  status text not null default 'bought',   -- bought | replaced | refunded
  replaced_with text,
  created_at timestamptz default now()
);
alter table public.item_purchases enable row level security;
create policy "Users can view own purchases" on public.item_purchases for select using (auth.uid() = user_id);
create index if not exists item_purchases_user_key_idx on public.item_purchases(user_id, name_key, bought_on desc);
create index if not exists item_purchases_receipt_idx on public.item_purchases(receipt_id);
