import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pollInbound } from '@/lib/texting'

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
  await admin.from('app_kv').upsert({ key: 'sms_poll', value: { ...report, at: new Date().toISOString() }, updated_at: new Date().toISOString() })
  return NextResponse.json(report)
}

export async function GET() { return POST() }
