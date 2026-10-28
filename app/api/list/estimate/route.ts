import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { estimatePrices } from '@/lib/prices'

/** POST { ids: string[] } → estimates est_price for those list lines and returns {prices: {id: number}}. */
export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ids } = await req.json().catch(() => ({ ids: [] })) as { ids?: string[] }
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ prices: {} })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  const { data: rows } = await admin.from('list_items').select('id, name, quantity, unit').eq('user_id', ownerId).in('id', ids.slice(0, 200)).is('est_price', null)
  if (!rows?.length) return NextResponse.json({ prices: {} })
  const prices = await estimatePrices(rows)
  const out: Record<string, number> = {}
  await Promise.all(rows.map(async (r, i) => {
    if (prices[i] > 0) { out[r.id] = prices[i]; await admin.from('list_items').update({ est_price: prices[i] }).eq('id', r.id) }
  }))
  return NextResponse.json({ prices: out })
}
