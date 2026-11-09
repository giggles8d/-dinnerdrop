/**
 * "Your Family plan ends in 3 days" (Nov 8 2026 review: 82 families' free Family runs out Nov 14–30 and nothing told
 * them or asked them to keep it; 0 paying families). One email per family per end date, three days before it ends,
 * with what their family actually used. Plus a dashboard banner (components/FamilyEndingBanner).
 *
 * Runs from /api/cron/campaigns only once app_kv `campaign_family_ending` is { status: 'approved' } (Sarah approves
 * the copy first). Skips paying/trialing families, unsubscribed addresses and internal accounts.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const FAMILY_ENDING = 'family-ending'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$|@camcomfginc\.com$)/i
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface FamilyUsage { plans: number; carts: number; texters: number; votes: number; familyRecipes: number }

export function endDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })
}

export function familyEndingSubject(endIso: string): string {
  const day = new Date(endIso).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' })
  return `Your DinnerDrop Family plan ends ${day}`
}

export function familyEndingHtml(o: { firstName?: string; endIso: string; usage: FamilyUsage; unsubscribeUrl: string }): string {
  const { usage: u } = o
  const cta = `${APP}/subscribe?utm_source=email&utm_medium=lifecycle&utm_campaign=family_ending`
  const used: string[] = []
  if (u.texters) used.push(`${u.texters} ${u.texters === 1 ? 'person' : 'people'} in your family on the dinner texts${u.votes ? `, with ${u.votes} vote${u.votes === 1 ? '' : 's'} cast` : ''}`)
  if (u.familyRecipes) used.push(`${u.familyRecipes} of your own family recipe${u.familyRecipes === 1 ? '' : 's'} saved`)
  if (u.plans) used.push(`${u.plans} week${u.plans === 1 ? '' : 's'} of dinners planned`)
  if (u.carts) used.push(`${u.carts} grocery list${u.carts === 1 ? '' : 's'} sent to the store`)
  const usedBlock = used.length ? `
    <p style="margin:0 0 8px;font-size:15px;color:#3d4a43">Here's what your family did with it so far:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.6;color:#1f2a24">${used.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''
  const li = (t: string) => `<li>${t}</li>`
  return `<!doctype html><html><body style="margin:0;background:#f6f4ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 28px 8px">
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#1a5c38;letter-spacing:.04em">DINNERDROP</p>
    <p style="margin:0 0 14px;font-size:16px;color:#1f2a24">Hi ${esc(o.firstName || 'there')},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1f2a24">Your free DinnerDrop Family plan ends on <strong>${esc(endDateLabel(o.endIso))}</strong>.</p>
    ${usedBlock}
    <p style="margin:0 0 8px;font-size:15px;color:#3d4a43">After that, these stop:</p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#1f2a24">
      ${li('The weekly dinner vote by text for everyone in the house')}
      ${li('The shared grocery list anyone can text items to')}
      ${li('Each person’s likes, no-thanks and allergies in the plan')}
      ${li('Sending your list straight into your Kroger cart')}
    </ul>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3d4a43">Your weekly plan and the one-tap Instacart cart stay free either way.</p>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.55;color:#1f2a24">To keep Family, it's <strong>$4.99 a month</strong> or <strong>$39 a year</strong>. You pay $0 today, your first charge comes 14 days after you start, and you can cancel in one tap from your Account page. We email you three days before any charge.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 26px"><tr><td style="border-radius:12px;background:#1a5c38">
      <a href="${cta}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">Keep the Family plan</a>
    </td></tr></table>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.55;color:#1f2a24">If it isn't worth $4.99 to you yet, just reply and tell me why. I read every reply.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#1f2a24">Sarah<br><span style="color:#6b7a72">Founder, DinnerDrop</span></p>
  </td></tr></table>
  <p style="margin:16px 0 0;font-size:12px;color:#8a958f">You're getting this because you have a DinnerDrop account. <a href="${o.unsubscribeUrl}" style="color:#8a958f">Unsubscribe</a></p>
  </td></tr></table></body></html>`
}

/** What a family used while on Family (for the email). */
export async function familyUsage(admin: SupabaseClient, p: { id: string; household_id: string | null }): Promise<FamilyUsage> {
  const [plans, carts, favs, members] = await Promise.all([
    admin.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
    admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
    admin.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', p.id).eq('meal_data->>familyRecipe', 'true'),
    p.household_id ? admin.from('household_members').select('id, profile_id, phone_opt_in_at').eq('household_id', p.household_id) : Promise.resolve({ data: [] as Array<{ id: string; profile_id: string | null; phone_opt_in_at: string | null }> }),
  ])
  const texting = (members.data ?? []).filter((m) => m.phone_opt_in_at)
  let votes = 0
  if (texting.length) {
    const { count } = await admin.from('meal_votes').select('id', { count: 'exact', head: true }).in('member_id', texting.map((m) => m.id))
    votes = count ?? 0
  }
  return { plans: plans.count ?? 0, carts: carts.count ?? 0, familyRecipes: favs.count ?? 0, texters: texting.length, votes }
}

