-- First-visit funnel: one row per step a user reaches (dashboard, first plan, recipe,
-- grocery list...). Written only by API routes with the service role; users can't read
-- or write it directly. Lets us see exactly where new signups stop.
create table if not exists public.activation_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  step text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activation_events_user_idx on public.activation_events (user_id, created_at);
create index if not exists activation_events_step_idx on public.activation_events (step, created_at);

alter table public.activation_events enable row level security;
