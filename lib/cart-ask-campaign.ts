/**
 * "Quick question about your DinnerDrop grocery order" (Sarah, Nov 10 2026, wording approved as written).
 * To families who signed up since the ads restarted (Oct 19) and sent a list to a store, asking whether the order
 * went through and what would bring them back. Replies go to sarah@dinnerdrop.app.
 *
 * Runs from /api/sms/poll only when app_kv `campaign_cartask` is { status: 'approved' }. Sends once per address
 * (campaign_sends), skips internal addresses, @camcomfginc.com and unsubscribed families.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const CART_ASK = 'cartask-2026-11'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|@camcomfginc\.com$|^setzl1979(\+[^@]*)?@gmail\.com$)/i
const SINCE = '2026-10-19'
export const CART_ASK_SUBJECT = 'Quick question about your DinnerDrop grocery order'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** "Instacart", "Walmart", "Kroger" — from the store they sent to ("Instacart · Aldi" → Instacart). */
function storeName(store: string | null | undefined): string {
  const s = String(store ?? '').split('·')[0].trim()
  return s || 'the store'
}

export function cartAskText(firstName: string | undefined, store: string, unsubscribeUrl: string): string {
  return `Hi ${firstName || 'there'},

I'm Sarah, I built DinnerDrop. You sent your DinnerDrop grocery list to ${store} a little while ago, and I'd love to know how it went. Two quick questions — a one-line reply is perfect:

1. After you tapped the button, did you finish the order? If not, what got in the way?
2. What would make you use DinnerDrop again this week?

I read every reply myself.

Thank you,
Sarah
Founder, DinnerDrop

Unsubscribe: ${unsubscribeUrl}`
}

export function cartAskHtml(firstName: string | undefined, store: string, unsubscribeUrl: string): string {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<div style="max-width:560px;margin:0 auto;padding:24px 18px">
${p(`Hi ${esc(firstName || 'there')},`)}
${p(`I’m Sarah, I built DinnerDrop. You sent your DinnerDrop grocery list to ${esc(store)} a little while ago, and I’d love to know how it went. Two quick questions — a one-line reply is perfect:`)}
${p('1. After you tapped the button, did you finish the order? If not, what got in the way?<br>2. What would make you use DinnerDrop again this week?')}
${p('I read every reply myself.')}
${p('Thank you,<br>Sarah<br>Founder, DinnerDrop')}
<p style="margin:24px 0 0;font-size:12px;color:#8a8577">You’re getting this because you signed up at dinnerdrop.app. <a href="${unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
</div></body></html>`
}

type Rec = { email: string; userId: string; firstName?: string; store: string; unsubscribeUrl: string }

/** Signed up since Oct 19, sent a list to a store at least once, minus internal and unsubscribed. */
export async function cartAskRecipients(admin: SupabaseClient): Promise<Rec[]> {
  const { data: me } = await admin.from('profiles').select('household_id').eq('email', 'setzl1979@gmail.com').maybeSingle()
  const { data: hs } = await admin.from('grocery_handoffs').select('user_id, store, created_at').order('created_at', { ascending: true })
  const firstStore = new Map<string, string>()
  for (const h of hs ?? []) if (!firstStore.has(h.user_id)) firstStore.set(h.user_id, storeName(h.store))
  const ids = Array.from(firstStore.keys())
  const out: Rec[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data: profs } = await admin.from('profiles').select('id, email, full_name, email_unsubscribed, household_id, created_at').in('id', ids.slice(i, i + 200)).gte('created_at', SINCE)
    for (const p of profs ?? []) {
      if (!p.email || p.email_unsubscribed || INTERNAL.test(p.email)) continue
      if (me?.household_id && p.household_id === me.household_id) continue
      out.push({ email: p.email, userId: p.id, firstName: p.full_name ? String(p.full_name).split(' ')[0] : undefined, store: firstStore.get(p.id) ?? 'the store', unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}` })
    }
  }
  return out
}

export async function runCartAsk(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 15000
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_cartask').maybeSingle()
  const v = (kv?.value as { status?: string } | null) ?? null
  const report = { status: v?.status ?? 'not approved', sent: 0, failed: 0, left: 0 }
  if (v?.status !== 'approved') return report
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const recs = await cartAskRecipients(admin)
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', CART_ASK)
  const sentSet = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  const todo = recs.filter((r) => !sentSet.has(r.email.toLowerCase()))
  for (const r of todo) {
    if (Date.now() - started > budget) break
    const { error } = await resend.emails.send({
      from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email, subject: CART_ASK_SUBJECT,
      html: cartAskHtml(r.firstName, r.store, r.unsubscribeUrl), text: cartAskText(r.firstName, r.store, r.unsubscribeUrl),
      headers: { 'List-Unsubscribe': `<${r.unsubscribeUrl.replace('/unsubscribe?', '/api/email/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { report.failed++; await new Promise((res) => setTimeout(res, 1100)); continue }
    await admin.from('campaign_sends').insert({ campaign: CART_ASK, email: r.email.toLowerCase(), user_id: r.userId, variant: 'cartask', sent_at: now.toISOString() })
    report.sent++
    await new Promise((res) => setTimeout(res, 300))
  }
  report.left = todo.length - report.sent
  if (report.left === 0 && report.failed === 0) await admin.from('app_kv').upsert({ key: 'campaign_cartask', value: { ...v, status: 'done', doneAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
  return report
}
