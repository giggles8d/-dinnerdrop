-- Migration 006: Email unsubscribe column
-- Tracks users who have opted out of trial email sequence
-- Required by: app/api/email/unsubscribe/route.ts + /unsubscribe page

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT false;

-- Ensure cron email sequences respect unsubscribe flag
-- (The route.ts already filters out subscription_status = 'active',
--  this column handles explicit opt-out for trialing users)
COMMENT ON COLUMN public.profiles.email_unsubscribed IS
  'Set to true when user clicks unsubscribe link in trial emails';
