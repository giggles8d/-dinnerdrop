// Shared store deals: one weekly-ad set per store per ad week, read by the scheduled ad
// reader (or a family's snapped flyer promoted to shared). Families who list the store in
// Settings → Stores get them on top of their own flyers (lib/sales.ts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeItemName } from '@/lib/list'
import type { SaleItem, WeeklySales } from '@/lib/sales-shared'

export interface StoreDeals {
  id: string
  store: string
  region: string
  valid_from: string | null
  valid_to: string | null
  source: string
  items: SaleItem[]
  pages: number
  created_at: string
  updated_at: string
}

/** Store names as families type them → the canonical ad name. */
export function canonicalStore(name: string): string {
  const n = name.trim().toLowerCase()
  const map: Array<[RegExp, string]> = [
    [/^tops/, 'Tops'], [/^wegman/, 'Wegmans'], [/^aldi/, 'Aldi'], [/^walmart|^wal-mart/, 'Walmart'],
    [/^price chopper|^market 32/, 'Price Chopper'], [/^weis/, 'Weis'], [/^publix/, 'Publix'],
    [/^kroger|^smith|^fred meyer|^king soopers|^ralphs|^fry'?s|^dillons|^harris teeter/, 'Kroger'],
    [/^family fare/, 'Family Fare'], [/^costco/, 'Costco'], [/^sam'?s/, "Sam's Club"], [/^target/, 'Target'],
    [/^giant eagle/, 'Giant Eagle'], [/^giant/, 'Giant'], [/^shoprite/, 'ShopRite'], [/^stop ?& ?shop/, 'Stop & Shop'],
    [/^meijer/, 'Meijer'], [/^heb|^h-e-b/, 'H-E-B'], [/^safeway/, 'Safeway'], [/^albertsons/, 'Albertsons'], [/^food lion/, 'Food Lion'],
  ]
  for (const [re, canon] of map) if (re.test(n)) return canon
  return name.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function dedupe(items: SaleItem[]): SaleItem[] {
  const seen = new Set<string>(); const out: SaleItem[] = []
  for (const i of items) { const k = normalizeItemName(i.name); if (!k || seen.has(k)) continue; seen.add(k); out.push(i) }
  return out.slice(0, 200)
}

/**
 * Save (or merge into) the shared set for a store's ad week. Pages of the same ad posted
 * separately merge by (store, region, valid_from). No valid_from → keyed on today's week start.
 */
export async function saveStoreDeals(admin: SupabaseClient, p: { store: string; region?: string; validFrom?: string; validTo?: string; source?: string; items: SaleItem[]; pages?: number }) {
  const store = canonicalStore(p.store)
  const region = (p.region || 'US').trim()
  const validFrom = p.validFrom || new Date().toISOString().slice(0, 10)
  const { data: prior } = await admin.from('store_deals').select('id, items, pages').ilike('store', store).eq('region', region).eq('valid_from', validFrom).maybeSingle()
  if (prior) {
    const items = dedupe([...(prior.items as SaleItem[]), ...p.items])
    await admin.from('store_deals').update({ items, pages: (prior.pages ?? 0) + (p.pages ?? 1), valid_to: p.validTo || null, source: p.source ?? 'ad', updated_at: new Date().toISOString() }).eq('id', prior.id)
    return { id: prior.id as string, store, items: items.length, merged: true }
  }
  const { data, error } = await admin.from('store_deals').insert({ store, region, valid_from: validFrom, valid_to: p.validTo || null, source: p.source ?? 'ad', items: dedupe(p.items), pages: p.pages ?? 1 }).select('id').single()
  if (error) throw error
  return { id: data!.id as string, store, items: p.items.length, merged: false }
}

/**
 * Shared sets for the stores a family lists: the current ad week (valid today, or undated
 * and under 8 days old) and, when `includeNext`, the next week's preview (valid_from after today).
 */
export async function storeDealsFor(admin: SupabaseClient, stores: string[], opts: { includeNext?: boolean; region?: string } = {}): Promise<{ current: StoreDeals[]; next: StoreDeals[] }> {
  const names = Array.from(new Set(stores.map(canonicalStore).filter(Boolean)))
  if (!names.length) return { current: [], next: [] }
  const today = new Date().toISOString().slice(0, 10)
  const since = new Date(Date.now() - 14 * 86400000).toISOString()
  const { data } = await admin.from('store_deals').select('*').in('store', names).gte('updated_at', since).order('valid_from', { ascending: false }).limit(60)
  const rows = ((data ?? []) as StoreDeals[]).filter((r) => r.region === 'US' || !opts.region || r.region === opts.region)
  const current: StoreDeals[] = []; const next: StoreDeals[] = []
  const seenCur = new Set<string>(); const seenNext = new Set<string>()
  for (const r of rows) {
    const key = r.store.toLowerCase()
    const starts = r.valid_from ?? today
    const ends = r.valid_to ?? ''
    if (starts > today) { if (opts.includeNext && !seenNext.has(key)) { seenNext.add(key); next.push(r) }; continue }
    if (ends && ends < today) continue
    if (!seenCur.has(key)) { seenCur.add(key); current.push(r) }
  }
  return { current, next }
}

/** Present a shared set in the shape the planner and the list already understand. */
export function asWeeklySales(d: StoreDeals, userId = ''): WeeklySales {
  return { id: `shared:${d.id}`, user_id: userId, household_id: null, store: d.store, valid_from: d.valid_from, valid_to: d.valid_to, source: `shared-${d.source}`, items: d.items, added_by: null, created_at: d.created_at }
}
