/**
 * Forwarded store receipts → what the family actually bought.
 *
 * Flow (see app/api/receipts/inbound): a user forwards their Instacart / Kroger order email to the
 * DinnerDrop receiving address. Resend parses it and posts an `email.received` event; we fetch the
 * body, let Claude pull the line items out, then:
 *   - record the real total on the latest handoff (learns settings.stores.priceFactor)
 *   - mark each sent list line bought / replaced / refunded / missing
 *   - put anything the store didn't have back on the ACTIVE list (so it goes with the next send)
 *   - stock long-life staples that were actually bought into the pantry
 *
 * Also: POST /api/receipts/upload — the same pipeline from screenshot(s) uploaded on the grocery
 * list page (no email needed).
 *
 * Gated: RECEIPT_INBOUND_ALLOWLIST — comma-separated substrings matched against the user's
 * email (e.g. "setzl"), or "*" for everyone. Unset = Sarah's account only.
 * Server-only (admin client).
 */
import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWithClaude, generateWithClaudeImages, parseClaudeJSON, type ClaudeImage } from '@/lib/claude'
import { normalizeItemName, guessCategory } from '@/lib/list'
import { recordActualTotal } from '@/lib/handoff-actual'
import { stockStaplesFromReceipt } from '@/lib/pantry'

// ---------------------------------------------------------------- gating

export function receiptInboundAllowed(fromEmail: string): boolean {
  const raw = (process.env.RECEIPT_INBOUND_ALLOWLIST ?? '').trim()
  if (!raw) return false
  if (raw === '*') return true
  const f = fromEmail.toLowerCase()
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).some((s) => f.includes(s))
}

// ---------------------------------------------------------------- Resend webhook signature (Svix scheme)

export function verifyResendSignature(rawBody: string, headers: { id?: string | null; timestamp?: string | null; signature?: string | null }, secret: string, toleranceSec = 300): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature || !secret) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()
  for (const part of signature.split(' ')) {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) continue
    const got = Buffer.from(sig, 'base64')
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true
  }
  return false
}

// ---------------------------------------------------------------- fetch the received email

export interface ReceivedEmail { id: string; from: string; to: string[]; subject: string; text: string | null; html: string | null; created_at: string }

export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail | null> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const d = await res.json() as Record<string, unknown>
  return {
    id: String(d.id ?? emailId),
    from: String(d.from ?? ''),
    to: Array.isArray(d.to) ? (d.to as string[]) : [],
    subject: String(d.subject ?? ''),
    text: typeof d.text === 'string' ? d.text : null,
    html: typeof d.html === 'string' ? d.html : null,
    created_at: String(d.created_at ?? new Date().toISOString()),
  }
}

/** "Sarah <setzl@gmail.com>" → "setzl@gmail.com" */
export function bareEmail(s: string): string {
  const m = s.match(/<([^>]+)>/)
  return (m ? m[1] : s).trim().toLowerCase()
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d|table)>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

/** The text we hand the parser — forwarded mail keeps the original body below the headers. */
export function receiptText(email: Pick<ReceivedEmail, 'text' | 'html'>): string {
  const t = (email.text && email.text.trim().length > 200) ? email.text : (email.html ? htmlToText(email.html) : (email.text ?? ''))
  return t.slice(0, 24000)
}

export function looksLikeReceipt(subject: string, text: string): boolean {
  const s = `${subject}\n${text.slice(0, 4000)}`.toLowerCase()
  const store = /instacart|kroger|walmart|aldi|wegmans|target|costco|whole foods|publix|safeway|shoprite|tops|price chopper|weis|meijer|h-e-b|heb\b/.test(s)
  const order = /order|receipt|delivered|your items|total|subtotal/.test(s)
  return store && order
}

// ---------------------------------------------------------------- parse

export type ReceiptLineStatus = 'bought' | 'replaced' | 'refunded'
export interface ReceiptLine { name: string; qty: number | null; price: number | null; status: ReceiptLineStatus; replacedWith?: string | null; note?: string | null }
export interface ParsedReceipt { store: string | null; service: 'Instacart' | 'Kroger' | 'Other'; orderedOn: string | null; total: number | null; items: ReceiptLine[] }

