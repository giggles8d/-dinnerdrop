-- Migration 013: every new profile gets a household, a referral code and a calendar token.
-- Applied to production 2026-10-18 via Supabase MCP.
create or replace function public.handle_new_profile_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substr(md5(new.id::text || 'dd-ref'), 1, 8));
  end if;
  if new.calendar_token is null then
    new.calendar_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

create trigger profiles_defaults_before_insert
  before insert on public.profiles
  for each row execute procedure public.handle_new_profile_defaults();

create or replace function public.handle_new_profile_household()
returns trigger language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if new.household_id is null then
    insert into public.households (owner_id) values (new.id) returning id into h;
    update public.profiles set household_id = h where id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_household_after_insert
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_household();
