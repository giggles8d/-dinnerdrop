/**
 * Day-after-order follow-up (2026-10-26). Instacart never tells us whether a family
 * checked out, so the morning after a list goes to a store we ask, with one-tap answers,
 * and invite a receipt upload. Runs from /api/cron/daily (8am ET).
 */
import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, emailShell } from '@/lib/notify'

const APP = 'https://www.dinnerdrop.app'
export const FEEDBACK_ANSWERS = ['ordered', 'pricey', 'missing', 'not_yet'] as const
export type FeedbackAnswer = (typeof FEEDBACK_ANSWERS)[number]

export function feedbackSig(handoffId: string): string {
  return createHmac('sha256', process.env.CRON_SECRET || 'dinnerdrop').update(`handoff-feedback:${handoffId}`).digest('hex').slice(0, 24)
}

export function feedbackSigOk(handoffId: string, sig: string): boolean {
  const a = Buffer.from(feedbackSig(handoffId))
  const b = Buffer.from(sig || '')
  return a.length === b.length && timingSafeEqual(a, b)
}

function answerLink(handoffId: string, a: FeedbackAnswer): string {
  return `${APP}/api/handoff/feedback?h=${handoffId}&a=${a}&s=${feedbackSig(handoffId)}`
}

export function followupHtml(name: string, handoffId: string, store: string): string {
  const btn = (a: FeedbackAnswer, label: string) =>
    `<a href="${answerLink(handoffId, a)}" style="display:block;margin:8px 0;padding:12px 16px;border:1px solid #d9d4c7;border-radius:10px;color:#1f2a24;text-decoration:none;font-weight:600">${label}</a>`
  return emailShell(
    `How did your grocery order go${name ? `, ${name}` : ''}?`,
    `<p>Yesterday your DinnerDrop list went to ${store}. One tap tells us how it went, so next week's list is even better:</p>
     ${btn('ordered', '✅ I ordered it')}
     ${btn('pricey', '💸 It came out too expensive')}
     ${btn('missing', '🧺 Items were missing or wrong')}
     ${btn('not_yet', '⏳ Haven’t ordered yet')}
     <p style="margin-top:18px">Ordered? Snap a photo of your receipt and upload it. DinnerDrop learns your real prices and what was out of stock, and anything missing goes back on next week's list.</p>`,
    { label: 'Upload my receipt', href: `${APP}/grocery-list#receipt-upload` }
  )
}

export async function runOrderFollowups(admin: SupabaseClient, now: Date = new Date()): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const out = { sent: 0, skipped: 0, errors: [] as string[] }
  const from = new Date(now.getTime() - 32 * 3600000).toISOString()
  const to = new Date(now.getTime() - 8 * 3600000).toISOString()
  const { data: rows, error } = await admin
    .from('grocery_handoffs')
    .select('id, user_id, store, created_at')
    .is('followup_sent_at', null)
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: false })
  if (error) { out.errors.push(error.message); return out }

  const byUser = new Map<string, { id: string; store: string; ids: string[] }>()
  for (const r of rows ?? []) {
    const cur = byUser.get(r.user_id)
    if (cur) cur.ids.push(r.id)
    else byUser.set(r.user_id, { id: r.id, store: r.store || 'Instacart', ids: [r.id] })
  }
  if (!byUser.size) return out

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, email_unsubscribed')
    .in('id', Array.from(byUser.keys()))
  for (const p of profiles ?? []) {
    const h = byUser.get(p.id)!
    const stamp = new Date().toISOString()
    if (!p.email || p.email_unsubscribed) {
      out.skipped++
      await admin.from('grocery_handoffs').update({ followup_sent_at: stamp }).in('id', h.ids)
      continue
    }
    const first = ((p.full_name as string | null) || '').trim().split(' ')[0]
    const r = await sendEmail(p.email, 'How did your grocery order go?', followupHtml(first, h.id, h.store))
    if (r.ok) {
      out.sent++
      await admin.from('grocery_handoffs').update({ followup_sent_at: stamp }).in('id', h.ids)
    } else {
      out.errors.push(`${p.id}: ${r.error}`)
    }
  }
  return out
}
