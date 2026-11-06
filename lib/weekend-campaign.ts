/**
 * "Your dinners are planned. One tap left." (Sarah approved the weekend push, Nov 6 2026).
 * To families who signed up in the last 30 days and never sent a list to a store, skipping anyone who got any
 * campaign email in the 3 days before the send (no pile-ups). Includes their own invite link instead of a separate
 * referral blast. Sends once per address (campaign_sends) and only when app_kv `campaign_weekend` is
 * { status: 'approved', sendOn: 'YYYY-MM-DD' } and today (ET) is on/after sendOn.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const WEEKEND = 'weekend-2026-11-07'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$|@camcomfginc\.com$)/i
export const WEEKEND_SUBJECT = 'Your dinners are planned. One tap left.'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Rec = { email: string; userId: string; firstName?: string; refCode?: string; unsubscribeUrl: string }

function links(r: Pick<Rec, 'refCode'>) {
  const dash = `${APP}/dashboard?utm_source=email&utm_medium=weekend&utm_campaign=${WEEKEND}`
  const invite = r.refCode ? `${APP}/start?ref=${r.refCode}` : `${APP}/start?utm_source=referral&utm_medium=email`
  return { dash, invite }
}

export function weekendHtml(r: Pick<Rec, 'firstName' | 'refCode' | 'unsubscribeUrl'>): string {
  const { dash, invite } = links(r)
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<div style="max-width:560px;margin:0 auto;padding:24px 18px">
${p(`Hi ${esc(r.firstName || 'there')},`)}
${p('Your week of dinners is ready in DinnerDrop, and the grocery list is already built from it. One tap sends the whole list to Instacart, Walmart or Kroger, so the weekend shop is done before you get off the couch.')}
<p style="margin:0 0 18px"><a href="${dash}" style="display:inline-block;background:#1a5c38;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">Send my grocery list</a></p>
${p('Want everyone to add their own stuff? Add their phone numbers in Settings under Family texting, and they can text the DinnerDrop number something like “add granola bars.” It lands right on your list.')}
${p(`And if a friend dreads the dinner question too, here’s your invite link: <a href="${invite}" style="color:#1a5c38">${esc(invite.replace('https://www.', ''))}</a>. When they start the Family plan, you both get a month free.`)}
${p('Sarah<br>DinnerDrop')}
<p style="margin:24px 0 0;font-size:12px;color:#8a8577">You’re getting this because you signed up at dinnerdrop.app. <a href="${r.unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
</div></body></html>`
}

export function weekendText(r: Pick<Rec, 'firstName' | 'refCode' | 'unsubscribeUrl'>): string {
  const { dash, invite } = links(r)
  return `Hi ${r.firstName || 'there'},

Your week of dinners is ready in DinnerDrop, and the grocery list is already built from it. One tap sends the whole list to Instacart, Walmart or Kroger, so the weekend shop is done before you get off the couch.

Send my grocery list: ${dash}

Want everyone to add their own stuff? Add their phone numbers in Settings under Family texting, and they can text the DinnerDrop number something like "add granola bars." It lands right on your list.

And if a friend dreads the dinner question too, here's your invite link: ${invite}. When they start the Family plan, you both get a month free.

Sarah
DinnerDrop

Unsubscribe: ${r.unsubscribeUrl}`
}

/** Signed up in the last 30 days, never sent a list, no campaign email in the 3 days before `now`. */
export async function weekendRecipients(admin: SupabaseClient, now = new Date()): Promise<Rec[]> {
  const since = new Date(now.getTime() - 30 * 86400000).toISOString()
  const quiet = new Date(now.getTime() - 3 * 86400000).toISOString()
  const { data: profs } = await admin.from('profiles').select('id, email, full_name, referral_code, email_unsubscribed').gt('created_at', since)
  const cands = (profs ?? []).filter((p) => p.email && !p.email_unsubscribed && !INTERNAL.test(p.email))
  const ids = cands.map((p) => p.id)
  const sentList = new Set<string>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data: hs } = await admin.from('grocery_handoffs').select('user_id').in('user_id', ids.slice(i, i + 200))
    for (const r of hs ?? []) sentList.add(r.user_id)
  }
  const { data: recent } = await admin.from('campaign_sends').select('email, campaign').gt('sent_at', quiet)
  const recentlyEmailed = new Set((recent ?? []).filter((c) => c.campaign !== WEEKEND).map((c) => String(c.email).toLowerCase()))
  return cands
    .filter((p) => !sentList.has(p.id) && !recentlyEmailed.has(String(p.email).toLowerCase()))
    .map((p) => ({
      email: p.email as string, userId: p.id,
      firstName: p.full_name ? String(p.full_name).split(' ')[0] : undefined,
      refCode: p.referral_code ?? undefined,
      unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}`,
    }))
}

export async function runWeekend(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 60000
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_weekend').maybeSingle()
  const v = (kv?.value as { status?: string; sendOn?: string } | null) ?? null
  const report = { status: v?.status ?? 'not approved', sent: 0, failed: 0 }
  if (v?.status !== 'approved' || !v.sendOn) return report
  const todayET = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (todayET < v.sendOn) return { ...report, status: `waiting for ${v.sendOn}` }
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', WEEKEND)
  const doneSet = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  // Recipients are fixed at the first send (sendOn), so later runs don't pull in families who got other emails since.
  const recs = (await weekendRecipients(admin, new Date(`${v.sendOn}T12:00:00Z`))).filter((r) => !doneSet.has(r.email.toLowerCase()))
  for (const r of recs) {
    if (Date.now() - started > budget) break
    const { error } = await resend.emails.send({
      from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email, subject: WEEKEND_SUBJECT,
      html: weekendHtml(r), text: weekendText(r),
      headers: { 'List-Unsubscribe': `<${r.unsubscribeUrl.replace('/unsubscribe?', '/api/email/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { report.failed++; await new Promise((res) => setTimeout(res, 1100)); continue }
    await admin.from('campaign_sends').insert({ campaign: WEEKEND, email: r.email.toLowerCase(), user_id: r.userId, variant: 'weekend', sent_at: now.toISOString() })
    report.sent++
    await new Promise((res) => setTimeout(res, 300))
  }
  return report
}
