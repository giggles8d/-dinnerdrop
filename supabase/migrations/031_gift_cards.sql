-- Gift subscriptions (Sarah, Oct 29 2026): someone buys months of the Family plan for another family.
-- Paid through Stripe Checkout (one-time payment); the code is a GIFT... code redeemed like a promo code
-- (?code= on /start → applied on first dashboard load), extending profiles.family_until.
create table if not exists public.gift_cards (
  code text primary key,                         -- GIFT + 8 letters/digits
  months int not null,
  family_days int not null,
  amount_cents int not null,
  stripe_session_id text not null unique,        -- one gift per paid checkout (idempotent)
  buyer_name text,
  buyer_email text,
  recipient_name text,
  recipient_email text,
  message text,
  emailed_recipient_at timestamptz,
  emailed_buyer_at timestamptz,
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.gift_cards enable row level security;   -- service role only
