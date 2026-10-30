import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getClientCredentialsToken, searchProducts, type KrogerProduct } from '@/lib/kroger'
import { toPackages } from '@/lib/package-match'
import type { GroceryItem } from '@/types'

export const dynamic = 'force-dynamic'

export interface KrogerMatch { name: string; want: string; quantity: number; product: KrogerProduct | null; alternatives: KrogerProduct[] }

/**
 * POST {groceryList, locationId?} → what Kroger would put in the cart for each line (best match + a few alternatives),
 * with the package count DinnerDrop recommends (1 1/2 lb chicken → 1 pack; 15 eggs → 2 cartons). Nothing is added yet.
 */
export async function POST(request: NextRequest) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { groceryList, locationId } = await request.json()
  const items = (Object.values(groceryList ?? {}).flat() as GroceryItem[]).filter((i) => i?.name)
  if (!items.length) return NextResponse.json({ matches: [] })
  const token = await getClientCredentialsToken()
  const loc = typeof locationId === 'string' && locationId ? locationId : undefined
  // Kroger allows ~10 req/s on the products API; run 6 at a time.
  const out: KrogerMatch[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      const it = items[i]
      const plan = toPackages({ name: it.name, quantity: it.quantity, unit: it.unit, searchTerm: it.searchTerm })
      const term = it.searchTerm || it.name
      let found = await searchProducts(term, token, { limit: 4, locationId: loc })
      if (!found.length && term !== it.name) found = await searchProducts(it.name, token, { limit: 4, locationId: loc })
      const quantity = plan.kind === 'lb' ? Math.max(1, Math.ceil(plan.count / 1.5)) : Math.max(1, Math.ceil(plan.count))
      out[i] = { name: it.name, want: `${it.quantity ?? ''} ${it.unit ?? ''}`.trim(), quantity, product: found[0] ?? null, alternatives: found.slice(1) }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return NextResponse.json({ matches: out })
}

/** GET ?q=term&locationId= → alternatives for one line ("Change" in the review). */
export async function GET(request: NextRequest) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ products: [] })
  const token = await getClientCredentialsToken()
  const products = await searchProducts(q, token, { limit: 8, locationId: request.nextUrl.searchParams.get('locationId') || undefined })
  return NextResponse.json({ products })
}
