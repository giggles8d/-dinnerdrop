-- Migration 016 (2026-10-18): family vote rounds — candidates texted, picks tallied, week finalized.
create table if not exists public.vote_rounds (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  candidates jsonb not null default '[]'::jsonb,   -- Meal[] in the order they were texted
  picks_needed int not null default 5,
  status text not null default 'open' check (status in ('open', 'closed')),
  result jsonb,                                     -- { chosen: string[], tally: {name: n} }
  created_at timestamptz default now(),
  closed_at timestamptz
);
create index if not exists vote_rounds_household_idx on public.vote_rounds(household_id, status);
alter table public.vote_rounds enable row level security;
create policy "vote_rounds: household read" on public.vote_rounds for select using (household_id = public.my_household_id());
