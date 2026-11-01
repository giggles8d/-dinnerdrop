// Walmart: match the grocery list to real Walmart products and build a one-tap add-to-cart link.
//
// Affiliate API (walmart.io): RSA-SHA256 signed headers over "consumerId\ntimestamp\nkeyVersion\n".
// Product search is cached in app_kv (key "wm:<term>") for a week — a family's list is ~30 searches.
// Cart link: https://affil.walmart.com/cart/addToCart?items=ITEMID|QTY,ITEMID|QTY — wrapped with the
// Impact tracking link when WALMART_IMPACT_ID is set (so the ~1% affiliate commission posts).
import { createSign } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { toPackages, type PackagePlan } from '@/lib/package-match'
import { parseQuantity } from '@/lib/portions'
import type { GroceryItem } from '@/types'

const API = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2'
const CACHE_DAYS = 7

export interface WalmartProduct {
  itemId: number
  name: string
  price: number | null
  image: string | null
  url: string | null
  sizeOz: number | null      // parsed from the name ("…, 8 oz", "2 lb bag", "64 fl oz")
  sizeCt: number | null      // "12 ct", "18 count"
  inStock: boolean
}

export interface WalmartMatch {
  /** The grocery line as the family wrote it. */
  line: { name: string; quantity: string; unit: string; category: string }
  /** What we searched for and how much we need (from the recipe amount). */
  plan: { search: string; count: number; kind: PackagePlan['kind']; label: string }
  /** Best product, or null when nothing matched. */
  product: WalmartProduct | null
  /** How many of that product go in the cart. */
  qty: number
  /** Other candidates the family can swap to. */
  alternatives: WalmartProduct[]
}

export function walmartConfigured(): boolean {
  return !!(process.env.WALMART_CONSUMER_ID && process.env.WALMART_PRIVATE_KEY_B64)
}

function signedHeaders(): Record<string, string> {
  const consumerId = process.env.WALMART_CONSUMER_ID!
  const keyVersion = process.env.WALMART_KEY_VERSION || '1'
  const ts = String(Date.now())
  const pem = Buffer.from(process.env.WALMART_PRIVATE_KEY_B64!, 'base64').toString('utf8')
  const signer = createSign('RSA-SHA256')
  signer.update(`${consumerId}\n${ts}\n${keyVersion}\n`)
  const sig = signer.sign(pem, 'base64')
  return { 'WM_CONSUMER.ID': consumerId, 'WM_CONSUMER.INTIMESTAMP': ts, 'WM_SEC.KEY_VERSION': keyVersion, 'WM_SEC.AUTH_SIGNATURE': sig, Accept: 'application/json' }
}

/** "…, 8 oz" / "16 fl oz" / "2 lb bag" / "5 lbs" → ounces; "12 ct" / "18 count" → count. */
export function parseSize(name: string): { oz: number | null; ct: number | null } {
  const n = name.toLowerCase()
  let oz: number | null = null
  // Ranges ("0.65 - 1.8 lb") are meat trays: use the middle of the range.
  const lb = n.match(/(\d+(?:\.\d+)?)\s*(?:lbs?\.?\s*)?(?:-\s*(\d+(?:\.\d+)?)\s*)?(?:lb|lbs|pound|pounds)\b/)
  const ozm = n.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?(?:oz|ounce|ounces)\b/)
  if (lb) oz = (lb[2] ? (Number(lb[1]) + Number(lb[2])) / 2 : Number(lb[1])) * 16
  else if (ozm) oz = Number(ozm[1])
  const ctm = n.match(/(\d+)\s*(?:ct|count|pk|pack|pieces)\b/)
  const ct = ctm ? Number(ctm[1]) : null
  return { oz, ct }
}

