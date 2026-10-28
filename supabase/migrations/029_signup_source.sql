-- Where each family came from (utm / ad click / referring site), recorded at signup. Additive only.
alter table public.profiles add column if not exists signup_source jsonb;