const RECEIPT_SCHEMA = `Return ONLY JSON:
{"store": "retailer name (e.g. Aldi, Wegmans, Kroger) or null",
 "service": "Instacart" | "Kroger" | "Other",
 "orderedOn": "YYYY-MM-DD or null",
 "total": number or null (the final charged total, after refunds, including fees/tip),
 "items": [{"name": "plain grocery name as a shopper would say it, no brand/size (e.g. 'boneless chicken thighs', 'cheddar cheese')",
            "qty": number or null, "price": number or null,
            "status": "bought" | "replaced" | "refunded",
            "replacedWith": "what was substituted, plain name, only when status is replaced, else null",
            "note": "short note only if useful, else null"}]}

Rules: one entry per line item. "replaced" = the shopper substituted another product (name = what was ORDERED, replacedWith = what they got). "refunded" = the item was out of stock / not found / refunded, so the family does NOT have it. Fees, tips, taxes, credits and delivery lines are not items. Keep names short and generic. Omit "replacedWith" and "note" when null. Write compact JSON on one line per item, no commentary — big orders can have 100+ items and every one must be included.`

/** Parse the model's JSON; if the output was cut off mid-array, keep the complete items we did get. */
export function parseReceiptJSON(out: string): Partial<ParsedReceipt> {
  try { return parseClaudeJSON<Partial<ParsedReceipt>>(out) } catch { /* salvage below */ }
  const cleaned = out.replace(/```json\n?/g, '').replace(/```\n?/g, '')
  const start = cleaned.indexOf('{')
  if (start < 0) throw new Error('No JSON in receipt parse')
  const itemsAt = cleaned.indexOf('"items"', start)
  const head = itemsAt > 0 ? cleaned.slice(start, itemsAt) : ''
  const grab = (key: string): string | null => { const m = head.match(new RegExp(`"${key}"\\s*:\\s*("([^"]*)"|[-0-9.]+|null)`)); return m ? (m[2] ?? m[1]) : null }
  const items: ReceiptLine[] = []
  const arr = itemsAt > 0 ? cleaned.slice(cleaned.indexOf('[', itemsAt) + 1) : ''
  for (const m of arr.match(/\{[^{}]*\}/g) ?? []) { try { items.push(JSON.parse(m)) } catch { /* skip partial object */ } }
  if (!items.length) throw new Error('Receipt JSON unreadable')
  console.warn(`[receipts] salvaged ${items.length} items from a truncated parse`)
  const total = grab('total'), orderedOn = grab('orderedOn'), store = grab('store'), service = grab('service')
  return { store: store && store !== 'null' ? store : null, service: (service as ParsedReceipt['service']) ?? 'Other', orderedOn: orderedOn && orderedOn !== 'null' ? orderedOn : null, total: total && total !== 'null' ? Number(total) : null, items }
}

function normalizeParsed(p: Partial<ParsedReceipt>): ParsedReceipt {
  const items: ReceiptLine[] = Array.isArray(p.items) ? p.items.filter((i) => i && typeof i.name === 'string' && i.name.trim()).map((i) => ({
    name: String(i.name).trim().slice(0, 80),
    qty: Number.isFinite(Number(i.qty)) && i.qty !== null ? Number(i.qty) : null,
    price: Number.isFinite(Number(i.price)) && i.price !== null ? Math.round(Number(i.price) * 100) / 100 : null,
    status: i.status === 'replaced' || i.status === 'refunded' ? i.status : 'bought',
    replacedWith: i.replacedWith ? String(i.replacedWith).trim().slice(0, 80) : null,
    note: i.note ? String(i.note).slice(0, 120) : null,
  })) : []
  return {
    store: p.store ? String(p.store).slice(0, 40) : null,
    service: p.service === 'Kroger' ? 'Kroger' : p.service === 'Instacart' ? 'Instacart' : 'Other',
    orderedOn: typeof p.orderedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.orderedOn) ? p.orderedOn : null,
    total: Number.isFinite(Number(p.total)) && p.total !== null ? Math.round(Number(p.total) * 100) / 100 : null,
    items,
  }
}

export async function parseReceipt(text: string): Promise<ParsedReceipt> {
  const out = await generateWithClaude(`This is a grocery order receipt email (often forwarded, so ignore the forwarding header). Extract what was actually bought.\n\n${RECEIPT_SCHEMA}\n\nRECEIPT:\n${text}`, 16000)
  return normalizeParsed(parseReceiptJSON(out))
}

