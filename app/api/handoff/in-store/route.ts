import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { IN_STORE } from '@/lib/list-link'

export const dynamic = 'force-dynamic'

/**
 * "Done shopping?" on the grocery list (Sarah, Nov 25 2026, Action 1): a family who shopped in store from the list
 * (ticked off most of it) and never pressed a send button gets this week's in-store send recorded, the same
 * grocery_handoffs row (store 'In store') as "Text me this list", without sending anything.
 *   POST   { itemCount, estTotal?, weekStart } → { ok, id } (or { ok, duplicate } if this week already has a send)
 *   DELETE { id } → Undo: removes that row, only the caller's own and only within 15 minutes.
 */
function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function userId(): Promise<string | null> {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  return user?.id ?? null
}

export async function POST(request: Request) {
  const uid = await userId()
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json().catch(() => ({})) as { itemCount?: unknown; estTotal?: unknown; weekStart?: unknown }
  const weekStart = typeof b.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.weekStart) ? b.weekStart : null
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  const db = admin()
  // One send per week is enough: if they already sent this week (any store), record nothing.
  const { count } = await db.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', uid)
    .or(`week_start.eq.${weekStart},created_at.gte."${weekStart}T00:00:00Z"`)
  if (count) return NextResponse.json({ ok: true, duplicate: true })
  const { data, error } = await db.from('grocery_handoffs').insert({
    user_id: uid,
    store: IN_STORE,
    item_count: Math.max(0, Math.round(Number(b.itemCount) || 0)) || null,
    est_total: Number(b.estTotal) > 0 ? Math.round(Number(b.estTotal) * 100) / 100 : null,
    week_start: weekStart,
    // The day-after "How did your grocery order go?" email is written for online orders (lib/order-followup).
    followup_sent_at: new Date().toISOString(),
  }).select('id').single()
  if (error) return NextResponse.json({ error: 'Could not save that.' }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(request: Request) {
  const uid = await userId()
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json().catch(() => ({})) as { id?: unknown }
  if (typeof b.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
  const since = new Date(Date.now() - 15 * 60_000).toISOString()
  const { error } = await admin().from('grocery_handoffs').delete().eq('id', b.id).eq('user_id', uid).eq('store', IN_STORE).gte('created_at', since)
  if (error) return NextResponse.json({ error: 'Could not undo.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
