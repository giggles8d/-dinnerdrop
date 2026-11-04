/**
 * "My products" — a family's standing product choices (Nov 4 2026: a family asked that whenever a recipe calls
 * for cream of chicken or cream of mushroom soup, they get Great Value gluten-free cream of chicken soup, and
 * that store brands win over name brands).
 *
 * Stored on the planner's settings (`settings.food.productPrefs`, `settings.food.storeBrands`), so no schema change.
 *  - productPrefs: "when a recipe needs <when> → buy <buy>". Applied to the list when it's built (so the family
 *    sees their product) and again on every store send (Walmart, Instacart, Kroger), so lines typed or texted
 *    later are covered too.
 *  - storeBrands: when a store search returns its own brand, it wins (Walmart, Kroger). Instacart picks the
 *    store at checkout, so it only gets the product swaps.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProductPref { when: string; buy: string }

/** The family's product choices, from the planner's settings (best-effort: none on any error). */
export async function loadProductPrefs(db: SupabaseClient, userId: string): Promise<{ prefs: ProductPref[]; storeBrands: boolean }> {
  try {
    const { data } = await db.from('profiles').select('settings').eq('id', userId).maybeSingle()
    const food = (data?.settings as { food?: { productPrefs?: unknown; storeBrands?: unknown } } | null)?.food
    return { prefs: cleanPrefs(food?.productPrefs), storeBrands: food?.storeBrands === true }
  } catch {
    return { prefs: [], storeBrands: false }
  }
}

export const MAX_PRODUCT_PREFS = 30

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const singular = (w: string) => (w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w)
const words = (s: string) => norm(s).split(' ').filter(Boolean).map(singular)

/** The phrases a pref matches: "cream of chicken, cream of mushroom" / "cream of chicken or cream of mushroom". */
export function whenPhrases(when: string): string[] {
  return String(when ?? '').split(/,|;|\/|\bor\b|\n/i).map((p) => norm(p)).filter((p) => p.length >= 2)
}

/** Clean what's stored (drops empties, trims, caps the count and lengths). */
export function cleanPrefs(raw: unknown): ProductPref[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((p) => ({ when: String((p as ProductPref)?.when ?? '').trim().slice(0, 120), buy: String((p as ProductPref)?.buy ?? '').trim().slice(0, 120) }))
    .filter((p) => p.buy && whenPhrases(p.when).length)
    .slice(0, MAX_PRODUCT_PREFS)
}

/** Every word of a phrase appears in the item name, in order ("cream of chicken soup", "condensed cream of chicken"). */
function phraseHits(itemWords: string[], phrase: string): boolean {
  const pw = words(phrase)
  if (!pw.length) return false
  let i = 0
  for (const w of itemWords) if (w === pw[i]) i++
  return i === pw.length
}

/** The pref that covers this line, if any. A line that already is the chosen product counts as covered. */
export function prefFor(name: string, prefs: ProductPref[]): ProductPref | null {
  if (!name || !prefs.length) return null
  const iw = words(name)
  const n = norm(name)
  for (const p of prefs) {
    if (norm(p.buy) === n) return p
    if (whenPhrases(p.when).some((ph) => phraseHits(iw, ph))) return p
  }
  return null
}

interface Line { name: string; searchTerm?: string | null }

/** Swap the search (and, for list rows, the name) to the family's product. Returns new objects; others untouched. */
export function applyPrefsToItems<T extends Line>(items: T[], prefs: ProductPref[], opts: { rename?: boolean } = {}): T[] {
  if (!prefs.length) return items
  return items.map((it) => {
    const p = prefFor(it.name, prefs)
    if (!p) return it
    return { ...it, ...(opts.rename ? { name: p.buy } : {}), searchTerm: p.buy }
  })
}

/** Same, for stored list rows (search_term column). */
export function applyPrefsToRows<T extends { name: string; search_term: string | null }>(rows: T[], prefs: ProductPref[]): T[] {
  if (!prefs.length) return rows
  return rows.map((r) => {
    const p = prefFor(r.name, prefs)
    return p ? { ...r, name: p.buy, search_term: p.buy } : r
  })
}

/** Store brands, by store. Used to lift the store's own product to the top of a search. */
const STORE_BRANDS = {
  walmart: /^(great value|marketside|freshness guaranteed|sam'?s choice|equate|parent'?s choice|bettergoods|mainstays)\b/i,
  kroger: /^(kroger|simple truth|private selection|heritage farm|home chef|comforts)\b/i,
}

export function isStoreBrand(store: keyof typeof STORE_BRANDS, productName: string, brand?: string | null): boolean {
  const re = STORE_BRANDS[store]
  return re.test(String(brand ?? '').trim()) || re.test(String(productName ?? '').trim())
}

/** Share of the search's words found in a product name (brand words don't count against it). */
function overlap(search: string, productName: string): number {
  const sw = words(search).filter((w) => w.length > 2 && !/^\d/.test(w))
  if (!sw.length) return 0
  const pw = new Set(words(productName))
  return sw.filter((w) => pw.has(w)).length / sw.length
}

/**
 * Stable re-order: a store-brand product moves to the top only when it matches the search at least as well as
 * the matcher's first pick (so "chicken breast" never becomes Great Value chicken nuggets).
 */
export function storeBrandFirst<P>(store: keyof typeof STORE_BRANDS, search: string, products: P[], nameOf: (p: P) => string, brandOf?: (p: P) => string | undefined): P[] {
  if (products.length < 2 || isStoreBrand(store, nameOf(products[0]), brandOf?.(products[0]))) return products
  const bar = overlap(search, nameOf(products[0]))
  const own = products.filter((p) => isStoreBrand(store, nameOf(p), brandOf?.(p)) && overlap(search, nameOf(p)) >= bar)
  if (!own.length) return products
  return [...own, ...products.filter((p) => !own.includes(p))]
}
