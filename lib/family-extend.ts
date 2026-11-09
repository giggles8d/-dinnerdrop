/**
 * Free Family runs out → 3 more months, on us (Sarah, Nov 8 2026). On the day a family's free Family plan ends,
 * add 3 months and send one of two emails:
 *  - 'thanks': families who used DinnerDrop (came back after day one, sent a list, saved favorites or texted)
 *  - 'try':    everyone else, inviting them to try the family vote by text and the newest features
 *
 * Runs from /api/cron/campaigns only while app_kv `campaign_family_extend` is { status: 'approved', through: 'YYYY-MM-DD' }:
 * only plans ending on or before `through` are extended. Skips paying/trialing families, unsubscribed addresses
 * (they still get the months, just no email) and internal accounts. One extension per end date (campaign_sends).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { textingUrl } from '@/lib/followup'

export const FAMILY_EXTEND = 'family-extend'
export const EXTEND_DAYS = 92
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$|@camcomfginc\.com$)/i
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const link = (path: string, c: string) => `${APP}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_medium=lifecycle&utm_campaign=family_extend_${c}`

export type ExtendVariant = 'thanks' | 'try'
export interface FamilyUsage { plans: number; carts: number; texters: number; votes: number; favorites: number }

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
}

export function extendSubject(v: ExtendVariant): string {
  return v === 'thanks' ? 'Thank you. Here are 3 more months of Family, on us' : 'Your Family plan is free for 3 more months'
}

const NEW = [
  ['🗳️', 'Everyone votes on dinner by text', 'Each person gets the week’s dinner ideas by text and replies with numbers, or taps the photos on a page. The top picks become your week. Nobody downloads an app.'],
  ['♥', 'Family favorites', 'Anyone can tap ♡ on a dinner to save it, and favorites come back into the vote when you’re in the mood.'],
  ['🔁', 'Bring dinners back', 'On Thursdays, the family taps the dinners they’d eat again soon.'],
  ['🛒', 'Text the grocery list', 'Anyone texts “milk” or a photo of the empty box, and it lands on the shared list.'],
  ['🥗', 'New plan styles', 'Diabetic-friendly, Heart-healthy, Mediterranean and Slow cooker, alongside 30-minute, Budget and the rest. Pick them in Settings.'],
]

function shell(inner: string, unsubscribeUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 28px 8px">
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#1a5c38;letter-spacing:.04em">DINNERDROP</p>
    ${inner}
    <p style="margin:0 0 24px;font-size:15px;color:#1f2a24">Sarah<br><span style="color:#6b7a72">Founder, DinnerDrop</span></p>
  </td></tr></table>
  <p style="margin:16px 0 0;font-size:12px;color:#8a958f">You're getting this because you have a DinnerDrop account. <a href="${unsubscribeUrl}" style="color:#8a958f">Unsubscribe</a></p>
  </td></tr></table></body></html>`
}

const p = (t: string, extra = '') => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1f2a24${extra}">${t}</p>`
const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr><td style="border-radius:12px;background:#1a5c38"><a href="${href}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${label}</a></td></tr></table>`
const features = (items: string[][]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px">${items.map(([e, t, b]) => `
  <tr><td style="padding:0 0 14px"><p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#1f2a24">${e} ${t}</p><p style="margin:0;font-size:15px;line-height:1.5;color:#3d4a43">${b}</p></td></tr>`).join('')}</table>`

export function extendHtml(o: { variant: ExtendVariant; firstName?: string; newUntilIso: string; usage: FamilyUsage; textingLink: string; unsubscribeUrl: string }): string {
  const hi = p(`Hi ${esc(o.firstName || 'there')},`)
  const until = `<strong>${esc(dateLabel(o.newUntilIso))}</strong>`
  if (o.variant === 'thanks') {
    const u = o.usage
    const did: string[] = []
    if (u.plans) did.push(`${u.plans} week${u.plans === 1 ? '' : 's'} of dinners planned`)
    if (u.carts) did.push(`${u.carts} grocery list${u.carts === 1 ? '' : 's'} sent to the store`)
    if (u.favorites) did.push(`${u.favorites} dinner${u.favorites === 1 ? '' : 's'} saved to favorites`)
    if (u.texters) did.push(`${u.texters} ${u.texters === 1 ? 'person' : 'people'} voting by text${u.votes ? ` (${u.votes} vote${u.votes === 1 ? '' : 's'})` : ''}`)
    const didBlock = did.length ? `<ul style="margin:-6px 0 18px;padding-left:20px;font-size:15px;line-height:1.6;color:#1f2a24">${did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''
    return shell(`${hi}
      ${p('Thank you for planning dinner with DinnerDrop these first weeks. It means a lot to a small app like ours.')}
      ${did.length ? p('So far your family has:', ';margin-bottom:8px') : ''}${didBlock}
      ${p(`Your free Family plan was ending today, so I added <strong>3 more months, free</strong>. It now runs until ${until}. No card, nothing to cancel.`)}
      ${p('Here is what’s new since you joined:', ';margin-bottom:12px')}
      ${features(u.texters ? NEW.slice(1) : NEW)}
      ${u.texters ? '' : button(o.textingLink, 'Add your family’s numbers')}
      ${p('If something isn’t working for your family, reply and tell me. I read every reply and fix what I can.', ';font-size:15px')}`, o.unsubscribeUrl)
  }
  return shell(`${hi}
    ${p(`Your free Family plan was ending today. Instead, I’ve added <strong>3 more months, free</strong>, so you have time to really try it. It now runs until ${until}. No card, nothing to cancel.`)}
    ${p('The part that makes DinnerDrop different is the dinner vote by text: you add everyone’s phone number once, and each week they get the dinner ideas and text back the ones they want. No more “what’s for dinner?” and no app for the kids to download.')}
    ${button(o.textingLink, 'Add your family’s numbers (1 minute)')}
    ${p('A few more things to try:', ';margin-bottom:12px')}
    ${features(NEW.slice(1))}
    ${p(`Your next week of dinners is already waiting: <a href="${link('/dashboard', 'try')}" style="color:#1a5c38;font-weight:700">open DinnerDrop</a>.`, ';font-size:15px')}
    ${p('If DinnerDrop didn’t fit your family, reply and tell me why. It helps more than you’d think.', ';font-size:15px')}`, o.unsubscribeUrl)
}

export async function familyUsage(admin: SupabaseClient, prof: { id: string; household_id: string | null }): Promise<FamilyUsage> {
  const [plans, carts, favs, members] = await Promise.all([
    admin.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', prof.id),
    admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', prof.id),
    admin.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', prof.id),
    prof.household_id ? admin.from('household_members').select('id, profile_id, phone_opt_in_at').eq('household_id', prof.household_id) : Promise.resolve({ data: [] as Array<{ id: string; profile_id: string | null; phone_opt_in_at: string | null }> }),
  ])
  const texting = (members.data ?? []).filter((m) => m.phone_opt_in_at && m.profile_id !== prof.id)
  let votes = 0
  if (texting.length) {
    const { count } = await admin.from('meal_votes').select('id', { count: 'exact', head: true }).in('member_id', texting.map((m) => m.id))
    votes = count ?? 0
  }
  return { plans: plans.count ?? 0, carts: carts.count ?? 0, favorites: favs.count ?? 0, texters: texting.length, votes }
}

/** Used it = came back after day one, sent a list, saved a favorite, or has family texting on. */
const USER_STEPS = ['dashboard_view', 'plan_seen', 'grocery_list_view', 'recipe_view', 'cta_tap']
export async function usedIt(admin: SupabaseClient, prof: { id: string; created_at: string }, usage: FamilyUsage): Promise<boolean> {
  if (usage.carts || usage.favorites || usage.texters) return true
  const after = new Date(new Date(prof.created_at).getTime() + 86400000).toISOString()
  const { count } = await admin.from('activation_events').select('id', { count: 'exact', head: true }).eq('user_id', prof.id).in('step', USER_STEPS).gte('created_at', after)
  return (count ?? 0) > 0
}