/** Screenshots of an Instacart / Kroger order (one or several, in order). */
export async function parseReceiptImages(images: ClaudeImage[]): Promise<ParsedReceipt> {
  const out = await generateWithClaudeImages(`These are screenshot(s) of a grocery order receipt from a store app (Instacart, Kroger, etc.), possibly several pages of the same order in order. Extract what was actually bought. Look for "replaced", "refunded", "out of stock", "not found", strikethrough or similar markers next to items. If the screenshots are not a grocery receipt, return {"store":null,"service":"Other","orderedOn":null,"total":null,"items":[]}.\n\n${RECEIPT_SCHEMA}`, images, 16000)
  return normalizeParsed(parseReceiptJSON(out))
}

/** Who gets the receipt features (upload + forwarding). Unset env = Sarah only; "*" = everyone. */
export function receiptFeatureAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = (process.env.RECEIPT_INBOUND_ALLOWLIST ?? '').trim()
  if (!raw) return email.toLowerCase() === 'setzl1979@gmail.com'
  return receiptInboundAllowed(email)
}

// ---------------------------------------------------------------- match receipt lines to list lines

const NOISE = new Set(['or', 'organic', 'fresh', 'large', 'small', 'medium', 'whole', 'pack', 'bag', 'box', 'can', 'jar', 'bunch', 'lb', 'lbs', 'oz', 'ct', 'each', 'of', 'the', 'and', 'with', 'a', 'in', 'brand', 'store', 'premium', 'natural', 'raw', 'ripe', 'sliced', 'shredded', 'diced', 'chopped', 'ground', 'boneless', 'skinless', 'fat', 'free', 'low', 'unsalted', 'salted'])
const SINGULAR: Array<[RegExp, string]> = [[/ies$/, 'y'], [/oes$/, 'o'], [/ches$/, 'ch'], [/shes$/, 'sh'], [/sses$/, 'ss'], [/s$/, '']]
function stem(w: string): string {
  if (w.length <= 3) return w
  for (const [re, rep] of SINGULAR) if (re.test(w)) return w.replace(re, rep)
  return w
}
export function itemTokens(name: string): Set<string> {
  return new Set(normalizeItemName(name).split(' ').filter((w) => w && !NOISE.has(w) && !/^\d+$/.test(w)).map(stem))
}
export function itemSimilarity(a: string, b: string): number {
  const A = itemTokens(a), B = itemTokens(b)
  if (!A.size || !B.size) return 0
  // "cornstarch" vs "corn starch", "popsicles" vs "pop sicles": compare with spaces removed too.
  const ja = Array.from(A).sort().join(''), jb = Array.from(B).sort().join('')
  if (ja === jb) return 1
  let inter = 0
  A.forEach((t) => { if (B.has(t)) inter++ })
  if (!inter) return 0
  const containment = inter / Math.min(A.size, B.size)   // "chicken thighs" ⊂ "boneless chicken thighs"
  const jaccard = inter / (A.size + B.size - inter)
  // The head noun (last token) is what the product IS: "cheese and garlic croutons" is croutons, not cheese.
  const la = Array.from(A).pop(), lb = Array.from(B).pop()
  const head = la === lb ? 0.08 : 0
  return Math.min(1, Math.max(jaccard, containment * 0.9) + head + jaccard * 0.01)
}

export interface SentLine { id: string; name: string; search_term: string | null; quantity: string | null; unit: string | null; category: string; week_start: string | null; household_id: string | null }

