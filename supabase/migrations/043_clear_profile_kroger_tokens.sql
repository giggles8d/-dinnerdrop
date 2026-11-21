-- Step 2 of 042 (run after the kroger_tokens code is live): pick up any token written to profiles in between,
-- then clear the old columns so no browser can ever read them. Columns stay (empty) to avoid breaking old code paths.
insert into public.kroger_tokens (user_id, access_token, refresh_token, expires_at)
select id, kroger_access_token, kroger_refresh_token, kroger_token_expires_at
from public.profiles where kroger_access_token is not null
on conflict (user_id) do update set access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, updated_at = now();
update public.profiles set kroger_access_token = null, kroger_refresh_token = null, kroger_token_expires_at = null
where kroger_access_token is not null or kroger_refresh_token is not null;
