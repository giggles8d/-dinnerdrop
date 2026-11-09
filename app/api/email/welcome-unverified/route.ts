import { NextResponse } from 'next/server'

// Retired 2026-11-08: sign-up is instant (no email to verify) and nothing calls this any more. It sent a branded
// email to any address posted to it with no sign-in, which anyone could have used to spam people from our domain.
// The template (emails/WelcomeUnverified.tsx) is kept for history only.
export async function POST() {
  return NextResponse.json({ error: 'Retired.' }, { status: 410 })
}
