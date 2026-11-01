/**
 * Client-safe part of the sales feature: types + matching. No Anthropic import here —
 * lib/sales.ts (server) re-exports these and adds the Claude readers.
 */
import { normalizeItemName } from '@/lib/list'

export interface SaleItem {
  name: string          // "boneless chicken thighs"
  price: string         // "$1.99/lb", "2 for $5", "$3.49"
  unit?: string         // lb | each | pack | ...
  category?: string     // Produce | Meat & Seafood | Dairy & Eggs | Pantry & Dry Goods | Frozen | Bakery | Beverages
  brand?: string
  note?: string         // "with digital coupon", "family pack"
}

export interface WeeklySales {
  id: string
  user_id: string
  household_id: string | null
  store: string
  valid_from: string | null
  valid_to: string | null
  source: string
  items: SaleItem[]
  added_by: string | null
  created_at: string
}

/** A matched sale item plus where it's on sale and whether that ad hasn't started yet. */
export type SaleMatch = SaleItem & { store: string; upcoming: boolean }

/** Is this set next week's ad (its valid_from is after today)? */
export function isUpcoming(s: Pick<WeeklySales, 'valid_from'>, today = new Date().toISOString().slice(0, 10)): boolean {
  return !!s.valid_from && s.valid_from > today
}

/**
 * Do a list line and a sale item name mean the same thing? Both normalized.
 * Multi-word names may contain each other ("olive oil" ⊂ "olive oil, extra virgin"); a single word
 * only matches exactly or as the last word of a short name ("garlic" = "fresh garlic", not
 * "garlic bread" or "mio lemonade"); and "chicken thighs" = "boneless chicken thighs" (same last two words).
 */
export function namesMatch(n: string, k: string): boolean {
  if (!n || !k) return false
  if (n === k) return true
  const nw = n.split(' '), kw = k.split(' ')
  if (nw.length === 1 || kw.length === 1) {
    const [one, ow] = nw.length === 1 ? [n, kw] : [k, nw]
    return ow.length <= 3 && ow[ow.length - 1] === one
  }
  if (n.includes(k) || k.includes(n)) return true
  const a = nw.slice(-2).join(' '), b = kw.slice(-2).join(' ')
  return a.length > 5 && a === b
}

/** Match a grocery-list line to a sale item (for the "on sale" tag). Current ads win over next week's. */
export function matchSale(name: string, sets: WeeklySales[]): SaleMatch | null {
  const n = normalizeItemName(name)
  if (!n) return null
  const ordered = [...sets].sort((a, b) => Number(isUpcoming(a)) - Number(isUpcoming(b)))
  for (const s of ordered) for (const i of s.items) {
    const k = normalizeItemName(i.name)
    if (!k) continue
    if (namesMatch(n, k)) return { ...i, store: s.store, upcoming: isUpcoming(s) }
  }
  return null
}

/** Multi-buys and stock-up deals ("buy 2 get 2", "2 for $5", "10 for $10") worth buying extra of. */
export function isStockUpDeal(i: SaleItem): boolean {
  return /\b(buy\s*\d|b\d\s*g\d|\d+\s*for\s*\$|free|save\s*\$|must buy)/i.test(`${i.price} ${i.note ?? ''}`)
}
