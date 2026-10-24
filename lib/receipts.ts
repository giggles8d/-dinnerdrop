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
 * Gated: RECEIPT_INBOUND_ALLOWLIST — comma-separated substrings matched against the sender's
 * email (e.g. "setzl"), or "*" for everyone. Unset = feature off.
 * Server-only (admin client).
 */
import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
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

export async function parseReceipt(text: string): Promise<ParsedReceipt> {
  const prompt = `This is a grocery order receipt email (often forwarded, so ignore the forwarding header). Extract what was actually bought.

Return ONLY JSON:
{"store": "retailer name (e.g. Aldi, Wegmans, Kroger) or null",
 "service": "Instacart" | "Kroger" | "Other",
 "orderedOn": "YYYY-MM-DD or null",
 "total": number or null (the final charged total, after refunds, including fees/tip),
 "items": [{"name": "plain grocery name as a shopper would say it, no brand/size (e.g. 'boneless chicken thighs', 'cheddar cheese')",
            "qty": number or null, "price": number or null,
            "status": "bought" | "replaced" | "refunded",
            "replacedWith": "what was substituted, plain name, only when status is replaced, else null",
            "note": "short note only if useful, else null"}]}

Rules: one entry per line item. "replaced" = the shopper substituted another product (name = what was ORDERED, replacedWith = what they got). "refunded" = the item was out of stock / not found / refunded, so the family does NOT have it. Fees, tips, taxes, credits and delivery lines are not items. Keep names short and generic.

RECEIPT:
${text}`
  const out = await generateWithClaude(prompt, 4000)
  const p = parseClaudeJSON<Partial<ParsedReceipt>>(out)
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

// ---------------------------------------------------------------- match receipt lines to list lines

const NOISE = new Set(['organic', 'fresh', 'large', 'small', 'medium', 'whole', 'pack', 'bag', 'box', 'can', 'jar', 'bunch', 'lb', 'lbs', 'oz', 'ct', 'each', 'of', 'the', 'and', 'with', 'a', 'in', 'brand', 'store', 'premium', 'natural', 'raw', 'ripe', 'sliced', 'shredded', 'diced', 'chopped', 'ground', 'boneless', 'skinless', 'fat', 'free', 'low', 'unsalted', 'salted'])
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
  let inter = 0
  A.forEach((t) => { if (B.has(t)) inter++ })
  if (!inter) return 0
  const containment = inter / Math.min(A.size, B.size)   // "chicken thighs" ⊂ "boneless chicken thighs"
  const jaccard = inter / (A.size + B.size - inter)
  return Math.max(jaccard, containment * 0.9)
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
  return {
    pairs,
    unmatchedReceipt: receipt.filter((_, i) => !usedR.has(i)),
    unmatchedSent: sent.filter((_, i) => !usedS.has(i)),
  }
}

// ---------------------------------------------------------------- reconcile against the list that went to the store

export interface ReconcileResult { receiptId: string | null; handoffId: string | null; bought: number; replaced: number; refunded: number; missing: number; restored: string[]; store: string | null; total: number | null; duplicate?: boolean }

export async function reconcileReceipt(admin: SupabaseClient, ownerId: string, parsed: ParsedReceipt, meta: { emailId: string; fromEmail: string; rawText: string }): Promise<ReconcileResult> {
  const empty: ReconcileResult = { receiptId: null, handoffId: null, bought: 0, replaced: 0, refunded: 0, missing: 0, restored: [], store: parsed.store, total: parsed.total }
  // Dedupe webhook retries.
  const { data: dup } = await admin.from('receipts').select('id').eq('email_id', meta.emailId).maybeSingle()
  if (dup) return { ...empty, receiptId: dup.id as string, duplicate: true }

  // The handoff this receipt belongs to: most recent send within 14 days (prefer same service).
  const since = new Date(Date.now() - 14 * 86400000).toISOString()
  const { data: handoffs } = await admin.from('grocery_handoffs').select('id, store, created_at, week_start, est_total').eq('user_id', ownerId).gte('created_at', since).order('created_at', { ascending: false }).limit(5)
  const handoff = (handoffs ?? []).find((h) => parsed.service !== 'Other' && String(h.store).toLowerCase().includes(parsed.service.toLowerCase())) ?? (handoffs ?? [])[0] ?? null

  // The lines that went to the store for that handoff (sent within ±1 day of it, or the whole week when no handoff).
  let sent: SentLine[] = []
  if (handoff) {
    const t = new Date(handoff.created_at as string).getTime()
    const lo = new Date(t - 86400000).toISOString(), hi = new Date(t + 86400000).toISOString()
    const { data } = await admin.from('list_items').select('id, name, search_term, quantity, unit, category, week_start, household_id').eq('user_id', ownerId).not('ordered_at', 'is', null).gte('ordered_at', lo).lte('ordered_at', hi)
    sent = (data as SentLine[]) ?? []
  }

  const { pairs, unmatchedSent } = matchLines(parsed.items, sent)
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
  return { receiptId: (rec?.id as string) ?? null, handoffId, bought, replaced, refunded, missing, restored, store: parsed.store, total: parsed.total }
}
