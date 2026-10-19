-- Migration 020: pantry depletion — "use what's in the house first"
-- Additive only. pantry_items gains: use_soon (flag the planner builds around), expires_on,
-- source (manual | scan | order | sms), last_seen (when it was last confirmed/bought).
alter table public.pantry_items
  add column if not exists use_soon boolean not null default false,
  add column if not exists expires_on date,
  add column if not exists source text not null default 'manual',
  add column if not exists last_seen timestamptz not null default now();
create index if not exists pantry_items_user_use_soon on public.pantry_items (user_id, use_soon);
comment on column public.pantry_items.use_soon is 'Planner builds at least two dinners around items flagged use_soon or expiring within 7 days.';
comment on column public.pantry_items.source is 'manual | scan | order (auto-stocked long-life staples from a grocery handoff) | sms';
