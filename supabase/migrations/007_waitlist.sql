-- Migration 007: waitlist table for post-beta-full email capture
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'beta_full',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only service role can read/insert (no user self-access needed)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (webhook, cron, admin)
CREATE POLICY "Service role full access"
  ON public.waitlist
  USING (true)
  WITH CHECK (true);
