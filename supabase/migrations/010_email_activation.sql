-- Migration 010: Email activation sequence support
-- Context (2026-07-04 audit): migrations 004-006 were never applied to production,
-- so profiles had no email columns and the daily email cron has silently no-oped
-- since launch. This migration (applied together with 004-006) adds the email
-- address itself, which lives only in auth.users and was never mirrored.

-- 1. Mirror the user's email onto profiles so the cron can query it via PostgREST
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- 3. Keep it populated for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Index for the activation-sequence cron (free users by signup date)
CREATE INDEX IF NOT EXISTS idx_profiles_activation_seq
  ON public.profiles (subscription_status, created_at)
  WHERE subscription_status = 'free';

COMMENT ON COLUMN public.profiles.email IS 'Mirrored from auth.users at signup (trigger) — used by email cron queries.';
