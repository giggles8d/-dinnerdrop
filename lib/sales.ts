/**
 * Weekly sales — what's on sale at the family's store this week.
 *
 * Sources: a flyer photo (from the app or texted to DinnerDrop), a weekly-ad link,
 * or pasted text. Claude reads the flyer into {name, price, unit, category} rows;
 * the planner is told what's on sale and builds the week around it; the grocery
 * list marks matching items with the sale price.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWithClaude, generateWithClaudeImage, parseClaudeJSON } from '@/lib/claude'
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

type Img = { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }

const EXTRACT_RULES = `Return ONLY JSON: {"store":"<store name or empty>","validFrom":"YYYY-MM-DD or empty","validTo":"YYYY-MM-DD or empty","items":[{"name":"<plain grocery item, lowercase, no brand unless it matters>","price":"<as printed, e.g. $1.99/lb, 2 for $5, $3.49>","unit":"<lb|each|pack|bag|box|can|dozen|oz|gallon or empty>","category":"<Produce|Meat & Seafood|Dairy & Eggs|Pantry & Dry Goods|Frozen|Bakery|Beverages>","brand":"<brand or empty>","note":"<e.g. with digital coupon, family pack, limit 2 — or empty>"}]}.
Only include food and grocery items a family would cook with or stock (skip gift cards, flowers, cleaning, electronics). Keep names short and shoppable ("chicken thighs", "ground beef 80/20", "strawberries", "cheddar block"). Up to 60 items, best deals on proteins, produce, dairy and pantry first.`

/** Is this photo a store flyer / weekly ad (many items with prices) rather than a single product? */
export async function looksLikeFlyer(img: Img): Promise<boolean> {
  try {
    const t = await generateWithClaudeImage(`Is this image a grocery store flyer, weekly ad, or sale circular showing several items with prices? Answer ONLY "flyer" or "product".`, img, 10)
    return /flyer/i.test(t)
  } catch { return false }
}

export async function salesFromImage(img: Img, hint = ''): Promise<{ store: string; validFrom: string; validTo: string; items: SaleItem[] }> {
  const text = await generateWithClaudeImage(`This is a page of a grocery store's weekly sale flyer${hint ? ` (${hint})` : ''}. Read every sale item with its price. ${EXTRACT_RULES}`, img, 3500)
  return normalize(parseClaudeJSON(text))
}

export async function salesFromText(text: string, hint = ''): Promise<{ store: string; validFrom: string; validTo: string; items: SaleItem[] }> {
  const out = await generateWithClaude(`Below is the text of a grocery store's weekly ad${hint ? ` (${hint})` : ''}. Extract every sale item with its price. ${EXTRACT_RULES}\n\nTEXT:\n${text.slice(0, 14000)}`, 3500)
  return normalize(parseClaudeJSON(out))
}

/** Fetch a weekly-ad link and read whatever text it exposes. Many retailer ads are JS-only; we say so instead of guessing. */
export async function salesFromUrl(url: string): Promise<{ store: string; validFrom: string; validTo: string; items: SaleItem[]; pageText: number }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (DinnerDrop sales reader)' }, redirect: 'follow' })
  const ct = res.headers.get('content-type') ?? ''
  if (/image\/(jpeg|png|webp|gif)/.test(ct)) {
    const buf = Buffer.from(await res.arrayBuffer())
    const mediaType = (ct.match(/image\/(jpeg|png|webp|gif)/)?.[0] ?? 'image/jpeg') as Img['mediaType']
    const r = await salesFromImage({ base64: buf.toString('base64'), mediaType })
    return { ...r, pageText: 0 }
  }
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&#39;|&quot;/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length < 400 || !/\$\s?\d/.test(text)) return { store: '', validFrom: '', validTo: '', items: [], pageText: text.length }
  const r = await salesFromText(text, `from ${new URL(url).hostname}`)
  return { ...r, pageText: text.length }
}

