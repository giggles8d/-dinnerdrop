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

/** Match a grocery-list line to a sale item (for the "on sale" tag). */
export function matchSale(name: string, sets: WeeklySales[]): SaleItem | null {
  const n = normalizeItemName(name)
  if (!n) return null
  for (const s of sets) for (const i of s.items) {
    const k = normalizeItemName(i.name)
    if (!k) continue
    if (n === k || n.includes(k) || k.includes(n)) return i
    // "chicken thighs" vs "boneless chicken thighs": share the last two words
    const a = n.split(' ').slice(-2).join(' '), b = k.split(' ').slice(-2).join(' ')
    if (a.length > 5 && a === b) return i
  }
  return null
}
