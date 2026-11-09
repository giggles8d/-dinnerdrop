-- Next week's menus, built Friday as drafts so Sarah can review them on the Command Center before they go out
-- Saturday (Nov 9 2026). Saturday's auto plan uses the draft (lib/autoplan). Edits from the review page are
-- requests (edits / status) that the server applies (lib/menu-drafts).
create table if not exists public.menu_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  meals jsonb not null default '[]'::jsonb,
  checks jsonb not null default '[]'::jsonb,          -- rule-check warnings: [{level, text}]
  source text,                                        -- 'library' (never ordered) | 'ai'
  status text not null default 'draft',               -- draft | rebuild | skipped | sent
  edits jsonb not null default '[]'::jsonb,           -- pending requests: [{op:'remove'|'swap', index, recipe_id?, at}]
  note text,
  built_at timestamptz not null default now(),
  edited_at timestamptz,
  sent_at timestamptz,
  unique (user_id, week_start)
);
create index if not exists menu_drafts_week_idx on public.menu_drafts (week_start, status);
alter table public.menu_drafts enable row level security;
-- No policies: service role only (the app server and Sarah's own Supabase connector).
