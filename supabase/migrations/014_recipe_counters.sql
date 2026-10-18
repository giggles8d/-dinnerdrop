-- Migration 014: recipe counter bump (2026-10-18). Applied to production via Supabase MCP.
create or replace function public.bump_recipe_counter(recipe_id uuid, counter text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if counter = 'kept_count' then
    update public.recipes set kept_count = kept_count + 1, updated_at = now() where id = recipe_id;
  elsif counter = 'skipped_count' then
    update public.recipes set skipped_count = skipped_count + 1, updated_at = now() where id = recipe_id;
  elsif counter = 'times_planned' then
    update public.recipes set times_planned = times_planned + 1, updated_at = now() where id = recipe_id;
  end if;
end $$;
