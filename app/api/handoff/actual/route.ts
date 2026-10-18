import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { mergeSettings } from '@/lib/settings'
import { blendFactor } from '@/lib/prices'

/**
 * POST { total: number } — what the store actually charged for the most recent handoff.
 * Stores it on the handoff and updates settings.stores.priceFactor so future estimates
 * (and the planner's budget target) reflect this family's real store + fees.
 */
export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { total } = await req.json().catch(() => ({})) as { total?: number }
  const actual = Number(total)
  if (!Number.isFinite(actual) || actual <= 0) return NextResponse.json({ error: 'total required' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  const { data: h } = await admin.from('grocery_handoffs').select('id, est_total, created_at').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).single()
  if (!h) return NextResponse.json({ error: 'No recent order to attach this to.' }, { status: 404 })
  await admin.from('grocery_handoffs').update({ actual_total: actual }).eq('id', h.id)
  let factor: number | null = null
  if (h.est_total && Number(h.est_total) > 0) {
    const { data: prof } = await admin.from('profiles').select('settings').eq('id', ownerId).single()
    const settings = mergeSettings(prof?.settings)
    factor = blendFactor(settings.stores.priceFactor, actual / Number(h.est_total))
    await admin.from('profiles').update({ settings: { ...(prof?.settings as object ?? {}), stores: { ...settings.stores, priceFactor: factor } } }).eq('id', ownerId)
  }
  return NextResponse.json({ ok: true, factor })
}
