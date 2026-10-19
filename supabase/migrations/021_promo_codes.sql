-- Migration 021 (2026-10-19): promo codes that grant Family-plan days with no card
-- (profiles.family_until). "3 months of Family free with code MEALIME" and the like.
create table if not exists public.promo_codes (
  code text primary key,                       -- upper-case, letters/digits only
  label text not null default '',              -- shown to the user: "Mealime switchers"
  family_days int not null default 90,
  max_redemptions int,                         -- null = unlimited
  redeemed int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.promo_redemptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,  -- one code per family
  code text not null references public.promo_codes(code),
  family_until date not null,
  redeemed_at timestamptz not null default now()
);
create index if not exists promo_redemptions_code_idx on public.promo_redemptions(code);
alter table public.promo_codes enable row level security;        -- service role only
alter table public.promo_redemptions enable row level security;  -- service role only

insert into public.promo_codes (code, label, family_days, expires_at)
values ('MEALIME', 'Mealime switchers', 90, '2026-12-31T05:00:00Z')
on conflict (code) do nothing;
