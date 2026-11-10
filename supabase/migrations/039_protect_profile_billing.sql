-- Nov 10 2026 (security review, found Nov 5): "Users can update own profile" lets a signed-in family change ANY
-- column of their own row from the browser, including the ones that grant the Family plan (subscription_status,
-- is_beta_member, family_until, trial dates), their Stripe customer, and household_id (which would let them read
-- another household's profiles). These columns are only ever written by the server (service role) — Stripe
-- webhook, grants, promos, referrals, household join — so a signed-in write keeps the old value instead.
-- Settings, name, family size, budget, diets, store and Kroger tokens stay editable by the family.
create or replace function public.protect_profile_server_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.subscription_status := old.subscription_status;
    new.is_beta_member      := old.is_beta_member;
    new.family_until        := old.family_until;
    new.trial_starts_at     := old.trial_starts_at;
    new.trial_ends_at       := old.trial_ends_at;
    new.stripe_customer_id  := old.stripe_customer_id;
    new.household_id        := old.household_id;
    new.referral_code       := old.referral_code;
    new.referred_by         := old.referred_by;
    new.email               := old.email;
    new.email_sequence_sent := old.email_sequence_sent;
    new.signup_source       := old.signup_source;
    new.calendar_token      := old.calendar_token;
    new.id                  := old.id;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_server_columns
  before update on public.profiles
  for each row execute function public.protect_profile_server_columns();