function toProduct(raw: Record<string, unknown>): WalmartProduct | null {
  const itemId = Number(raw.itemId)
  const name = String(raw.name ?? '')
  if (!itemId || !name) return null
  const { oz, ct } = parseSize(name)
  const price = raw.salePrice != null ? Number(raw.salePrice) : raw.msrp != null ? Number(raw.msrp) : null
  return {
    itemId,
    name,
    price: Number.isFinite(price as number) ? (price as number) : null,
    image: typeof raw.thumbnailImage === 'string' ? raw.thumbnailImage : typeof raw.mediumImage === 'string' ? raw.mediumImage : null,
    url: typeof raw.productTrackingUrl === 'string' ? raw.productTrackingUrl : typeof raw.productUrl === 'string' ? raw.productUrl : null,
    sizeOz: oz,
    sizeCt: ct,
    inStock: raw.stock == null || String(raw.stock).toLowerCase() === 'available',
  }
}

/** Search Walmart (cached). Empty array on any failure — the caller shows "no match" and moves on. */
export async function searchWalmart(admin: SupabaseClient, term: string, num = 8): Promise<WalmartProduct[]> {
  const key = `wm:${term.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100)}`
  try {
    const { data } = await admin.from('app_kv').select('value, updated_at').eq('key', key).maybeSingle()
    if (data?.value && data.updated_at && Date.now() - new Date(data.updated_at).getTime() < CACHE_DAYS * 86400000) {
      return (data.value as { items: WalmartProduct[] }).items ?? []
    }
  } catch { /* cache miss */ }
  if (!walmartConfigured()) return []
  try {
    const url = `${API}/search?query=${encodeURIComponent(term)}&numItems=${num}`
    const r = await fetch(url, { headers: signedHeaders(), cache: 'no-store' })
    if (!r.ok) { console.error('[walmart] search', r.status, term); return [] }
    const j = await r.json() as { items?: Record<string, unknown>[] }
    const items = (j.items ?? []).map(toProduct).filter((p): p is WalmartProduct => !!p)
    try { await admin.from('app_kv').upsert({ key, value: { items }, updated_at: new Date().toISOString() }) } catch { /* ignore */ }
    return items
  } catch (e) {
    console.error('[walmart] search failed', term, e)
    return []
  }
}

const STOP = new Set(['and', 'or', 'the', 'of', 'with', 'fresh', 'large', 'medium', 'small', 'whole', 'low', 'sodium', 'oz', 'lb', 'ct', 'pack', 'package', 'bag', 'can', 'jar', 'bottle', 'carton'])
function words(s: string): string[] { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/s$/, '')) }

const PACK_WORDS = /\b(bag|lb|lbs|pound|bunch)\b/i
const PROCESSED = /\b(seasoned|marinated|strips?|tips?|thin|milanesa|philly|stir[- ]fry|kabob|cubes?|ground|patties|jerky|breaded|frozen)\b/i
/** Rank: every search word present > few extra words > in stock > sized > cheaper. Loose produce for "each" lines. */
function rank(search: string, items: WalmartProduct[], kind: PackagePlan['kind']): WalmartProduct[] {
  const ws = words(search)
  const score = (p: WalmartProduct, i: number) => {
    const pw = words(p.name)
    const set = new Set(pw)
    const hit = ws.filter((w) => set.has(w)).length / Math.max(1, ws.length)
    const extra = pw.filter((w) => !ws.includes(w)).length   // "seasoned philly" when we asked for sirloin steak
    let s = hit * 10 - Math.min(extra, 6) * 0.6 + (p.inStock ? 2 : 0) + (p.sizeOz || p.sizeCt ? 0.5 : 0) - (p.price ?? 20) / 50
    if (kind === 'each') s += p.sizeCt ? 1.5 : PACK_WORDS.test(p.name) ? -1.5 : 1   // loose or "3 ct" over a 3 lb bag
    if (kind === 'lb' && PROCESSED.test(p.name) && !PROCESSED.test(search)) s -= 3   // plain cut, not "seasoned philly strips"
    s -= i * 0.25   // Walmart's own relevance order breaks ties
    return s
  }
  return items.map((p, i) => ({ p, s: score(p, i) })).sort((a, b) => b.s - a.s).map((x) => x.p)
}