/** Greedy best-match: each receipt line claims at most one list line (score ≥ 0.5). */
export function matchLines(receipt: ReceiptLine[], sent: SentLine[]): { pairs: Array<{ receipt: ReceiptLine; line: SentLine; score: number }>; unmatchedReceipt: ReceiptLine[]; unmatchedSent: SentLine[] } {
  const cands: Array<{ r: number; s: number; score: number }> = []
  receipt.forEach((rl, r) => sent.forEach((sl, s) => {
    const score = Math.max(itemSimilarity(rl.name, sl.name), sl.search_term ? itemSimilarity(rl.name, sl.search_term) : 0)
    if (score >= 0.5) cands.push({ r, s, score })
  }))
  cands.sort((a, b) => b.score - a.score)
  const usedR = new Set<number>(), usedS = new Set<number>()
  const pairs: Array<{ receipt: ReceiptLine; line: SentLine; score: number }> = []
  for (const c of cands) {
    if (usedR.has(c.r) || usedS.has(c.s)) continue
    usedR.add(c.r); usedS.add(c.s)
    pairs.push({ receipt: receipt[c.r], line: sent[c.s], score: c.score })
  }
  // Duplicate list lines ("Bananas" twice, "Yogurt" + "Yogurt tubes") share the matched receipt line.
  const byKey = new Map<string, ReceiptLine>()
  for (const p of pairs) byKey.set(normalizeItemName(p.line.name), p.receipt)
  sent.forEach((sl, i) => {
    if (usedS.has(i)) return
    const hit = byKey.get(normalizeItemName(sl.name))
    if (hit) { usedS.add(i); pairs.push({ receipt: hit, line: sl, score: 0.5 }) }
  })
  return {
    pairs,
    unmatchedReceipt: receipt.filter((_, i) => !usedR.has(i)),
    unmatchedSent: sent.filter((_, i) => !usedS.has(i)),
  }
}

/** Verify low-confidence pairs ("Cheese" ← "nacho cheese tortilla chips"): returns the indexes to reject. */
export async function verifyDoubtful(pairs: Array<{ receipt: ReceiptLine; line: SentLine; score: number }>): Promise<Set<number>> {
  const doubtful = pairs.map((p, i) => ({ p, i })).filter(({ p }) => p.score < 0.92)
  if (!doubtful.length) return new Set()
  try {
    const out = await generateWithClaude(`A grocery list was matched to a store receipt by name. Check these pairs. A pair is WRONG when the receipt item is a different product from what the list asked for (e.g. list "Cheese" ← receipt "nacho cheese tortilla chips" is wrong; list "lemon" ← "lemon scented disinfectant wipes" is wrong; list "chicken" ← "boneless skinless chicken breasts" is right; list "Ramen" ← "ramen noodle soup chicken flavor" is right; list "rice vinegar" ← "white wine vinegar" is acceptable as a substitute).\n${doubtful.map(({ p, i }) => `P${i}: list "${p.line.name}" ← receipt "${p.receipt.name}"`).join('\n')}\n\nReturn ONLY JSON: {"wrong":[<P numbers that are wrong>]}`, 400)
    const j = parseClaudeJSON<{ wrong?: number[] }>(out)
    return new Set((j.wrong ?? []).map(Number).filter((n) => Number.isInteger(n) && pairs[n] && pairs[n].score < 0.92))
  } catch { return new Set() }
}

/** Second pass: let the model pair leftovers by meaning (plastic silverware = assorted cutlery, Scoop chips = Tostitos Scoops). */
export async function matchLeftovers(unmatchedSent: SentLine[], unmatchedReceipt: ReceiptLine[]): Promise<Array<{ receipt: ReceiptLine; line: SentLine }>> {
  if (!unmatchedSent.length || !unmatchedReceipt.length) return []
  try {
    const out = await generateWithClaude(`A family sent a grocery list to the store. These LIST items had no obvious match on the receipt:\n${unmatchedSent.map((l, i) => `L${i}: ${l.name}`).join('\n')}\n\nThese RECEIPT items were bought but matched nothing on the list:\n${unmatchedReceipt.map((r, i) => `R${i}: ${r.name}`).join('\n')}\n\nPair each list item with the receipt item that is the SAME product bought under a different name or brand (e.g. "plastic silverware" = "heavy duty assorted cutlery", "Scoop chips" = "tostitos scoops", "cereal or oats" = "ready to eat oats", "sandwich bread" = "classic white bread", "bell pepper" = "multi-colored peppers", "cherry tomatoes" = "grape tomatoes"). Do NOT pair different products (eggs ≠ egg bites, milk ≠ cream cheese, Parmesan ≠ cheddar). Each receipt item may be used once. Return ONLY JSON: [{"l":0,"r":3}, ...] — an empty array if nothing pairs.`, 1500)
    const pairs = parseClaudeJSON<Array<{ l: number; r: number }>>(out)
    const usedR = new Set<number>(), usedL = new Set<number>()
    const result: Array<{ receipt: ReceiptLine; line: SentLine }> = []
    for (const p of Array.isArray(pairs) ? pairs : []) {
      const l = Number(p?.l), r = Number(p?.r)
      if (!Number.isInteger(l) || !Number.isInteger(r) || usedL.has(l) || usedR.has(r) || !unmatchedSent[l] || !unmatchedReceipt[r]) continue
      usedL.add(l); usedR.add(r)
      result.push({ receipt: unmatchedReceipt[r], line: unmatchedSent[l] })
    }
    return result
  } catch { return [] }
}