function normalize(j: unknown): { store: string; validFrom: string; validTo: string; items: SaleItem[] } {
  const o = (j && typeof j === 'object' ? j : {}) as Record<string, unknown>
  const raw = Array.isArray(o.items) ? o.items : []
  const seen = new Set<string>()
  const items: SaleItem[] = []
  for (const r of raw as Array<Record<string, unknown>>) {
    const name = String(r.name ?? '').trim().toLowerCase()
    const price = String(r.price ?? '').trim()
    if (!name || !price) continue
    const k = normalizeItemName(name)
    if (seen.has(k)) continue
    seen.add(k)
    items.push({ name, price, unit: str(r.unit), category: str(r.category), brand: str(r.brand), note: str(r.note) })
  }
  return { store: String(o.store ?? '').trim(), validFrom: dateOrEmpty(o.validFrom), validTo: dateOrEmpty(o.validTo), items: items.slice(0, 80) }
}
const str = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined)
const dateOrEmpty = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? String(v) : '')

/** Save a sales set for the planner (replaces any earlier set for the same store this week). */
export async function saveSales(admin: SupabaseClient, p: { userId: string; householdId: string | null; store: string; validFrom: string; validTo: string; source: string; items: SaleItem[]; addedBy?: string }) {
  const since = new Date(Date.now() - 6 * 86400000).toISOString()
  const { data: prior } = await admin.from('weekly_sales').select('id, items, store').eq('user_id', p.userId).gte('created_at', since).order('created_at', { ascending: false }).limit(5)
  const same = (prior ?? []).find((s) => (s.store || '').toLowerCase() === (p.store || '').toLowerCase())
  // Merge pages of the same flyer: a second photo of the same store this week adds to the first.
  const merged: SaleItem[] = same ? dedupe([...(same.items as SaleItem[]), ...p.items]) : p.items
  if (same) {
    await admin.from('weekly_sales').update({ items: merged, valid_from: p.validFrom || null, valid_to: p.validTo || null }).eq('id', same.id)
    return { id: same.id as string, items: merged, merged: true }
  }
  const { data, error } = await admin.from('weekly_sales').insert({ user_id: p.userId, household_id: p.householdId, store: p.store, valid_from: p.validFrom || null, valid_to: p.validTo || null, source: p.source, items: merged, added_by: p.addedBy ?? null }).select('id').single()
  if (error) throw error
  return { id: data!.id as string, items: merged, merged: false }
}

function dedupe(items: SaleItem[]): SaleItem[] {
  const seen = new Set<string>(); const out: SaleItem[] = []
  for (const i of items) { const k = normalizeItemName(i.name); if (seen.has(k)) continue; seen.add(k); out.push(i) }
  return out.slice(0, 120)
}

/** The sales sets that apply right now (this week's flyers, at most 7 days old). */
export async function currentSales(admin: SupabaseClient, userId: string): Promise<WeeklySales[]> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await admin.from('weekly_sales').select('*').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(5)
  return ((data ?? []) as WeeklySales[]).filter((s) => !s.valid_to || s.valid_to >= today)
}

/** Prompt block for the planner. */
export function salesPromptBlock(sets: WeeklySales[], dinners: number): string {
  const all = sets.flatMap((s) => s.items.map((i) => ({ ...i, store: s.store })))
  if (!all.length) return ''
  const byCat = (cat: RegExp) => all.filter((i) => cat.test(i.category ?? ''))
  const line = (i: SaleItem & { store: string }) => `${i.name} ${i.price}${i.note ? ` (${i.note})` : ''}`
  const proteins = byCat(/meat|seafood/i).slice(0, 18).map(line)
  const produce = byCat(/produce/i).slice(0, 18).map(line)
  const other = all.filter((i) => !/meat|seafood|produce/i.test(i.category ?? '')).slice(0, 18).map(line)
  const store = Array.from(new Set(sets.map((s) => s.store).filter(Boolean))).join(' / ') || 'their store'
  const minDinners = Math.max(2, Math.ceil(dinners * 0.6))
  return `
ON SALE THIS WEEK at ${store} (use these — the family wants the menu built around the sales):
- Proteins: ${proteins.join('; ') || 'none listed'}
- Produce: ${produce.join('; ') || 'none listed'}
- Other: ${other.join('; ') || 'none listed'}
Build at least ${minDinners} of the dinners around a sale protein, and prefer sale produce/pantry items everywhere they fit. For each dinner list the sale items it uses in "saleItems": ["chicken thighs $1.99/lb", ...] (empty array if none) and reflect the sale prices in estimatedCost.`
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
