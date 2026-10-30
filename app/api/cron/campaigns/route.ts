import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runComeback } from '@/lib/comeback'
import { runThanksgiving } from '@/lib/thanksgiving-campaign'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Email campaigns (called by the daily cron). Each campaign only sends once it's approved in app_kv. */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const comeback = await runComeback(admin, new Date(), { budgetMs: 120000 }).catch((e) => ({ error: String(e) }))
  const thanksgiving = await runThanksgiving(admin, new Date(), { budgetMs: 150000 }).catch((e) => ({ error: String(e) }))
  return NextResponse.json({ ok: true, comeback, thanksgiving })
}
