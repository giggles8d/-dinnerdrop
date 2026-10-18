import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDailyReminders } from '@/lib/reminders'
import { runTextingDay } from '@/lib/texting'
import { creditReferrals } from '@/lib/referrals'

export const maxDuration = 300

/**
 * The one daily cron (vercel.json: 0 12 * * * — 8am ET). Fans out to:
 *  - reminders + automatic weekly plans (lib/reminders)
 *  - family texting day jobs: vote day, "bring it back?" day (lib/texting)
 *  - the activation email sequence (existing route)
 *  - the Sunday newsletter (existing route)
 * Consolidated so the project stays within the hosting plan's cron limits.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = new Date()
  const out: Record<string, unknown> = {}

  try { out.reminders = await runDailyReminders(admin, now) } catch (e) { out.reminders = { error: String(e) } }
  try { out.texting = await runTextingDay(admin, now) } catch (e) { out.texting = { error: String(e) } }
  try { out.referrals = await creditReferrals(admin) } catch (e) { out.referrals = { error: String(e) } }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
  const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` }
  try {
    const r = await fetch(`${base}/api/cron/email-sequences`, { headers, cache: 'no-store' })
    out.emailSequences = await r.json().catch(() => ({ status: r.status }))
  } catch (e) { out.emailSequences = { error: String(e) } }
  if (now.getUTCDay() === 0) {
    try {
      const r = await fetch(`${base}/api/cron/newsletter`, { headers, cache: 'no-store' })
      out.newsletter = await r.json().catch(() => ({ status: r.status }))
    } catch (e) { out.newsletter = { error: String(e) } }
  }
  return NextResponse.json({ ok: true, at: now.toISOString(), ...out })
}
