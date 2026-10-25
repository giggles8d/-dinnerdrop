import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'

export const dynamic = 'force-dynamic'

/** GET — past orders (receipts with their lines) and a per-item "where you've bought it" index. */
export async function GET() {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  const { data: receipts } = await admin.from('receipts').select('id, created_at, store, ordered_on, total, item_count, items, summary').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(24)
  const { data: purchases } = await admin.from('item_purchases').select('name, name_key, store, bought_on, price, status, replaced_with').eq('user_id', ownerId).order('bought_on', { ascending: false }).limit(2000)
  // Group by item: how many times, last bought where/when, cheapest store seen.
  type Group = { name: string; times: number; last: { store: string | null; on: string | null; price: number | null }; cheapest: { store: string | null; price: number } | null; stores: Record<string, number> }
  const byItem = new Map<string, Group>()
  for (const p of purchases ?? []) {
    const g: Group = byItem.get(p.name_key) ?? { name: p.name, times: 0, last: { store: p.store, on: p.bought_on, price: p.price }, cheapest: null, stores: {} }
    g.times++
    if (p.store) g.stores[p.store] = (g.stores[p.store] ?? 0) + 1
    if (p.price != null && p.status !== 'refunded' && p.store && (!g.cheapest || Number(p.price) < g.cheapest.price)) g.cheapest = { store: p.store, price: Number(p.price) }
    byItem.set(p.name_key, g)
  }
  const items = Array.from(byItem.values()).sort((a, b) => b.times - a.times || a.name.localeCompare(b.name)).slice(0, 300)
  return NextResponse.json({ receipts: receipts ?? [], items })
}
