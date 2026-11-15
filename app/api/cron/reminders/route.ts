import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDailyReminders } from '@/lib/reminders'
import { runTextingDay } from '@/lib/texting'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Reminders + automatic weekly plans, then the family texting day (vote day needs this morning's plans),
 * started by /api/cron/daily so they get their own 300 s budget. Nov 14 2026: a heavy Saturday of auto-plans
 * pushed the one daily function past 300 s and the steps after it were cut off.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = new Date()
  const out: Record<string, unknown> = {}
  try { out.reminders = await runDailyReminders(admin, now) } catch (e) { out.reminders = { error: String(e) } }
  try { out.texting = await runTextingDay(admin, now) } catch (e) { out.texting = { error: String(e) } }
  return NextResponse.json({ ok: true, ms: Date.now() - now.getTime(), ...out })
}
