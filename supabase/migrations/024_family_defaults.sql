-- New families start as a family of 4 with a $150/week dinner budget (was 2 people / $100).
-- Only changes the column defaults for new rows; existing profiles are untouched.
alter table public.profiles alter column family_size set default 4;
alter table public.profiles alter column weekly_budget set default '$150';
