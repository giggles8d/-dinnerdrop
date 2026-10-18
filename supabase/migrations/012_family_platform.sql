-- Migration 012: family platform (2026-10-18). Additive only.
-- Settings screen, per-person profiles, shared household, recipe library,
-- real grocery list, staples, family texting, referrals, affiliate applications.
-- Applied to production 2026-10-18 via Supabase MCP.

-- ---------- profiles: settings + sharing + referral + calendar ----------
alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists household_id uuid,
  add column if not exists family_until timestamptz,
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id),
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists calendar_token text;

comment on column public.profiles.settings is 'Settings screen bag: plan shape, schedule, reminders, food prefs, equipment, stores, quiet hours. See lib/settings.ts for the typed shape and defaults.';
comment on column public.profiles.family_until is 'Family access granted outside Stripe (referral credits, promos). isFamily = active/trialing || is_beta_member || family_until > now().';

update public.profiles set referral_code = upper(substr(md5(id::text || 'dd-ref'), 1, 8)) where referral_code is null;
update public.profiles set calendar_token = encode(gen_random_bytes(16), 'hex') where calendar_token is null;
create unique index if not exists profiles_referral_code_idx on public.profiles(referral_code);
create unique index if not exists profiles_calendar_token_idx on public.profiles(calendar_token);

-- ---------- households ----------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  created_at timestamptz default now()
);
alter table public.profiles
  add constraint profiles_household_id_fkey foreign key (household_id) references public.households(id) on delete set null;

-- one household per existing profile (owner = that profile)
insert into public.households (owner_id)
select p.id from public.profiles p where p.household_id is null
on conflict do nothing;
update public.profiles p set household_id = h.id
from public.households h where h.owner_id = p.id and p.household_id is null;

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  role text not null default 'adult' check (role in ('adult', 'kid')),
  age_band text,                       -- 'toddler' | 'kid' | 'tween' | 'teen' | 'adult'
  phone text,                          -- E.164
  phone_opt_in_at timestamptz,
  phone_opted_out boolean not null default false,
  can_vote boolean not null default true,
  can_add boolean not null default true,
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  allergies text[] not null default '{}',
  safe_foods text[] not null default '{}',
  created_at timestamptz default now()
);
create index if not exists household_members_household_idx on public.household_members(household_id);
create index if not exists household_members_phone_idx on public.household_members(phone);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(12), 'hex'),
  email text,
  created_at timestamptz default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id)
);

-- helper: the caller's household (stable, security definer so RLS can use it)
create or replace function public.my_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- ---------- recipe library ----------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  name text not null,
  slug text not null unique,
  cuisine text,
  protein text,
  cook_time int,
  prep_time int,
  servings int default 4,
  estimated_cost numeric,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  dietary text[] not null default '{}',
  image_url text,
  image_credit text,
  nutrition jsonb,
  source text not null default 'generated' check (source in ('generated', 'user')),
  created_by uuid references public.profiles(id) on delete set null,
  is_public boolean not null default true,
  times_planned int not null default 0,
  kept_count int not null default 0,
  skipped_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists recipes_cuisine_idx on public.recipes(cuisine);
create index if not exists recipes_cook_time_idx on public.recipes(cook_time);
create index if not exists recipes_tags_idx on public.recipes using gin(tags);
create index if not exists recipes_dietary_idx on public.recipes using gin(dietary);

-- ---------- grocery list (real rows, not only the plan JSON) ----------
create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  week_start date,
  name text not null,
  quantity text,
  unit text,
  category text not null default 'Pantry & Dry Goods',
  search_term text,
  source text not null default 'plan' check (source in ('plan', 'manual', 'sms', 'staples', 'pantry', 'extra')),
  added_by text,
  have boolean not null default false,
  checked boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists list_items_user_week_idx on public.list_items(user_id, week_start);
create index if not exists list_items_household_idx on public.list_items(household_id);

