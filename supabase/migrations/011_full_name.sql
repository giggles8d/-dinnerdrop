-- Migration 011: Add profiles.full_name
-- Referenced by app/(app)/account/page.tsx, app/api/cron/newsletter/route.ts,
-- and app/api/stripe/webhook/route.ts, but the column never existed in
-- production — any select including it errored, which is why /account showed
-- "Hi, there" + Free plan for every signed-in user (profile load failed).
-- Nothing populates it yet (email-only signup); all code paths handle NULL.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

COMMENT ON COLUMN public.profiles.full_name IS 'Optional display name. NULL for email-only signups; code falls back to email prefix.';
