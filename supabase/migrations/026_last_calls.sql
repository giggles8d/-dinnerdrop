-- Migration 026 (2026-10-25): "Ask the family first" — a last-call text before the planner orders.
-- Additive only. One row per last call; replies land on list_items via the normal ADD/photo path
-- (source 'sms', added_by = member name) and are attributed to the call by time window.
create table if not exists public.last_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  store text,
  message text not null,
  minutes int not null default 20,
  sent_to int not null default 0,          -- members texted
  skipped int not null default 0,          -- opted-in members not texted (weekly cap)
  sent_at timestamptz not null default now(),
  closes_at timestamptz not null,
  closed_at timestamptz,                   -- set when the planner orders / taps "order now" / timer observed expired
  closed_reason text,                      -- ordered | manual | expired
  created_at timestamptz default now()
);
alter table public.last_calls enable row level security;
create policy "Users can view own last calls" on public.last_calls for select using (auth.uid() = user_id);
create index if not exists last_calls_user_open_idx on public.last_calls(user_id, sent_at desc);