interface Row { id: string; email: string | null; full_name: string | null; household_id: string | null; created_at: string; family_until: string; subscription_status: string | null; is_beta_member: boolean | null; email_unsubscribed: boolean | null }

/** Free Family plans ending in the next day (or that ended in the last 12 hours), not paying, up to `through`. */
export async function extendCandidates(admin: SupabaseClient, now: Date, through: string): Promise<Row[]> {
  const from = new Date(now.getTime() - 12 * 3600000).toISOString()
  const to = new Date(Math.min(now.getTime() + 24 * 3600000, new Date(`${through}T23:59:59-05:00`).getTime())).toISOString()
  if (to <= from) return []
  const { data } = await admin.from('profiles').select('id, email, full_name, household_id, created_at, family_until, subscription_status, is_beta_member, email_unsubscribed').gte('family_until', from).lt('family_until', to)
  return ((data ?? []) as Row[]).filter((r) => r.email && !r.is_beta_member && !INTERNAL.test(r.email) && !['active', 'trialing', 'past_due'].includes(r.subscription_status ?? ''))
}

export async function runFamilyExtend(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_family_extend').maybeSingle()
  const cfg = (kv?.value as { status?: string; through?: string } | null) ?? {}
  const report = { status: cfg.status ?? 'not approved', through: cfg.through ?? null, extended: 0, thanks: 0, try: 0, failed: 0 }
  if (cfg.status !== 'approved' || !cfg.through) return report
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const recs = await extendCandidates(admin, now, cfg.through)
  const { data: done } = await admin.from('campaign_sends').select('user_id, variant').eq('campaign', FAMILY_EXTEND).in('user_id', recs.map((r) => r.id).concat(['00000000-0000-0000-0000-000000000000']))
  const seen = new Set((done ?? []).map((d) => `${d.user_id}:${String(d.variant).split('|')[1]}`))
  for (const r of recs) {
    const endKey = r.family_until.slice(0, 10)
    if (seen.has(`${r.id}:${endKey}`)) continue
    if (Date.now() - started > (opts.budgetMs ?? 60000)) break
    const base = Math.max(new Date(r.family_until).getTime(), now.getTime())
    const newUntil = new Date(base + EXTEND_DAYS * 86400000).toISOString()
    const usage = await familyUsage(admin, r)
    const variant: ExtendVariant = (await usedIt(admin, r, usage)) ? 'thanks' : 'try'
    // Only extend if the plan still ends when we read it (no double extension if two runs overlap).
    const { data: upd, error: updErr } = await admin.from('profiles').update({ family_until: newUntil }).eq('id', r.id).eq('family_until', r.family_until).select('id')
    if (updErr || !upd?.length) { report.failed++; continue }
    report.extended++
    // The record goes in before the email, so a failed or slow send never extends twice.
    await admin.from('campaign_sends').insert({ campaign: FAMILY_EXTEND, email: r.email!.toLowerCase(), user_id: r.id, variant: `${variant}|${endKey}`, sent_at: now.toISOString() })
    if (r.email_unsubscribed) continue
    const { error } = await resend.emails.send({
      from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email!,
      subject: extendSubject(variant),
      html: extendHtml({ variant, firstName: r.full_name?.split(' ')[0], newUntilIso: newUntil, usage, textingLink: textingUrl(r.id, `family_extend_${variant}`), unsubscribeUrl: `${APP}/unsubscribe?uid=${r.id}` }),
      headers: { 'List-Unsubscribe': `<${APP}/api/email/unsubscribe?uid=${r.id}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { report.failed++; continue }
    report[variant]++
    await new Promise((res) => setTimeout(res, 260))
  }
  return report
}
