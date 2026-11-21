-- Nov 21 2026 site review (#29): database housekeeping from the Supabase security advisor.
-- 1. Server-only functions: nobody signed in (or signed out) should call these through the API.
--    Triggers still fire (trigger functions don't need EXECUTE); bump_recipe_counter is only called with the service key.
revoke execute on function public.bump_recipe_counter(uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_profile_defaults() from public, anon, authenticated;
revoke execute on function public.handle_new_profile_household() from public, anon, authenticated;
revoke execute on function public.notify_waitlist_signup() from public, anon, authenticated;
-- my_household_id() stays callable: the household RLS policies use it.
-- 2. Fixed search_path on the three functions the advisor flagged.
alter function public.protect_profile_server_columns() set search_path = public;
alter function public.notify_waitlist_signup() set search_path = public;
alter function public.handle_new_user() set search_path = public;
