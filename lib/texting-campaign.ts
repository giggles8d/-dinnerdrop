/**
 * "Let the family pick dinner" email (Sarah, Nov 3 2026): invite past families to turn on family texting with a
 * one-tap link to add their numbers (no sign-in; app/go/texting). Texting is the feature nobody else has.
 *
 * Runs from the daily cron via /api/cron/campaigns only when app_kv `campaign_texting` is
 * { status: 'approved', sendOn: 'YYYY-MM-DD' } and today (ET) is on/after sendOn. Once per address
 * (campaign_sends). Goes to families with Family access whose household has no phone number yet,
 * signed up 7+ days ago (newer families are still in the day 1/3/7 emails), minus internal and unsubscribed.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { isFamilyProfile } from '@/lib/access'
import { textingUrl } from '@/lib/followup'

export const TEXTING = 'texting-2026-11'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$)/i
export const TEXTING_SUBJECT = 'Let your family pick dinner (by text)'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function textingHtml(firstName: string | undefined, link: string, unsubscribeUrl: string): string {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<div style="max-width:560px;margin:0 auto;padding:24px 18px">
${p(`Hi ${esc(firstName || 'there')},`)}
${p('It’s Sarah from DinnerDrop. There’s one part of DinnerDrop most families haven’t turned on yet, and it’s my favorite: family texting.')}
${p('Add your family’s phone numbers and DinnerDrop texts everyone the week’s dinner options. They reply with the numbers they want, and the top picks become your week. Anyone can text <b>ADD milk</b> to put it on the grocery list, and you get a heads-up before you order. Nobody installs an app. It’s just texts.')}
${p('It’s included with your Family plan, and it takes about 30 seconds:')}
<p style="margin:6px 0 18px"><a href="${link}" style="display:inline-block;background:#1a5c38;color:#ffffff;font-weight:700;padding:14px 22px;border-radius:12px;text-decoration:none">Add my family’s numbers →</a></p>
${p('No password needed. Each person gets one text and replies YES to join, and STOP works anytime.')}
${p('Sarah<br>DinnerDrop')}
<p style="margin:24px 0 0;font-size:12px;color:#8a8577">You’re getting this because you signed up at dinnerdrop.app. <a href="${unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
</div></body></html>`
}

export function textingText(firstName: string | undefined, link: string, unsubscribeUrl: string): string {
  return `Hi ${firstName || 'there'},

It's Sarah from DinnerDrop. There's one part of DinnerDrop most families haven't turned on yet, and it's my favorite: family texting.

Add your family's phone numbers and DinnerDrop texts everyone the week's dinner options. They reply with the numbers they want, and the top picks become your week. Anyone can text "ADD milk" to put it on the grocery list, and you get a heads-up before you order. Nobody installs an app. It's just texts.

It's included with your Family plan, and it takes about 30 seconds:
Add my family's numbers: ${link}

No password needed. Each person gets one text and replies YES to join, and STOP works anytime.

Sarah
DinnerDrop

Unsubscribe: ${unsubscribeUrl}`
}

type Rec = { email: string; userId: string; firstName?: string; link: string; unsubscribeUrl: string }

export async function textingRecipients(admin: SupabaseClient, now = new Date()): Promise<Rec[]> {
  const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString()
  const { data: profs } = await admin.from('profiles').select('id, email, full_name, email_unsubscribed, household_id, subscription_status, is_beta_member, family_until').lt('created_at', cutoff)
  const cands = (profs ?? []).filter((p) => p.email && !p.email_unsubscribed && !INTERNAL.test(p.email) && isFamilyProfile(p))
  const hh = cands.map((p) => p.household_id).filter(Boolean) as string[]
  const withPhone = new Set<string>()
  for (let i = 0; i < hh.length; i += 200) {
    const { data } = await admin.from('household_members').select('household_id').in('household_id', hh.slice(i, i + 200)).not('phone', 'is', null)
    for (const r of data ?? []) withPhone.add(r.household_id)
  }
  return cands
    .filter((p) => !p.household_id || !withPhone.has(p.household_id))
    .map((p) => ({ email: p.email as string, userId: p.id, firstName: p.full_name ? String(p.full_name).split(' ')[0] : undefined, link: textingUrl(p.id, TEXTING), unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}` }))
}

export async function runTexting(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 100000
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_texting').maybeSingle()
  const v = (kv?.value as { status?: string; sendOn?: string } | null) ?? null
  const report = { status: v?.status ?? 'not approved', sent: 0, failed: 0 }
  if (v?.status !== 'approved' || !v.sendOn) return report
  const todayET = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (todayET < v.sendOn) return { ...report, status: `waiting for ${v.sendOn}` }
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const recs = await textingRecipients(admin, now)
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', TEXTING)
  const sentSet = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  for (const r of recs) {
    if (sentSet.has(r.email.toLowerCase())) continue
    if (Date.now() - started > budget) break
    const { error } = await resend.emails.send({
      from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email, subject: TEXTING_SUBJECT,
      html: textingHtml(r.firstName, r.link, r.unsubscribeUrl), text: textingText(r.firstName, r.link, r.unsubscribeUrl),
      headers: { 'List-Unsubscribe': `<${r.unsubscribeUrl.replace('/unsubscribe?', '/api/email/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { report.failed++; await new Promise((res) => setTimeout(res, 1100)); continue }
    await admin.from('campaign_sends').insert({ campaign: TEXTING, email: r.email.toLowerCase(), user_id: r.userId, variant: 'texting', sent_at: now.toISOString() })
    report.sent++
    await new Promise((res) => setTimeout(res, 300))
  }
  return report
}