create table if not exists public.staples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  quantity text,
  unit text,
  category text not null default 'Pantry & Dry Goods',
  every_weeks int not null default 1,
  last_added_week date,
  created_at timestamptz default now()
);
create index if not exists staples_user_idx on public.staples(user_id);

-- ---------- family texting ----------
create table if not exists public.meal_votes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid references public.household_members(id) on delete set null,
  week_start date,
  meal_name text not null,
  vote text not null check (vote in ('keep', 'skip', 'again')),
  via text not null default 'sms',
  created_at timestamptz default now()
);
create index if not exists meal_votes_household_week_idx on public.meal_votes(household_id, week_start);

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete set null,
  member_id uuid references public.household_members(id) on delete set null,
  direction text not null check (direction in ('in', 'out')),
  from_number text,
  to_number text,
  body text,
  intent text,
  twilio_sid text,
  created_at timestamptz default now()
);
create index if not exists sms_messages_household_idx on public.sms_messages(household_id, created_at);

-- ---------- referrals + affiliate applications ----------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'credited', 'void')),
  credited_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists referrals_referrer_idx on public.referrals(referrer_id);

create table if not exists public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  platform text,
  audience text,
  url text,
  notes text,
  status text not null default 'new',
  created_at timestamptz default now()
);

-- ---------- RLS ----------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.recipes enable row level security;
alter table public.list_items enable row level security;
alter table public.staples enable row level security;
alter table public.meal_votes enable row level security;
alter table public.sms_messages enable row level security;
alter table public.referrals enable row level security;
alter table public.affiliate_applications enable row level security;

create policy "households: members read" on public.households for select using (id = public.my_household_id() or owner_id = auth.uid());
create policy "households: owner insert" on public.households for insert with check (owner_id = auth.uid());
create policy "households: owner update" on public.households for update using (owner_id = auth.uid());

create policy "members: household read" on public.household_members for select using (household_id = public.my_household_id());
create policy "members: household write" on public.household_members for insert with check (household_id = public.my_household_id());
create policy "members: household update" on public.household_members for update using (household_id = public.my_household_id());
create policy "members: household delete" on public.household_members for delete using (household_id = public.my_household_id());

create policy "invites: household read" on public.household_invites for select using (household_id = public.my_household_id());
create policy "invites: household insert" on public.household_invites for insert with check (household_id = public.my_household_id());
create policy "invites: household delete" on public.household_invites for delete using (household_id = public.my_household_id());

create policy "recipes: public read" on public.recipes for select using (is_public or created_by = auth.uid());

create policy "list_items: household read" on public.list_items for select using (user_id = auth.uid() or household_id = public.my_household_id());
create policy "list_items: own insert" on public.list_items for insert with check (user_id = auth.uid() or household_id = public.my_household_id());
create policy "list_items: household update" on public.list_items for update using (user_id = auth.uid() or household_id = public.my_household_id());
create policy "list_items: household delete" on public.list_items for delete using (user_id = auth.uid() or household_id = public.my_household_id());

create policy "staples: own" on public.staples for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "votes: household read" on public.meal_votes for select using (household_id = public.my_household_id());
create policy "votes: household insert" on public.meal_votes for insert with check (household_id = public.my_household_id());

create policy "sms: household read" on public.sms_messages for select using (household_id = public.my_household_id());

create policy "referrals: referrer read" on public.referrals for select using (referrer_id = auth.uid());

-- Shared household: partners see each other's plans and favorites.
create policy "meal_plans: household read" on public.meal_plans for select
  using (user_id in (select id from public.profiles where household_id = public.my_household_id()));
create policy "favorites: household read" on public.favorites for select
  using (user_id in (select id from public.profiles where household_id = public.my_household_id()));

-- profiles: let partners see minimal profile rows of their household (name/email for the shared view)
create policy "profiles: household read" on public.profiles for select using (household_id = public.my_household_id());
