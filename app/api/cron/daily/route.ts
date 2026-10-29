import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDailyReminders } from '@/lib/reminders'
import { runTextingDay } from '@/lib/texting'
import { creditReferrals } from '@/lib/referrals'
import { backfillImages } from '@/lib/recipe-library'
import { runOrderFollowups } from '@/lib/order-followup'
import { runWeeklyReport } from '@/lib/weekly-report'
import { shrinkRecipeImages } from '@/lib/shrink-images'

export const maxDuration = 300

/**
 * The one daily cron (vercel.json: 0 12 * * * — 8am ET). Fans out to:
 *  - reminders + automatic weekly plans (lib/reminders)
 *  - family texting day jobs: vote day, "bring it back?" day (lib/texting)
 *  - the activation email sequence (existing route)
 *  - the Sunday newsletter (existing route)
 *  - Monday: Sarah's weekly checkout report (lib/weekly-report)
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
  // Sunday: start the weekly newsletter first (its own function, up to 300 s for ~300 sends) and collect the result at the end.
  const nlBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
  const newsletter = now.getUTCDay() === 0
    ? fetch(`${nlBase}/api/cron/newsletter`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, cache: 'no-store' })
        .then((r) => r.json().catch(() => ({ status: r.status })))
        .catch((e) => ({ error: String(e) }))
    : null

  try { out.reminders = await runDailyReminders(admin, now) } catch (e) { out.reminders = { error: String(e) } }
  try { out.orderFollowups = await runOrderFollowups(admin, now) } catch (e) { out.orderFollowups = { error: String(e) } }
  try { out.texting = await runTextingDay(admin, now) } catch (e) { out.texting = { error: String(e) } }
  try { out.referrals = await creditReferrals(admin) } catch (e) { out.referrals = { error: String(e) } }
  try { out.recipeImages = await backfillImages(admin) } catch (e) { out.recipeImages = { error: String(e) } }
  try { out.weeklyReport = await runWeeklyReport(admin, now) } catch (e) { out.weeklyReport = { error: String(e) } }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
  const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` }
  try {
    const r = await fetch(`${base}/api/cron/email-sequences`, { headers, cache: 'no-store' })
    out.emailSequences = await r.json().catch(() => ({ status: r.status }))
  } catch (e) { out.emailSequences = { error: String(e) } }
  // Recipe photo diet: ~1 MB JPEGs → 900px WebP, a time-boxed batch per day (new photos included).
  try { out.shrinkImages = await shrinkRecipeImages(admin, { limit: 400, budgetMs: 120000 }) } catch (e) { out.shrinkImages = { error: String(e) } }
  if (newsletter) {
    out.newsletter = await newsletter
  }
  return NextResponse.json({ ok: true, at: now.toISOString(), ...out })
}
