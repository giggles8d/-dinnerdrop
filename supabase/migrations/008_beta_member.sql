-- Migration 008: is_beta_member flag for BETA100 coupon users
-- Beta members get 6 months free and should not receive standard trial-end urgency emails
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_beta_member BOOLEAN DEFAULT false;