// ---------------------------------------------------------------- reconcile against the list that went to the store

/** Reverse a receipt's side effects so a better upload of the same order can replace it. */
export async function undoReceipt(admin: SupabaseClient, ownerId: string, receiptId: string, createdAt: string): Promise<void> {
  // Lines the receipt restored to the active list (still open, nobody ticked them) go away.
  await admin.from('list_items').delete().eq('user_id', ownerId).like('added_by', 'receipt:%').gte('created_at', createdAt).is('ordered_at', null).eq('checked', false)
  // Status marks it set on the sent lines are cleared (the new receipt sets them again).
  await admin.from('list_items').update({ receipt_status: null }).eq('user_id', ownerId).not('receipt_status', 'is', null).not('ordered_at', 'is', null)
  await admin.from('item_purchases').delete().eq('receipt_id', receiptId)
  await admin.from('receipts').delete().eq('id', receiptId)
}

export interface ReconcileResult { receiptId: string | null; handoffId: string | null; bought: number; replaced: number; refunded: number; missing: number; restored: string[]; store: string | null; total: number | null; duplicate?: boolean }

export async function reconcileReceipt(admin: SupabaseClient, ownerId: string, parsed: ParsedReceipt, meta: { emailId: string; fromEmail: string; rawText: string }): Promise<ReconcileResult> {
  const empty: ReconcileResult = { receiptId: null, handoffId: null, bought: 0, replaced: 0, refunded: 0, missing: 0, restored: [], store: parsed.store, total: parsed.total }
  // Dedupe webhook retries.
  const { data: dup } = await admin.from('receipts').select('id').eq('email_id', meta.emailId).maybeSingle()
  if (dup) return { ...empty, receiptId: dup.id as string, duplicate: true }

  // The handoff this receipt belongs to: most recent send within 14 days (prefer same service).
  const since = new Date(Date.now() - 14 * 86400000).toISOString()
  const { data: handoffs } = await admin.from('grocery_handoffs').select('id, store, created_at, week_start, est_total').eq('user_id', ownerId).gte('created_at', since).order('created_at', { ascending: false }).limit(5)
  // The order this receipt belongs to: the latest send on or before the receipt's order date
  // (the store label on a send gets renamed to the real store, so never match on it).
  const hs = handoffs ?? []
  const on = parsed.orderedOn
  const dayAfter = on ? new Date(new Date(on + 'T12:00:00Z').getTime() + 86400000).toISOString().slice(0, 10) : null
  const handoff = (on && dayAfter
    ? (hs.find((h) => (h.created_at as string).slice(0, 10) <= on) ?? hs.find((h) => (h.created_at as string).slice(0, 10) <= dayAfter) ?? null)
    : null) ?? hs[0] ?? null

  // A re-upload (better screenshots, pasted text) replaces every read from the last two days:
  // undo the lines they put back on the list and their history rows, then apply fresh.
  const { data: prevs } = await admin.from('receipts').select('id, created_at').eq('user_id', ownerId).gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString()).order('created_at', { ascending: true })
  for (const prev of prevs ?? []) await undoReceipt(admin, ownerId, prev.id as string, prev.created_at as string)

  // The lines that went to the store for that handoff (sent within ±1 day of it, or the whole week when no handoff).
  let sent: SentLine[] = []
  if (handoff) {
    const t = new Date(handoff.created_at as string).getTime()
    const lo = new Date(t - 2 * 86400000).toISOString(), hi = new Date(t + 2 * 86400000).toISOString()
    const { data } = await admin.from('list_items').select('id, name, search_term, quantity, unit, category, week_start, household_id').eq('user_id', ownerId).not('ordered_at', 'is', null).gte('ordered_at', lo).lte('ordered_at', hi)
    sent = (data as SentLine[]) ?? []
  }

  const m = matchLines(parsed.items, sent)
  const wrong = await verifyDoubtful(m.pairs)
  const kept = m.pairs.filter((_, i) => !wrong.has(i))
  const rejected = m.pairs.filter((_, i) => wrong.has(i))
  const leftoverSent = [...m.unmatchedSent, ...rejected.map((p) => p.line)]
  const leftoverReceipt = [...m.unmatchedReceipt, ...rejected.map((p) => p.receipt).filter((r) => !kept.some((k) => k.receipt === r))]
  const extra = await matchLeftovers(leftoverSent, leftoverReceipt)
  const pairs = [...kept, ...extra.map((e) => ({ ...e, score: 0.5 }))]
  const extraIds = new Set(extra.map((e) => e.line.id))
  const unmatchedSent = leftoverSent.filter((l) => !extraIds.has(l.id))
  let bought = 0, replaced = 0, refunded = 0
  for (const p of pairs) {
    const status = p.receipt.status
    if (status === 'bought') bought++; else if (status === 'replaced') replaced++; else refunded++
    await admin.from('list_items').update({ receipt_status: status }).eq('id', p.line.id)
  }
  // Lines the store didn't have (refunded) or that never appeared on the receipt → back on the active list.
  const missingLines: SentLine[] = [
    ...pairs.filter((p) => p.receipt.status === 'refunded').map((p) => p.line),
    ...unmatchedSent,
  ]
  for (const l of unmatchedSent) await admin.from('list_items').update({ receipt_status: 'missing' }).eq('id', l.id)
  const restored: string[] = []
  if (missingLines.length) {
    const { data: open } = await admin.from('list_items').select('name').eq('user_id', ownerId).is('ordered_at', null)
    const already = new Set((open ?? []).map((r) => normalizeItemName(r.name)))
    const rows = missingLines.filter((l) => !already.has(normalizeItemName(l.name))).map((l) => ({
      user_id: ownerId, household_id: l.household_id, week_start: l.week_start, name: l.name, quantity: l.quantity, unit: l.unit,
      category: l.category || guessCategory(l.name), search_term: l.search_term, source: 'extra', added_by: `receipt:${parsed.store ?? parsed.service}`, have: false, checked: false,
    }))
    if (rows.length) {
      const { error } = await admin.from('list_items').insert(rows)
      if (!error) restored.push(...rows.map((r) => r.name))
    }
  }

  // Real total → price factor. Staples actually bought → pantry.
  let handoffId: string | null = handoff ? (handoff.id as string) : null
  if (parsed.total && parsed.total > 0) {
    const r = await recordActualTotal(admin, ownerId, parsed.total, parsed.store, handoffId)
    handoffId = r.handoffId ?? handoffId
  }
  const boughtNames = parsed.items.filter((i) => i.status !== 'refunded').map((i) => (i.status === 'replaced' && i.replacedWith) ? i.replacedWith : i.name)
  await stockStaplesFromReceipt(admin, ownerId, boughtNames).catch(() => 0)

  const missing = missingLines.length
  const { data: rec } = await admin.from('receipts').insert({
    user_id: ownerId, handoff_id: handoffId, email_id: meta.emailId, from_email: meta.fromEmail, store: parsed.store, ordered_on: parsed.orderedOn,
    total: parsed.total, item_count: parsed.items.length, items: parsed.items, raw_text: meta.rawText.slice(0, 20000),
    summary: { bought, replaced, refunded, missing, restored: restored.length, matched: pairs.length, sent: sent.length },
  }).select('id').single()
  // Per-item purchase history (where/when/price) for History and the week check.
  if (rec?.id && parsed.items.length) {
    const boughtOn = parsed.orderedOn ?? new Date().toISOString().slice(0, 10)
    await admin.from('item_purchases').insert(parsed.items.map((i) => ({
      user_id: ownerId, receipt_id: rec.id, store: parsed.store, bought_on: boughtOn, name: i.name, name_key: normalizeItemName(i.name),
      qty: i.qty, price: i.price, status: i.status, replaced_with: i.replacedWith ?? null,
    }))).then(({ error }) => { if (error) console.error('[receipts] item_purchases insert failed:', error.message) })
  }
  return { receiptId: (rec?.id as string) ?? null, handoffId, bought, replaced, refunded, missing, restored, store: parsed.store, total: parsed.total }
}

