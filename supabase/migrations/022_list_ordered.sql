-- Migration 022 (2026-10-19): items come off the active grocery list once they've been sent to a store.
-- ordered_at is set when the list goes to Instacart/Kroger; the active list = ordered_at is null.
-- Family texts during the week then start a fresh list instead of reviving last order's lines.
alter table public.list_items add column if not exists ordered_at timestamptz;
create index if not exists list_items_user_open_idx on public.list_items(user_id, week_start) where ordered_at is null;
