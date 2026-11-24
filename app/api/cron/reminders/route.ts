import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDailyReminders } from '@/lib/reminders'
import { runTextingDay } from '@/lib/texting'
import { runShopDayNudges } from '@/lib/shop-day'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Nov 23 2026: in a GET-only route handler, Next 14 keeps caching fetch() responses even with force-dynamic (the
// request isn't proxied, so nothing marks the route dynamic and the Supabase reads get "auto cache" for a year).
// Since this route split off on Nov 15, tonight's-dinner and shop-day texts read the plan that was current on
// their first run (Sarah's house got "Meatloaf" from the Nov 9 week on Nov 23). force-no-store turns that off.
export const fetchCache = 'force-no-store'

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
  // Shop-day morning nudge (Nov 22 2026 review, Sarah approved): after this morning's plans exist, families whose
  // shop day is today and who haven't sent this week's list get the no-sign-in cart or list link (STOP/unsubscribe respected).
  try { out.shopDay = await runShopDayNudges(admin, now) } catch (e) { out.shopDay = { error: String(e) } }
  try { out.texting = await runTextingDay(admin, now) } catch (e) { out.texting = { error: String(e) } }
  return NextResponse.json({ ok: true, ms: Date.now() - now.getTime(), ...out })
}
