-- Migration 005: Schema fixes (D3 audit)
-- 1. preferred_store default was 'instacart' (lowercase) — must match STORE_OPTIONS = 'Instacart'
-- 2. meal_plans missing UPDATE RLS policy — grocery_list caching silently failed for all users
-- 3. Add trial_ends_at column to profiles — required for trial expiry display in app

-- Fix 1: preferred_store default case
ALTER TABLE public.profiles
  ALTER COLUMN preferred_store SET DEFAULT 'Instacart';

-- Backfill existing rows where lowercase default was written
UPDATE public.profiles
  SET preferred_store = 'Instacart'
  WHERE LOWER(preferred_store) = 'instacart';

-- Fix 2: Missing UPDATE policy on meal_plans
-- Without this, grocery_list caching (supabase.from('meal_plans').update(...)) silently fails for all users.
CREATE POLICY "Users can update own meal plans"
  ON public.meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix 3: Add trial_ends_at for display in app ("Your trial ends on May 12")
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.preferred_store IS 'Must match STORE_OPTIONS in lib/affiliate-links.ts (Walmart | Amazon Fresh | Instacart | Target | Kroger)';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Set by webhook on checkout.session.completed and customer.subscription.updated. Used to display trial expiry date in app UI.';
