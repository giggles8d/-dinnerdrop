-- Shareable "our dinners this week" link (Sarah, Oct 29 2026): one stable token per family that always
-- shows their latest plan, read-only, at /week/<token>. Service role only; the page reads it server-side.
create table if not exists public.plan_shares (
  token text primary key,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.plan_shares enable row level security;
