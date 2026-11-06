/**
 * "Quick question" check-in email (Sarah, Nov 1 2026) to families who made a plan but never sent a list
 * to a store. Asks for a one-line reply on what got in the way, and offers to set up their week.
 *
 * Runs from the daily cron via /api/cron/campaigns only when app_kv `campaign_checkin` is
 * { status: 'approved', sendOn: 'YYYY-MM-DD' } and today (ET) is on/after sendOn.
 * Sends once per address (campaign_sends). Skips anyone who signed up in the last 7 days
 * (they're still in the day 1/3/7 activation emails).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const CHECKIN = 'checkin-2026-11'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$)/i
export const CHECKIN_SUBJECT = 'Quick question about your dinners'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function checkinHtml(firstName: string | undefined, unsubscribeUrl: string): string {
  const dash = `${APP}/dashboard?utm_source=email&utm_medium=checkin&utm_campaign=${CHECKIN}`
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<div style="max-width:560px;margin:0 auto;padding:24px 18px">
${p(`Hi ${esc(firstName || 'there')},`)}
${p('It’s Sarah, the mom who built DinnerDrop. You made a dinner plan with us but never sent the grocery list to a store, and I’d really like to know why.')}
${p('Could you hit reply and tell me in one line what got in the way? Wrong dinners, too pricey, your store wasn’t there, or life just got busy? Every answer is fine, and I read every reply myself.')}
${p(`Your week is waiting here whenever you want another try: <a href="${dash}" style="color:#1a5c38">dinnerdrop.app/dashboard</a>`)}
${p('Or let me set it up for you. Reply with how many you’re feeding, anything your family won’t eat, and where you shop (Instacart, Kroger or Walmart). I’ll put together your dinners and grocery list, and it’s one tap from there to your cart.')}
${p('Thank you,<br>Sarah<br>DinnerDrop')}
<p style="margin:24px 0 0;font-size:12px;color:#8a8577">You’re getting this because you signed up at dinnerdrop.app. <a href="${unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
</div></body></html>`
}

export function checkinText(firstName: string | undefined, unsubscribeUrl: string): string {
  return `Hi ${firstName || 'there'},

It's Sarah, the mom who built DinnerDrop. You made a dinner plan with us but never sent the grocery list to a store, and I'd really like to know why.

Could you hit reply and tell me in one line what got in the way? Wrong dinners, too pricey, your store wasn't there, or life just got busy? Every answer is fine, and I read every reply myself.

Your week is waiting here whenever you want another try: ${APP}/dashboard

Or let me set it up for you. Reply with how many you're feeding, anything your family won't eat, and where you shop (Instacart, Kroger or Walmart). I'll put together your dinners and grocery list, and it's one tap from there to your cart.

Thank you,
Sarah
DinnerDrop

Unsubscribe: ${unsubscribeUrl}`
}

type Rec = { email: string; userId: string; firstName?: string; unsubscribeUrl: string }

/** Families with a plan and no list ever sent to a store, signed up 7+ days ago, minus internal and unsubscribed. */
export async function checkinRecipients(admin: SupabaseClient, now = new Date()): Promise<Rec[]> {
  const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString()
  const { data: profs } = await admin.from('profiles').select('id, email, full_name, email_unsubscribed').lt('created_at', cutoff)
  const cands = (profs ?? []).filter((p) => p.email && !p.email_unsubscribed && !INTERNAL.test(p.email))
  const ids = cands.map((p) => p.id)
  const planned = new Set<string>()
  const sent = new Set<string>()
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const [{ data: mp }, { data: hs }] = await Promise.all([
      admin.from('meal_plans').select('user_id').in('user_id', chunk),
      admin.from('grocery_handoffs').select('user_id').in('user_id', chunk),
    ])
    for (const r of mp ?? []) planned.add(r.user_id)
    for (const r of hs ?? []) sent.add(r.user_id)
  }
  return cands
    .filter((p) => planned.has(p.id) && !sent.has(p.id))
    .map((p) => ({ email: p.email as string, userId: p.id, firstName: p.full_name ? String(p.full_name).split(' ')[0] : undefined, unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}` }))
}

export async function runCheckin(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 120000
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_checkin').maybeSingle()
  const v = (kv?.value as { status?: string; sendOn?: string } | null) ?? null
  const report = { status: v?.status ?? 'not approved', sent: 0, failed: 0 }
  if (v?.status !== 'approved' || !v.sendOn) return report
  const todayET = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (todayET < v.sendOn) return { ...report, status: `waiting for ${v.sendOn}` }
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)

  const recs = await checkinRecipients(admin, now)
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', CHECKIN)
  const sentSet = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  for (const r of recs) {
    if (sentSet.has(r.email.toLowerCase())) continue
    if (Date.now() - started > budget) break
    const { error } = await resend.emails.send({
      from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email, subject: CHECKIN_SUBJECT,
      html: checkinHtml(r.firstName, r.unsubscribeUrl), text: checkinText(r.firstName, r.unsubscribeUrl),
      headers: { 'List-Unsubscribe': `<${r.unsubscribeUrl.replace('/unsubscribe?', '/api/email/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { report.failed++; await new Promise((res) => setTimeout(res, 1100)); continue }
    await admin.from('campaign_sends').insert({ campaign: CHECKIN, email: r.email.toLowerCase(), user_id: r.userId, variant: 'checkin', sent_at: now.toISOString() })
    report.sent++
    await new Promise((res) => setTimeout(res, 300))
  }
  return report
}