interface Row { id: string; email: string | null; full_name: string | null; household_id: string | null; family_until: string; subscription_status: string | null; is_beta_member: boolean | null; email_unsubscribed: boolean | null }

/** Families whose free Family ends 2–3 days from now and who aren't paying. */
export async function familyEndingRecipients(admin: SupabaseClient, now = new Date()): Promise<Row[]> {
  const from = new Date(now.getTime() + 48 * 3600000).toISOString()
  const to = new Date(now.getTime() + 72 * 3600000).toISOString()
  const { data } = await admin.from('profiles').select('id, email, full_name, household_id, family_until, subscription_status, is_beta_member, email_unsubscribed').gte('family_until', from).lt('family_until', to)
  return ((data ?? []) as Row[]).filter((p) => p.email && !p.email_unsubscribed && !p.is_beta_member && !INTERNAL.test(p.email) && !['active', 'trialing', 'past_due'].includes(p.subscription_status ?? ''))
}

export async function runFamilyEnding(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_family_ending').maybeSingle()
  const status = (kv?.value as { status?: string } | null)?.status
  const report = { status: status ?? 'not approved', due: 0, sent: 0, failed: 0 }
  const recs = await familyEndingRecipients(admin, now)
  report.due = recs.length
  if (status !== 'approved') return report
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data: done } = await admin.from('campaign_sends').select('user_id, variant').eq('campaign', FAMILY_ENDING).in('user_id', recs.map((r) => r.id).concat(['00000000-0000-0000-0000-000000000000']))
  const sent = new Set((done ?? []).map((d) => `${d.user_id}:${d.variant}`))
  for (const r of recs) {
    const variant = r.family_until.slice(0, 10)   // one email per end date
    if (sent.has(`${r.id}:${variant}`)) continue
    if (Date.now() - started > (opts.budgetMs ?? 60000)) break
    const usage = await familyUsage(admin, r)
    const unsubscribeUrl = `${APP}/unsubscribe?uid=${r.id}`
    const { error } = await resend.emails.send({
      from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email!,
      subject: familyEndingSubject(r.family_until),
      html: familyEndingHtml({ firstName: r.full_name?.split(' ')[0], endIso: r.family_until, usage, unsubscribeUrl }),
      headers: { 'List-Unsubscribe': `<${APP}/api/email/unsubscribe?uid=${r.id}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) { report.failed++; continue }
    await admin.from('campaign_sends').insert({ campaign: FAMILY_ENDING, email: r.email!.toLowerCase(), user_id: r.id, variant, sent_at: now.toISOString() })
    report.sent++
    await new Promise((res) => setTimeout(res, 260))
  }
  return report
}
