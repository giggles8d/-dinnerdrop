import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { currentSales } from '@/lib/sales'
import { normalizeItemName } from '@/lib/list'
import { mergeSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages']

/**
 * GET  /api/deals  → { sets, stores, listNames, weekStart } — every sales set that applies to the family
 *                    (own flyers + DinnerDrop's shared ads for their stores, this week and next),
 *                    the stores they list, and what's already on this week's grocery list.
 * POST /api/deals  → { name, price?, unit?, category?, store?, quantity? } adds a deal to the grocery list
 *                    (as an "extra", the same as adding from the rest-of-shop picker).
 */
export async function GET() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  const [sets, { data: prof }, ws] = await Promise.all([
    currentSales(admin, ownerId, { includeNext: true }),
    admin.from('profiles').select('settings').eq('id', ownerId).maybeSingle(),
    latestWeekStart(admin, ownerId),
  ])
  const settings = mergeSettings(prof?.settings)
  let listNames: string[] = []
  let planNames: string[] = []
  if (ws) {
    const [{ data }, { data: plan }] = await Promise.all([
      admin.from('list_items').select('name').eq('user_id', ownerId).eq('week_start', ws).is('ordered_at', null),
      admin.from('meal_plans').select('meals').eq('user_id', ownerId).eq('week_start', ws).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    listNames = (data ?? []).map((r) => normalizeItemName(r.name)).filter(Boolean)
    // Every ingredient in this week's dinners (ordered or not) — "For my dinners" on /deals matches against these.
    const meals = Array.isArray(plan?.meals) ? (plan!.meals as Array<{ ingredients?: Array<{ name?: string }> }>) : []
    planNames = Array.from(new Set(meals.flatMap((m) => (m.ingredients ?? []).map((i) => normalizeItemName(String(i.name ?? '')))).filter(Boolean)))
  }
  return NextResponse.json({ sets, stores: settings.stores.myStores.map((s) => s.name), useSales: settings.food.useSales, stockUp: settings.deals.stockUp, listNames, planNames, weekStart: ws })
}

export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { name?: string; price?: string; unit?: string; category?: string; store?: string; quantity?: string | number }
  const name = String(body.name ?? '').trim().slice(0, 80)
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId, householdId } = await resolvePlanOwner(admin, user.id)
  const ws = await latestWeekStart(admin, ownerId)
  if (!ws) return NextResponse.json({ error: 'No grocery list yet — build this week first.' }, { status: 409 })
  const norm = normalizeItemName(name)
  const { data: existing } = await admin.from('list_items').select('id, name, quantity, have').eq('user_id', ownerId).eq('week_start', ws).is('ordered_at', null)
  const dup = (existing ?? []).find((r) => normalizeItemName(r.name) === norm)
  const quantity = String(Number(body.quantity) > 0 ? Number(body.quantity) : 1)
  if (dup) {
    await admin.from('list_items').update({ quantity, have: false }).eq('id', dup.id)
    return NextResponse.json({ ok: true, id: dup.id, updated: true })
  }
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : 'Pantry & Dry Goods'
  const unit = body.unit && /^(each|lb|oz|pack|bag|box|can|jar|bottle|dozen|gallon|count)$/i.test(body.unit) ? body.unit.toLowerCase() : null
  const { data, error } = await admin.from('list_items').insert({
    user_id: ownerId, household_id: householdId, week_start: ws, name, quantity, unit, category,
    search_term: name, source: 'extra', added_by: body.store ? `${body.store} deal` : 'deal',
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data!.id })
}

async function latestWeekStart(admin: SupabaseClient, ownerId: string): Promise<string | null> {
  const { data } = await admin.from('meal_plans').select('week_start').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data?.week_start as string | undefined) ?? null
}
