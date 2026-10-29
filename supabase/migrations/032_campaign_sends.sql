-- One row per address per email campaign (Sarah, Oct 29 2026 — the "come back" email to pre-relaunch
-- signups), so a campaign sends once, and its offer (gift code for a friend) is granted once.
create table if not exists public.campaign_sends (
  campaign text not null,
  email text not null,
  user_id uuid references public.profiles(id) on delete set null,
  variant text,
  sent_at timestamptz not null default now(),
  reward_code text,
  rewarded_at timestamptz,
  primary key (campaign, email)
);
alter table public.campaign_sends enable row level security;   -- service role only

-- 3 months of Family, no card, for old signups/waitlist without the free year.
insert into public.promo_codes (code, label, family_days, expires_at)
values ('WELCOMEBACK', 'Welcome back', 90, '2026-12-31T05:00:00Z')
on conflict (code) do nothing;
