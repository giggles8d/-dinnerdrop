-- Migration: Add email sequence tracking to profiles
-- Adds trial_starts_at and email_sequence_sent columns
-- Required for DinnerDrop trial-to-paid email automation (Resend)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sequence_sent INTEGER[] DEFAULT '{}';

-- Backfill trial_starts_at from created_at for existing trialing users
UPDATE profiles
SET trial_starts_at = created_at
WHERE subscription_status = 'trialing'
  AND trial_starts_at IS NULL;

-- Index for cron query performance (filters by status + date range daily)
CREATE INDEX IF NOT EXISTS idx_profiles_trial_starts_at
  ON profiles (subscription_status, trial_starts_at)
  WHERE subscription_status = 'trialing';

COMMENT ON COLUMN profiles.trial_starts_at IS 'When the user started their free trial. Used to calculate Day 3/6/7 email send windows.';
COMMENT ON COLUMN profiles.email_sequence_sent IS 'Array of email numbers (1,2,3) already sent. Prevents duplicate sends.';
