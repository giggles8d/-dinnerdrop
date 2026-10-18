-- 018: honest list totals + per-store price calibration.
-- list_items.est_price: typical-price estimate for non-plan lines (texted / added / basics).
-- grocery_handoffs.est_total / actual_total: what we estimated at handoff vs what the store charged,
-- so settings.stores.priceFactor can be learned from real orders.
alter table public.list_items add column if not exists est_price numeric;
alter table public.grocery_handoffs add column if not exists est_total numeric;
alter table public.grocery_handoffs add column if not exists actual_total numeric;
alter table public.grocery_handoffs add column if not exists week_start date;
