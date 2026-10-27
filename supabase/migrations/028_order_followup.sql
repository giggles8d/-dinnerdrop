-- 2026-10-26: day-after-order follow-up email. Additive only.
alter table public.grocery_handoffs add column if not exists followup_sent_at timestamptz;
alter table public.grocery_handoffs add column if not exists feedback text;
alter table public.grocery_handoffs add column if not exists feedback_at timestamptz;
