-- Recipe notes (Sarah, Oct 29 2026 — from the Mealime gap list): a family's own note on a dinner
-- ("half the chili powder", "kids liked it with rice"), shown every time that dinner comes back.
-- Keyed by the dinner's normalized name so it follows the dinner across weeks, library or not.
create table if not exists public.recipe_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_key text not null,
  recipe_name text not null,
  note text not null check (char_length(note) <= 2000),
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_key)
);

alter table public.recipe_notes enable row level security;

create policy "recipe_notes: own rows read" on public.recipe_notes for select using (auth.uid() = user_id);
create policy "recipe_notes: own rows insert" on public.recipe_notes for insert with check (auth.uid() = user_id);
create policy "recipe_notes: own rows update" on public.recipe_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipe_notes: own rows delete" on public.recipe_notes for delete using (auth.uid() = user_id);
