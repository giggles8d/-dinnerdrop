-- Nov 21 2026 site review (#21): Kroger sign-in tokens move out of profiles (readable by every household member
-- through the "household read" policy) into a server-only table. RLS on, no policies, no grants: only the
-- service key (server routes) can read or write it. Step 1: create and copy. Step 2 (043) clears the old columns
-- once the code reading this table is live.
create table if not exists public.kroger_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.kroger_tokens enable row level security;
revoke all on public.kroger_tokens from anon, authenticated;

insert into public.kroger_tokens (user_id, access_token, refresh_token, expires_at)
select id, kroger_access_token, kroger_refresh_token, kroger_token_expires_at
from public.profiles where kroger_access_token is not null
on conflict (user_id) do update set access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, updated_at = now();
