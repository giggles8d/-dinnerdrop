import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redeemPromo, PROMO_COOKIE } from '@/lib/promo'

/**
 * POST { code? } — redeem a promo code for the signed-in family. Falls back to the
 * dd_promo cookie (set by middleware from ?code=XXX) so a code picked up on /start
 * is applied automatically on the first dashboard load. One code per account.
 */
export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { code?: string }
  const code = (body.code || req.cookies.get(PROMO_COOKIE)?.value || '').trim().toUpperCase()
  if (!code) return NextResponse.json({ ok: false, reason: 'invalid' })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const result = await redeemPromo(admin, user.id, code)
  const res = NextResponse.json(result)
  res.cookies.delete(PROMO_COOKIE)   // whatever happened, don't retry on every load
  return res
}
