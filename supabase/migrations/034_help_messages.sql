-- Help / contact messages sent from the app (Oct 29, 2026). Additive.
create table if not exists public.help_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  message text not null,
  page text,
  created_at timestamptz not null default now()
);
create index if not exists help_messages_email_idx on public.help_messages(email, created_at desc);
alter table public.help_messages enable row level security;
-- Written by the service role only; nothing to read from the client.
