import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pollInbound } from '@/lib/texting'
import { sendSignupAlerts } from '@/lib/signup-alerts'
import { buildStarterWeeks } from '@/lib/starter-week'
import { sendWelcomeEmails } from '@/lib/welcome-email'
import { runSundayDropSweep } from '@/lib/sunday-drop'
import { runMenuDraftSweep, inDraftWindow } from '@/lib/menu-drafts'
import { sendLateWeekTexts } from '@/lib/texting-setup'
import { runCartAsk } from '@/lib/cart-ask-campaign'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Reads new inbound texts from Twilio and handles the ones from DinnerDrop
 * families (votes, ADD, YES/STOP), replies, and sends the planner the
 * "everyone's voted" text. Triggered every 2 minutes by a Supabase pg_cron job
 * (no webhook change on the shared Twilio number). Unauthenticated by design,
 * so it rate-limits itself: at most one real poll per 45 seconds.
 */
export async function POST() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: kv } = await admin.from('app_kv').select('value, updated_at').eq('key', 'sms_poll').maybeSingle()
  const last = kv?.updated_at ? new Date(kv.updated_at).getTime() : 0
  if (Date.now() - last < 45_000) return NextResponse.json({ skipped: 'recent' })
  await admin.from('app_kv').upsert({ key: 'sms_poll', value: { started: new Date().toISOString() }, updated_at: new Date().toISOString() })
  const report = await pollInbound(admin)
  // New sign-up alerts to Sarah's phone (lib/signup-alerts); never let them break the poll.
  let signupAlerts: unknown = null
  // Before the sign-up text, so it can say a starter week was built (lib/starter-week).
  let starter: unknown = null
  try { starter = await buildStarterWeeks(admin) } catch (e) { console.error('[starter-week]', e) }
  try { signupAlerts = await sendSignupAlerts(admin) } catch (e) { console.error('[signup-alerts]', e) }
  // Sarah's personal welcome email to every new sign-up (lib/welcome-email).
  let welcome: unknown = null
  try { welcome = await sendWelcomeEmails(admin) } catch (e) { console.error('[welcome]', e) }
  // The Sunday Drop (lib/sunday-drop): on Sundays, a time-boxed batch per poll until every family has this week's.
  let drop: unknown = null
  const now = new Date()
  // First "your week" text for families who were picking their own week but never confirmed (30 min after setup).
  let weekTexts: unknown = null
  try { weekTexts = await sendLateWeekTexts(admin) } catch (e) { console.error('[week-texts]', e) }
  // Menus going out (lib/menu-drafts): Fridays and early Saturday, build next week's drafts for Sarah's review and
  // apply her edits from the Command Center.
  let drafts: unknown = null
  if (inDraftWindow(now)) {
    try { drafts = await runMenuDraftSweep(admin, now, 20000) } catch (e) { console.error('[menu-drafts]', e) }
  }
  if (now.getUTCDay() === 0 || (now.getUTCDay() === 1 && now.getUTCHours() < 8)) {
    try { drop = await runSundayDropSweep(admin, now, 25000) } catch (e) { console.error('[sunday-drop]', e) }
  }
  // One-off "how did your order go?" email to families who sent a cart (lib/cart-ask-campaign), only once approved.
  let cartAsk: unknown = null
  try { cartAsk = await runCartAsk(admin, now, { budgetMs: 15000 }) } catch (e) { console.error('[cart-ask]', e) }
  await admin.from('app_kv').upsert({ key: 'sms_poll', value: { ...report, cartAsk, starter, signupAlerts, welcome, drop, at: new Date().toISOString() }, updated_at: new Date().toISOString() })
  return NextResponse.json({ ...report, signupAlerts, welcome, drop, drafts, weekTexts })
}

export async function GET() { return POST() }
