import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { resolvePlanOwner } from '@/lib/household'
import { bareEmail, fetchReceivedEmail, looksLikeReceipt, parseReceipt, receiptFeatureAllowed, receiptText, reconcileReceipt, verifyResendSignature, type ReconcileResult } from '@/lib/receipts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Resend "email.received" webhook — a family forwarded their store receipt to the DinnerDrop
 * receiving address. We parse it, reconcile it with the list that went to the store, restore
 * anything the store didn't have, and email a short "got it" back.
 *
 * Gated by RECEIPT_INBOUND_ALLOWLIST (see lib/receipts.ts). Signature: RESEND_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 })
  const ok = verifyResendSignature(raw, {
    id: request.headers.get('svix-id'), timestamp: request.headers.get('svix-timestamp'), signature: request.headers.get('svix-signature'),
  }, secret)
  if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 401 })

  let event: { type?: string; data?: { email_id?: string; from?: string; subject?: string } }
  try { event = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  if (event.type !== 'email.received' || !event.data?.email_id) return NextResponse.json({ ok: true, ignored: event.type ?? 'unknown' })

  const fromEmail = bareEmail(event.data.from ?? '')
  if (!fromEmail || !receiptFeatureAllowed(fromEmail)) return NextResponse.json({ ok: true, ignored: 'not_allowed' })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: prof } = await admin.from('profiles').select('id, email').ilike('email', fromEmail).limit(1).maybeSingle()
  if (!prof) return NextResponse.json({ ok: true, ignored: 'unknown_sender' })
  const { ownerId } = await resolvePlanOwner(admin, prof.id as string)

  const email = await fetchReceivedEmail(event.data.email_id)
  if (!email) return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  const text = receiptText(email)
  if (!looksLikeReceipt(email.subject, text)) {
    await reply(fromEmail, 'That didn’t look like a store receipt', `<p>Thanks — but that email didn’t look like an Instacart or Kroger order receipt, so nothing changed.</p><p>Forward the order confirmation or receipt email from the store and we’ll update your list and pantry.</p>`)
    return NextResponse.json({ ok: true, ignored: 'not_a_receipt' })
  }

  let result: ReconcileResult
  try {
    const parsed = await parseReceipt(text)
    if (!parsed.items.length) {
      await reply(fromEmail, 'We couldn’t read that receipt', `<p>We got your email but couldn’t find any line items in it. If it was a receipt, try forwarding the original email from the store (not a screenshot).</p>`)
      return NextResponse.json({ ok: true, ignored: 'no_items' })
    }
    result = await reconcileReceipt(admin, ownerId, parsed, { emailId: email.id, fromEmail, rawText: text })
  } catch (e) {
    console.error('[receipts] parse/reconcile failed:', e)
    return NextResponse.json({ error: 'parse failed' }, { status: 500 })
  }
  if (result.duplicate) return NextResponse.json({ ok: true, duplicate: true })

  const app = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
  const storeLabel = result.store ? `your ${result.store} receipt` : 'your receipt'
  const lines: string[] = []
  lines.push(`<p>Got ${storeLabel}${result.total ? ` — <b>$${result.total.toFixed(2)}</b>` : ''}. Here’s what we did with it:</p>`)
  lines.push('<ul>')
  lines.push(`<li><b>${result.bought}</b> items bought as planned</li>`)
  if (result.replaced) lines.push(`<li><b>${result.replaced}</b> replaced with a substitute</li>`)
  if (result.refunded) lines.push(`<li><b>${result.refunded}</b> refunded (the store didn’t have them)</li>`)
  if (result.missing - result.refunded > 0) lines.push(`<li><b>${result.missing - result.refunded}</b> on your list that weren’t on the receipt</li>`)
  lines.push('</ul>')
  if (result.restored.length) {
    lines.push(`<p><b>Back on your list so they go with your next order:</b> ${result.restored.join(', ')}.</p>`)
    lines.push(`<p><a href="${app}/grocery-list">Open your list</a> to send just those to another store.</p>`)
  } else {
    lines.push(`<p>Nothing was missing — your list is clear.</p>`)
  }
  if (result.total) lines.push(`<p style="color:#666;font-size:13px">We’ll use the real total to make next week’s price estimates more accurate.</p>`)
  await reply(fromEmail, `Receipt received${result.restored.length ? ` — ${result.restored.length} item${result.restored.length === 1 ? '' : 's'} back on your list` : ''}`, lines.join(''))
  return NextResponse.json({ ok: true, ...result })
}

async function reply(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>', to, subject, html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">${html}<p style="color:#888;font-size:12px">DinnerDrop</p></div>` })
  } catch (e) { console.error('[receipts] reply failed:', e) }
}