const PACKAGE_UNIT = /^(bag|box|pack|package|jar|can|bottle|carton|container|tub|loaf|case|\d+-pack|dozen)s?$/i
/** How many of this product cover the recipe amount. `raw` is the line as written (for "2 jars", "14 tortillas"). */
export function quantityFor(plan: PackagePlan, product: WalmartProduct, raw?: { n: number; unit: string }): number {
  const wantOz = parseSize(plan.search).oz
  if (plan.kind === 'lb') {
    const needOz = plan.count * 16
    return product.sizeOz ? Math.max(1, Math.ceil(needOz / product.sizeOz - 1e-9)) : Math.max(1, Math.ceil(plan.count))
  }
  if (plan.kind === 'each') {
    if (product.sizeCt) return Math.max(1, Math.ceil(plan.count / product.sizeCt - 1e-9))   // "3 ct" romaine hearts
    if (product.sizeOz && product.sizeOz >= 16) return Math.max(1, Math.ceil(plan.count / 4 - 1e-9))   // a bag covers several
    return Math.max(1, Math.ceil(plan.count))
  }
  // package
  if (raw && PACKAGE_UNIT.test(raw.unit) && raw.n > 1) {
    // "2 jars salsa", "2 12-packs": the family said how many packages they want
    if (/^\d+-pack$/i.test(raw.unit) && product.sizeCt) return Math.max(1, Math.ceil((raw.n * parseInt(raw.unit, 10)) / product.sizeCt - 1e-9))
    return Math.max(1, Math.ceil(raw.n))
  }
  if (raw && product.sizeCt && /^(count|ct|each|whole|)$/i.test(raw.unit) && raw.n > 1) return Math.max(1, Math.ceil(raw.n / product.sizeCt - 1e-9))   // 14 tortillas ÷ 8-count
  if (wantOz && product.sizeOz) return Math.max(1, Math.ceil((plan.count * wantOz) / product.sizeOz - 1e-9))   // 3 × 32 oz vs 14.5 oz cans
  return Math.max(1, Math.ceil(plan.count))
}

/** Match every open line on the list to a Walmart product (a few searches at a time). */
export async function matchList(admin: SupabaseClient, items: GroceryItem[]): Promise<WalmartMatch[]> {
  const out: WalmartMatch[] = new Array(items.length)
  const POOL = 4
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      const it = items[idx]
      const plan = toPackages({ name: it.name, quantity: it.quantity, unit: it.unit, searchTerm: it.searchTerm })
      const found = rank(plan.search, await searchWalmart(admin, plan.search), plan.kind)
      const product = found[0] ?? null
      out[idx] = {
        line: { name: it.name, quantity: String(it.quantity ?? ''), unit: it.unit ?? '', category: it.category },
        plan: { search: plan.search, count: plan.count, kind: plan.kind, label: plan.label },
        product,
        qty: product ? quantityFor(plan, product, { n: parseQuantity(it.quantity ?? null) ?? 1, unit: (it.unit ?? '').trim().toLowerCase() }) : 0,
        alternatives: found.slice(1, 5),
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(POOL, items.length) }, worker))
  return out
}

/** The add-to-cart link, affiliate-wrapped when the Impact id is configured. */
export function cartUrl(lines: Array<{ itemId: number; qty: number }>): string {
  const items = lines.filter((l) => l.itemId && l.qty > 0).map((l) => `${l.itemId}|${l.qty}`).join(',')
  const direct = `https://affil.walmart.com/cart/addToCart?items=${items}`
  const impact = process.env.WALMART_IMPACT_ID
  if (!impact) return direct
  return `https://goto.walmart.com/c/${impact}/568844/9383?veh=aff&sourceid=imp_dinnerdrop&u=${encodeURIComponent(direct)}`
}