// ---------------------------------------------------------------- week check: did every dinner's ingredients make it?

export type IngredientStatus = 'received' | 'replaced' | 'missing' | 'have' | 'not_ordered' | 'pending'
export interface DinnerCheck { day: string; name: string; ok: boolean; ingredients: Array<{ name: string; status: IngredientStatus; note?: string }> }
export interface WeekCheck { weekStart: string | null; hasReceipt: boolean; dinners: DinnerCheck[]; missingCount: number }

interface PlanMealLite { day: string; name: string; ingredients: Array<{ name: string; searchTerm?: string }> }

/** Compare the current plan's ingredients with what the list/receipt says happened to them. */
export async function weekCheck(admin: SupabaseClient, ownerId: string): Promise<WeekCheck> {
  const { data: plan } = await admin.from('meal_plans').select('id, week_start, meals, created_at').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!plan) return { weekStart: null, hasReceipt: false, dinners: [], missingCount: 0 }
  const meals = (Array.isArray(plan.meals) ? plan.meals : []) as PlanMealLite[]
  const { data: lines } = await admin.from('list_items').select('name, search_term, have, ordered_at, receipt_status, added_by').eq('user_id', ownerId).eq('week_start', plan.week_start as string)
  const { data: rec } = await admin.from('receipts').select('id').eq('user_id', ownerId).gte('created_at', plan.created_at as string).limit(1)
  const hasReceipt = !!rec?.length
  type Line = { name: string; search_term: string | null; have: boolean; ordered_at: string | null; receipt_status: string | null; added_by: string | null }
  const all = ((lines as Line[]) ?? [])
  const replacedWith = new Map<string, string>()
  if (hasReceipt) {
    const { data: purchases } = await admin.from('item_purchases').select('name, replaced_with').eq('user_id', ownerId).eq('status', 'replaced').gte('created_at', plan.created_at as string)
    for (const p of purchases ?? []) if (p.replaced_with) replacedWith.set(normalizeItemName(p.name), p.replaced_with)
  }
  const bestLine = (ing: { name: string; searchTerm?: string }): { line: Line; score: number } | null => {
    let best: { line: Line; score: number } | null = null
    for (const l of all) {
      const score = Math.max(itemSimilarity(ing.name, l.name), ing.searchTerm ? itemSimilarity(ing.searchTerm, l.name) : 0, l.search_term ? itemSimilarity(ing.name, l.search_term) : 0)
      if (score >= 0.5 && (!best || score > best.score)) best = { line: l, score }
    }
    return best
  }
  let missingCount = 0
  const dinners: DinnerCheck[] = meals.map((m) => {
    const ingredients = (m.ingredients ?? []).map((ing) => {
      const hit = bestLine(ing)
      let status: IngredientStatus = 'not_ordered'; let note: string | undefined
      if (hit) {
        const l = hit.line
        if (l.have) status = 'have'
        else if (!l.ordered_at) status = hasReceipt ? 'missing' : 'pending'            // still on the open list (never sent, or restored by the receipt)
        else if (l.receipt_status === 'bought') status = 'received'
        else if (l.receipt_status === 'replaced') { status = 'replaced'; const r = replacedWith.get(normalizeItemName(l.name)); if (r) note = `got ${r}` }
        else if (l.receipt_status === 'refunded' || l.receipt_status === 'missing') status = 'missing'
        else status = hasReceipt ? 'received' : 'pending'                                 // sent, no receipt line (e.g. second store)
        if (status === 'missing' && !l.ordered_at) note = 'back on your list'
      }
      if (status === 'missing' || status === 'not_ordered') missingCount++
      return { name: ing.name, status, note }
    })
    return { day: m.day, name: m.name, ok: ingredients.every((i) => i.status === 'received' || i.status === 'have' || i.status === 'replaced'), ingredients }
  })
  return { weekStart: (plan.week_start as string) ?? null, hasReceipt, dinners, missingCount }
}
