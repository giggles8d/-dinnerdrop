/**
 * Family for everyone (Sarah, Oct 31 2026): every family should have texting.
 *  - Existing families without Family access: 6 months, granted once by the admin route, with an email.
 *  - New sign-ups: 14 days of Family automatically, no card (granted on their first dashboard load).
 * Both set profiles.family_until and a marker in settings.promos so nothing is granted twice.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { isFamilyProfile } from '@/lib/access'
import { emailShell, sendEmail } from '@/lib/notify'

const APP = 'https://www.dinnerdrop.app'
export const FAMILY_6MO = 'family-6mo-2026-10-31'
export const AUTO_TRIAL = 'family-14d-auto'
const INTERNAL = /^setzl/i

type Prof = { id: string; email: string | null; full_name: string | null; created_at: string; subscription_status: string | null; is_beta_member: boolean | null; family_until: string | null; settings: unknown; email_unsubscribed: boolean | null }

function promosOf(p: { settings: unknown }): Record<string, unknown> {
  const s = (p.settings && typeof p.settings === 'object' ? p.settings : {}) as Record<string, unknown>
  return (s.promos && typeof s.promos === 'object' ? s.promos : {}) as Record<string, unknown>
}

async function setFamily(admin: SupabaseClient, p: Prof, until: Date, marker: string, days: number): Promise<void> {
  const settings = (p.settings && typeof p.settings === 'object' ? p.settings : {}) as Record<string, unknown>
  const promos = { ...promosOf(p), [marker]: { days, grantedAt: new Date().toISOString() } }
  await admin.from('profiles').update({ family_until: until.toISOString(), settings: { ...settings, promos } }).eq('id', p.id)
}

/** New family's first dashboard load: 14 days of Family, no card. Returns true if granted now. */
export async function grantNewFamilyTrial(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from('profiles').select('id, email, full_name, created_at, subscription_status, is_beta_member, family_until, settings, email_unsubscribed').eq('id', userId).maybeSingle()
  const p = data as Prof | null
  if (!p) return false
  if (isFamilyProfile(p)) return false
  if (promosOf(p)[AUTO_TRIAL] || promosOf(p)[FAMILY_6MO]) return false
  // Only brand-new accounts (the first-plan path runs for them); older accounts are handled by the 6-month grant.
  if (Date.now() - new Date(p.created_at).getTime() > 3 * 86400000) return false
  const until = new Date(new Date(p.created_at).getTime() + 14 * 86400000)
  await setFamily(admin, p, until, AUTO_TRIAL, 14)
  return true
}

/** Families with no Family access right now (existing accounts), for the 6-month grant. */
export async function familiesWithoutFamily(admin: SupabaseClient): Promise<Prof[]> {
  const { data } = await admin.from('profiles').select('id, email, full_name, created_at, subscription_status, is_beta_member, family_until, settings, email_unsubscribed').order('created_at')
  return ((data ?? []) as Prof[]).filter((p) => p.email && !INTERNAL.test(p.email) && !isFamilyProfile(p) && !promosOf(p)[FAMILY_6MO])
}

export function familyEmailSubject(): string { return 'Family texting is on for you — 6 months, on us' }

export function familyEmailHtml(p: { id: string; full_name: string | null }, untilLabel: string): string {
  const first = p.full_name ? String(p.full_name).trim().split(' ')[0] : ''
  const body = `
    <p>${first ? `Hi ${first},` : 'Hi,'}</p>
    <p>We've switched on the Family plan for you — free through <strong>${untilLabel}</strong>, no card, nothing to cancel.</p>
    <p>The part families use most is <strong>texting</strong>: add your people's numbers once, and every week the dinner ideas go to everyone by text. They reply with numbers, the top picks become the week, and anyone can text "add bananas" to put it on the list — or "how about tacos" to get it on next week's ballot.</p>
    <p>It takes about a minute to set up. Tap below, add two or three numbers, and the first text goes out.</p>
    <p style="font-size:13px;color:#6e7470">Also included: a profile for each person (likes, dislikes, allergies), text reminders, and the Kroger cart push. When the six months end you go back to the free plan automatically.</p>`
  return emailShell('Your family can vote on dinner now', body, { label: 'Add the family’s numbers →', href: `${APP}/dashboard?texting=1&utm_source=email&utm_medium=lifecycle&utm_campaign=family_6mo` })
    .replace('You’re getting this because reminders are on in your DinnerDrop settings.', 'You’re getting this because you signed up at dinnerdrop.app.')
    .replace(`${APP}/unsubscribe`, `${APP}/unsubscribe?uid=${p.id}`)
}

/** Grant 6 months to everyone without Family; email each (skips unsubscribed and already-sent). */
export async function grantFamilySixMonths(admin: SupabaseClient, opts: { apply: boolean; email: boolean; budgetMs?: number }): Promise<{ eligible: number; granted: number; emailed: number; failed: number; sample: string[] }> {
  const started = Date.now()
  const budget = opts.budgetMs ?? 240000
  const people = await familiesWithoutFamily(admin)
  const report = { eligible: people.length, granted: 0, emailed: 0, failed: 0, sample: people.slice(0, 5).map((p) => `${p.email} (${p.created_at.slice(0, 10)})`) }
  if (!opts.apply) return report
  const until = new Date(); until.setMonth(until.getMonth() + 6)
  const untilLabel = until.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', FAMILY_6MO)
  const sent = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  for (const p of people) {
    if (Date.now() - started > budget) break
    await setFamily(admin, p, until, FAMILY_6MO, 183)
    report.granted++
    if (!opts.email || !p.email || p.email_unsubscribed || sent.has(p.email.toLowerCase())) continue
    const r = await sendEmail(p.email, familyEmailSubject(), familyEmailHtml(p, untilLabel))
    if (!r.ok) { report.failed++; continue }
    await admin.from('campaign_sends').insert({ campaign: FAMILY_6MO, email: p.email.toLowerCase(), user_id: p.id, variant: 'all', sent_at: new Date().toISOString() })
    report.emailed++
    await new Promise((res) => setTimeout(res, 250))
  }
  return report
}
