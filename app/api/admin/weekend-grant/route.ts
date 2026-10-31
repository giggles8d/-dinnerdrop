import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { grantWeekendOffer } from '@/lib/weekend-offer'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * POST { userId } — grant the weekend offer to a family that earned it before the offer code deployed
 * (same checks as the automatic grant: signed up in the window, one list sent, not already granted).
 * Auth: x-admin-secret = SETUP_SECRET, a one-shot token in app_kv.weekend_grant_token (deleted on use), or Sarah logged in.
 */
export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  let ok = false
  const secret = req.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) ok = true
  const once = req.headers.get('x-once-token')
  if (!ok && once) {
    const { data } = await admin.from('app_kv').select('value').eq('key', 'weekend_grant_token').maybeSingle()
    if (data?.value && (data.value as { token?: string }).token === once) {
      await admin.from('app_kv').delete().eq('key', 'weekend_grant_token')
      ok = true
    }
  }
  if (!ok) {
    const auth = createServerSupabaseClient()
    const { data: { user } } = await auth.auth.getUser()
    ok = user?.email === ADMIN_EMAIL
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { userId?: string }
  if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  try {
    const granted = await grantWeekendOffer(admin, body.userId)
    return NextResponse.json({ granted })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
