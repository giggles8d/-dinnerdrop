import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST — reads the dd_ref cookie (set by middleware from ?ref=CODE) and, for a
 * profile with no referrer yet, records who sent them. Called once from the
 * dashboard after signup. Credits are granted by the daily cron when the new
 * family's first Family payment goes through.
 */
export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const code = req.cookies.get('dd_ref')?.value?.toUpperCase()
  const res = NextResponse.json({ attached: false })
  if (!code) return res

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: me } = await admin.from('profiles').select('id, referred_by, created_at').eq('id', user.id).single()
  if (!me || me.referred_by) { res.cookies.delete('dd_ref'); return res }
  // Only brand-new accounts (first 7 days) can be attributed.
  if (Date.now() - new Date(me.created_at).getTime() > 7 * 86400000) { res.cookies.delete('dd_ref'); return res }
  const { data: referrer } = await admin.from('profiles').select('id').eq('referral_code', code).single()
  if (!referrer || referrer.id === user.id) { res.cookies.delete('dd_ref'); return res }

  await admin.from('profiles').update({ referred_by: referrer.id }).eq('id', user.id)
  await admin.from('referrals').upsert({ referrer_id: referrer.id, referred_id: user.id, status: 'pending' }, { onConflict: 'referred_id' })
  const out = NextResponse.json({ attached: true })
  out.cookies.delete('dd_ref')
  return out
}
