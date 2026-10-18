-- Migration 015 (2026-10-18): tiny key/value table + pg_cron job that polls
-- /api/sms/poll every 2 minutes so family replies are read from Twilio without
-- changing the shared number's webhook. Applied to production via Supabase MCP.
create table if not exists public.app_kv (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_kv enable row level security;  -- service role only

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule(
  'dinnerdrop-sms-poll',
  '*/2 * * * *',
  $$ select net.http_post(url := 'https://www.dinnerdrop.app/api/sms/poll', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 55000); $$
);
