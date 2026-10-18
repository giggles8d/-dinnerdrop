/**
 * Which store this week? Prices this week's list at each of the family's stores:
 * sale price when that store's flyer lists the item, otherwise the typical-price
 * estimate × that store's learned factor. Client-safe.
 */
import type { ListItem } from '@/lib/list'
import { matchSale, type SaleItem, type WeeklySales } from '@/lib/sales-shared'

export interface StorePref { name: string; factor?: number }   // settings.stores.myStores

const toNum = (q: string | number | null | undefined): number => {
  if (q == null) return 1
  if (typeof q === 'number') return q
  const t = String(q).trim()
  const m = t.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\/(\d+))?/)
  if (!m) return 1
  const v = (m[1] ? Number(m[1]) : 0) + (m[2] && m[3] ? Number(m[2]) / Number(m[3]) : 0)
  return v > 0 ? v : 1
}

/** Turn a flyer price ("$1.99/lb", "2 for $5", "$3.49", "$0.99 ea") into a cost for this list line. */
export function salePriceFor(item: Pick<ListItem, 'quantity' | 'unit'>, sale: SaleItem): number | null {
  const p = sale.price.replace(/,/g, '')
  const qty = toNum(item.quantity)
  const unit = (item.unit || '').toLowerCase()
  const perLb = p.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:\/|per)\s*lb/i)
  if (perLb) {
    const lbs = /lb|pound/.test(unit) ? qty : /oz/.test(unit) ? qty / 16 : 1.5   // a "package" of meat ≈ 1.5 lb
    return Number(perLb[1]) * lbs
  }
  const nFor = p.match(/(\d+)\s*for\s*\$?\s*(\d+(?:\.\d+)?)/i)
  if (nFor) return (Number(nFor[2]) / Number(nFor[1])) * Math.max(1, Math.round(qty))
  const each = p.match(/\$?\s*(\d+(?:\.\d+)?)/)
  if (each) return Number(each[1]) * (/(lb|oz|cup|tbsp|tsp)/.test(unit) ? 1 : Math.max(1, Math.round(qty)))
  return null
}

export interface StoreQuote { store: string; total: number; onSale: number; saleSavings: number; factor: number; coverage: number }

/**
 * Quote the shoppable list at each store.
 * `baseline` = typical-price estimate per line (est_price, or the plan share); `sets` = loaded flyers.
 */
export function quoteStores(items: ListItem[], baseline: (i: ListItem) => number, stores: StorePref[], sets: WeeklySales[], globalFactor: number): StoreQuote[] {
  const shoppable = items.filter((i) => !i.have && !i.checked)
  return stores.map((s) => {
    const mySets = sets.filter((x) => (x.store || '').toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))
    const factor = s.factor && s.factor > 0 ? s.factor : globalFactor
    let total = 0, onSale = 0, savings = 0, priced = 0
    for (const it of shoppable) {
      const base = baseline(it)
      if (base > 0) priced++
      const sale = mySets.length ? matchSale(it.name, mySets) : null
      const sp = sale ? salePriceFor(it, sale) : null
      if (sp != null) { onSale++; total += sp; savings += Math.max(0, base * factor - sp) }
      else total += base * factor
    }
    return { store: s.name, total: Math.round(total * 100) / 100, onSale, saleSavings: Math.round(savings * 100) / 100, factor, coverage: shoppable.length ? priced / shoppable.length : 0 }
  }).sort((a, b) => a.total - b.total)
}

/** Propose a two-store split: each line goes where it's cheaper (sale wins), ties to the primary store. */
export function proposeSplit(items: ListItem[], baseline: (i: ListItem) => number, a: StorePref, b: StorePref, sets: WeeklySales[], globalFactor: number): Record<string, string> {
  const out: Record<string, string> = {}
  const setsFor = (s: StorePref) => sets.filter((x) => (x.store || '').toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))
  const fA = a.factor && a.factor > 0 ? a.factor : globalFactor, fB = b.factor && b.factor > 0 ? b.factor : globalFactor
  const sA = setsFor(a), sB = setsFor(b)
  for (const it of items) {
    if (it.have || it.checked) continue
    const base = baseline(it)
    const saleA = sA.length ? matchSale(it.name, sA) : null, saleB = sB.length ? matchSale(it.name, sB) : null
    const pa = saleA ? (salePriceFor(it, saleA) ?? base * fA) : base * fA
    const pb = saleB ? (salePriceFor(it, saleB) ?? base * fB) : base * fB
    out[it.id] = pb < pa * 0.97 ? b.name : a.name
  }
  return out
}
