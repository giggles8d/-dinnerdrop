import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { runDailyReminders } from '@/lib/reminders'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * GET (Sarah's signed-in browser only) — run today's automatic weekly plans + plan-ready notices now,
 * for families whose plan day is today (or yesterday, catch-up). Nothing else from the daily job runs.
 * Used when the 8 AM cron fired before a plan-day change deployed (Oct 31 2026).
 */
export async function GET() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const started = Date.now()
  const report = await runDailyReminders(admin, new Date(), { onlyAutoPlan: true })
  return NextResponse.json({ ok: true, seconds: Math.round((Date.now() - started) / 1000), checked: report.checked, autoPlans: report.autoPlans, errors: report.errors })
}
