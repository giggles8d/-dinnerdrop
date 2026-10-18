import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { textMember, type MemberRow } from '@/lib/texting'
import { mergeSettings } from '@/lib/settings'
import { smsConfigured } from '@/lib/notify'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST { message, includeMe? } — the planner texts the whole household one message
 * ("ordering at 3:45, anything you want by 3:40"). Owner only; opted-in members;
 * prefixed with "DinnerDrop:" so replies route like any other text (ADD, photos).
 */
export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { message, includeMe } = await req.json().catch(() => ({})) as { message?: string; includeMe?: boolean }
  const text = (message ?? '').trim()
  if (!text) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (!smsConfigured()) return NextResponse.json({ error: 'Texting is not configured' }, { status: 503 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: prof } = await admin.from('profiles').select('household_id, settings').eq('id', user.id).single()
  if (!prof?.household_id) return NextResponse.json({ error: 'No household yet' }, { status: 400 })
  const settings = mergeSettings(prof.settings)
  if (!settings.texting.enabled) return NextResponse.json({ error: 'Family texting is off in Settings' }, { status: 400 })
  const { data: members } = await admin.from('household_members').select('*').eq('household_id', prof.household_id).not('phone', 'is', null)
  const body = text.startsWith('DinnerDrop') ? text : `DinnerDrop: ${text}`
  const sent: string[] = [], skipped: string[] = []
  for (const m of (members ?? []) as MemberRow[]) {
    if (!includeMe && m.profile_id === user.id) continue
    const ok = await textMember(admin, m, body, 'broadcast')   // no weekly cap: the planner asked for this one
    ;(ok ? sent : skipped).push(m.name)
  }
  return NextResponse.json({ ok: true, sent, skipped })
}
