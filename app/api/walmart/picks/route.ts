import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cartUrl } from '@/lib/walmart'
import { grantCartOffer } from '@/lib/cart-offer'

export const dynamic = 'force-dynamic'

/**
 * POST { lines: [{ itemId, qty }], weekStart? } → { url }
 * The family's texted Walmart links as one Walmart add-to-cart link (exact products, no product search needed).
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { lines?: Array<{ itemId?: unknown; qty?: unknown }>; weekStart?: unknown }
  const lines = (body.lines ?? [])
    .map((l) => ({ itemId: Math.trunc(Number(l.itemId)), qty: Math.min(20, Math.max(1, Math.round(Number(l.qty) || 1))) }))
    .filter((l) => Number.isSafeInteger(l.itemId) && l.itemId > 0)
    .slice(0, 50)
  if (!lines.length) return NextResponse.json({ error: 'No Walmart picks' }, { status: 400 })
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const ws = typeof body.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart) ? body.weekStart : null
    await admin.from('grocery_handoffs').insert({ user_id: user.id, store: 'Walmart picks', item_count: lines.length, week_start: ws })
    await grantCartOffer(user.id)
  } catch { /* logging never blocks the cart */ }
  return NextResponse.json({ url: cartUrl(lines) })
}
