import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cartUrl, matchList, walmartConfigured } from '@/lib/walmart'
import { sendWeekRecipes } from '@/lib/recipe-email'
import { stockStaplesFromList } from '@/lib/pantry'
import type { GroceryItem } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Walmart handoff, in two steps (the eMeals pattern: match → review → one tap):
 *  POST { groceryList }                      → matches for every open line (product, qty, alternatives)
 *  POST { confirm: true, lines, weekStart, estTotal } → the add-to-cart link; logs the handoff
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!walmartConfigured()) return NextResponse.json({ error: 'Walmart is not set up yet' }, { status: 503 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await request.json().catch(() => ({})) as {
    groceryList?: Record<string, GroceryItem[]>
    confirm?: boolean
    lines?: Array<{ itemId: number; qty: number }>
    weekStart?: string
    estTotal?: number
    itemCount?: number
  }

  if (body.confirm) {
    const lines = (body.lines ?? []).filter((l) => Number(l.itemId) > 0 && Number(l.qty) > 0).map((l) => ({ itemId: Number(l.itemId), qty: Math.min(Math.round(Number(l.qty)), 20) }))
    if (!lines.length) return NextResponse.json({ error: 'Nothing to add' }, { status: 400 })
    const link = cartUrl(lines)
    try {
      await admin.from('grocery_handoffs').insert({
        user_id: user.id,
        store: 'Walmart',
        item_count: Number(body.itemCount) || lines.length,
        est_total: Number(body.estTotal) > 0 ? Number(body.estTotal) : null,
        week_start: typeof body.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart) ? body.weekStart : null,
      })
      await stockStaplesFromList(admin, user.id, typeof body.weekStart === 'string' ? body.weekStart : null).catch((e) => console.error('[walmart] staple stock failed:', e))
      await sendWeekRecipes(admin, user.id).catch((e) => console.error('[walmart] recipe email failed:', e))
    } catch (e) {
      console.error('[walmart] handoff log failed:', e)
    }
    return NextResponse.json({ link })
  }

  const items = Object.values(body.groceryList ?? {}).flat() as GroceryItem[]
  if (!items.length) return NextResponse.json({ error: 'Grocery list is empty' }, { status: 400 })
  try {
    const matches = await matchList(admin, items.slice(0, 60))
    const total = matches.reduce((s, m) => s + (m.product?.price ? m.product.price * m.qty : 0), 0)
    return NextResponse.json({ matches, estTotal: Math.round(total * 100) / 100, unmatched: matches.filter((m) => !m.product).length })
  } catch (e) {
    console.error('[walmart] match failed:', e)
    return NextResponse.json({ error: 'Could not match your list to Walmart products right now.' }, { status: 500 })
  }
}
