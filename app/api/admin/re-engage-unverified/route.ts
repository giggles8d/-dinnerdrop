import { NextResponse } from 'next/server'

// Retired 2026-10-18: this one-off campaign sold the closed founding offer
// ("spots left", "6 months free", "no credit card"). The template is kept for
// history only; the route no longer sends.
export async function GET() {
  return NextResponse.json({ error: 'Retired. The founding offer closed on 2026-10-16.' }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: 'Retired. The founding offer closed on 2026-10-16.' }, { status: 410 })
}
