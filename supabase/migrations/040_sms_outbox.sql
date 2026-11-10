-- Nov 10 2026: texts wait for the family's texting hours (lib/send-window). A scheduled text that can't go out now
-- is held here; the 5-minute poll sends it when send_after passes. Server-only (service role); RLS on, no policies.
create table if not exists public.sms_outbox (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid references public.household_members(id) on delete set null,
  to_number text not null,
  body text not null,
  intent text not null,
  media_url text,
  send_after timestamptz not null,
  same_day_only boolean not null default false,
  sent_at timestamptz,
  skipped boolean not null default false,
  twilio_sid text,
  created_at timestamptz not null default now()
);
create index if not exists sms_outbox_due on public.sms_outbox (send_after) where sent_at is null;
create index if not exists sms_outbox_household on public.sms_outbox (household_id);
alter table public.sms_outbox enable row level security;
