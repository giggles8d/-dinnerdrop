import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createInstacartLink } from '@/lib/instacart'
import type { GroceryCategory, GroceryItem } from '@/types'
import { grantCartOffer } from '@/lib/cart-offer'

export const dynamic = 'force-dynamic'

const CATEGORIES: GroceryCategory[] = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages']

/**
 * POST /api/deals/instacart { items: [{ name, quantity, unit?, category?, store?, price? }] }
 * A separate Instacart shopping list of just the specials the family picked on /deals — a second,
 * deals-only order that leaves this week's grocery list alone. Logged as a handoff ("Instacart · deals")
 * so the deals→order ratio shows in the Monday report; no recipe email, no staple stocking.
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { items?: Array<{ name?: string; quantity?: number | string; unit?: string; category?: string; store?: string; price?: string }> }
  const raw = Array.isArray(body.items) ? body.items.slice(0, 40) : []
  const items: GroceryItem[] = raw
    .filter((i) => i && typeof i.name === 'string' && i.name.trim())
    .map((i) => ({
      name: String(i.name).trim().slice(0, 80),
      quantity: String(Number(i.quantity) > 0 ? Number(i.quantity) : 1),
      unit: i.unit && /^(each|lb|oz|pack|bag|box|can|jar|bottle|dozen|gallon)$/i.test(i.unit) ? i.unit.toLowerCase() : 'each',
      category: CATEGORIES.includes(i.category as GroceryCategory) ? (i.category as GroceryCategory) : 'Pantry & Dry Goods',
      searchTerm: String(i.name).trim().slice(0, 80),
    }))
  if (!items.length) return NextResponse.json({ error: 'Pick at least one deal.' }, { status: 400 })
  const stores = Array.from(new Set(raw.map((i) => i.store).filter((s): s is string => !!s)))
  const title = stores.length === 1 ? `DinnerDrop — ${stores[0]} specials` : 'DinnerDrop — this week’s specials'
  const result = await createInstacartLink(items, title)
  if (result.link && !result.fallback) {
    try {
      await supabase.from('grocery_handoffs').insert({ user_id: user.id, store: 'Instacart · deals', item_count: items.length, est_total: null, week_start: null })
      await grantCartOffer(user.id)
    } catch (e) { console.error('[deals/instacart] handoff log failed', e) }
  }
  return NextResponse.json(result)
}
