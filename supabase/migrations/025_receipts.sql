-- Migration 025 (2026-10-24): forwarded store receipts.
-- Additive only. A user forwards their Instacart/Kroger order receipt email to the DinnerDrop
-- receiving address; we parse it, record what was actually bought / replaced / refunded,
-- reconcile against the list that went to the store, and put anything the store didn't have
-- back on the active list.
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  handoff_id uuid references public.grocery_handoffs(id) on delete set null,
  email_id text unique,                 -- Resend received-email id (dedupes webhook retries)
  from_email text,
  store text,
  ordered_on date,
  total numeric,
  item_count int not null default 0,
  items jsonb not null default '[]'::jsonb,   -- [{name, qty, price, status: bought|replaced|refunded|missing, replacedWith}]
  summary jsonb not null default '{}'::jsonb, -- {bought, replaced, refunded, missing, restored}
  raw_text text,
  created_at timestamptz default now()
);
alter table public.receipts enable row level security;
create policy "Users can view own receipts" on public.receipts for select using (auth.uid() = user_id);
create index if not exists receipts_user_created_idx on public.receipts(user_id, created_at desc);

-- What the receipt said about each line that went to the store.
alter table public.list_items add column if not exists receipt_status text;
comment on column public.list_items.receipt_status is 'bought | replaced | refunded | missing — set when a forwarded receipt is reconciled';
