-- Nov 8 2026 review: Supabase's performance advisor flagged foreign keys with no index. Add-only; nothing changes
-- except faster lookups by family (plans, favorites, carts, votes, texts) as the user count grows.
create index if not exists meal_plans_user_id_idx on public.meal_plans (user_id);
create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists grocery_handoffs_user_id_idx on public.grocery_handoffs (user_id);
create index if not exists vote_rounds_user_id_idx on public.vote_rounds (user_id);
create index if not exists meal_votes_member_id_idx on public.meal_votes (member_id);
create index if not exists sms_messages_member_id_idx on public.sms_messages (member_id);
create index if not exists household_members_profile_id_idx on public.household_members (profile_id);
create index if not exists profiles_household_id_idx on public.profiles (household_id);
create index if not exists households_owner_id_idx on public.households (owner_id);
create index if not exists campaign_sends_user_id_idx on public.campaign_sends (user_id);
create index if not exists help_messages_user_id_idx on public.help_messages (user_id);
create index if not exists recipes_created_by_idx on public.recipes (created_by);
