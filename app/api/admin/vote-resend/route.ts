import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { startVoteCycle } from '@/lib/texting'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * POST { ownerId } — resend the household's OPEN vote round's menu text (same dinners, same round,
 * picture re-rendered) to the members who already received it. Used after a picture/formatting fix.
 * Auth: x-admin-secret = SETUP_SECRET, a one-shot token in app_kv.vote_resend_token (deleted on use), or Sarah logged in.
 */
export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  let ok = false
  const secret = req.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) ok = true
  const once = req.headers.get('x-once-token')
  if (!ok && once) {
    const { data } = await admin.from('app_kv').select('value').eq('key', 'vote_resend_token').maybeSingle()
    if (data?.value && (data.value as { token?: string }).token === once) {
      await admin.from('app_kv').delete().eq('key', 'vote_resend_token')
      ok = true
    }
  }
  if (!ok) {
    const auth = createServerSupabaseClient()
    const { data: { user } } = await auth.auth.getUser()
    ok = user?.email === ADMIN_EMAIL
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (!body.ownerId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 })
  try {
    const report = await startVoteCycle(admin, body.ownerId, { resend: true })
    return NextResponse.json(report)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
