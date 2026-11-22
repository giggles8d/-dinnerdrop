/**
 * The "3 days before" emails (Nov 22 2026 review, Sarah approved, decision 5: build the day-11 email so the
 * promise is true). The site says "We email you 3 days before your free Family days end" and "3 days before any
 * charge". This makes both true:
 *
 *  1. Free Family days ending (profiles.family_until, no card): what stays free, what stops, one button to add a
 *     card and keep Family (/subscribe). Respects email_unsubscribed.
 *  2. Stripe trial ending (profiles.trial_ends_at, card on file): the charge reminder. Amount and date come from
 *     Stripe when it can be read ($4.99/month or $39/year, or the plan's own price), plus how to cancel from the
 *     Account page (Stripe's customer portal). This is a billing notice, so like the payment-failed email in the
 *     Stripe webhook it is sent even to families who turned off other emails. Skipped when the subscription is
 *     already set to cancel, since no charge will happen.
 *
 * Call runTrialEndingEmails(admin, now) once a day from the daily cron (12:00 UTC). Each run takes ends that fall
 * between 2 and 3 days from now, so a daily run sees each end once. Every send is recorded in campaign_sends
 * (campaign = '<name>:<end date>', primary key campaign + email), claimed before sending, so it never sends twice.
 * Skips internal addresses, @camcomfginc.com, and Sarah's own household, like the other bulk senders.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { sendEmail } from '@/lib/notify'
import { familyUsage } from '@/lib/family-extend'
import { FAMILY_PRICING } from '@/lib/stripe'

export const FAMILY_ENDING_CAMPAIGN = 'family-ending-3d'
export const TRIAL_CHARGE_CAMPAIGN = 'trial-charge-3d'

const APP = 'https://www.dinnerdrop.app'
const DAY = 86400000
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$|@camcomfginc\.com$)/i
const SARAH = 'setzl1979@gmail.com'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const utm = (path: string, c: string) => `${APP}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_medium=lifecycle&utm_campaign=${c}`

interface Prof {
  id: string
  email: string | null
  full_name: string | null
  timezone: string | null
  household_id: string | null
  family_until: string | null
  trial_ends_at: string | null
  subscription_status: string | null
  is_beta_member: boolean | null
  email_unsubscribed: boolean | null
  stripe_customer_id: string | null
}
const COLS = 'id, email, full_name, timezone, household_id, family_until, trial_ends_at, subscription_status, is_beta_member, email_unsubscribed, stripe_customer_id'

function firstName(p: { full_name: string | null }): string {
  return (p.full_name ?? '').trim().split(/\s+/)[0] ?? ''
}

function tzOf(p: { timezone: string | null }): string {
  const tz = (p.timezone ?? '').trim()
  if (!tz) return 'America/New_York'
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz } catch { return 'America/New_York' }
}

/** "Thursday, November 27" in the family's time zone. */
export function dayLabel(iso: string | number | Date, tz = 'America/New_York'): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz })
}

// ---------- shared email frame ----------

function shell(o: { preview: string; inner: string; footer: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 28px 8px">
    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#1a5c38;letter-spacing:.04em">DINNERDROP</p>
    ${o.inner}
    <p style="margin:0 0 24px;font-size:15px;color:#1f2a24">Sarah<br><span style="color:#6b7a72">Founder, DinnerDrop</span></p>
  </td></tr></table>
  <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8a958f;max-width:520px">${o.footer}</p>
  </td></tr></table></body></html>`
}
const p = (t: string, extra = '') => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1f2a24${extra}">${t}</p>`
const list = (items: string[]) => `<ul style="margin:-8px 0 18px;padding-left:20px;font-size:15px;line-height:1.6;color:#1f2a24">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr><td style="border-radius:12px;background:#1a5c38"><a href="${href}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${label}</a></td></tr></table>`

// ---------- 1. free Family days ending ----------

export interface FamilyEndingInput { userId: string; firstName?: string; endsIso: string; tz?: string; texters?: number }

export function familyEndingSubject(o: { endsIso: string; tz?: string }): string {
  return `Your free Family days end ${dayLabel(o.endsIso, o.tz)}`
}

export function familyEndingEmail(o: FamilyEndingInput): { subject: string; html: string; text: string } {
  const date = dayLabel(o.endsIso, o.tz)
  const keepUrl = utm('/subscribe?from=family_ending', 'family_ending_3d')
  const unsub = `${APP}/unsubscribe?uid=${o.userId}`
  const textingLine = o.texters
    ? `Family texting: ${o.texters === 1 ? "1 person gets the week's dinners by text and votes" : `${o.texters} people get the week's dinners by text and vote`} on them`
    : "Family texting: everyone gets the week's dinners by text and votes on them"
  const stops = [textingLine, 'A profile for each person (likes, dislikes, allergies)', 'Text reminders on cook nights', 'Sending your list to a Kroger cart']
  const stays = ['Your weekly dinner plan', 'The grocery list', 'Sending the list to Instacart or Walmart']
  const price = `${FAMILY_PRICING.monthly.label.replace('/month', ' a month')} or ${FAMILY_PRICING.yearly.label.replace('/year', ' a year')}`
  const subject = familyEndingSubject(o)
  const preview = 'Planning and your grocery cart stay free. Add a card to keep family texting.'
  const html = shell({
    preview,
    inner: `${p(`Hi ${esc(o.firstName || 'there')},`)}
      ${p(`Your free DinnerDrop Family days end on <strong>${esc(date)}</strong>. After that you move to the free plan. Nothing is charged and there is nothing to cancel.`)}
      ${p('Still free after that:', ';margin-bottom:8px')}${list(stays.map(esc))}
      ${p(`Stops on ${esc(date)}:`, ';margin-bottom:8px')}${list(stops.map(esc))}
      ${p(`To keep Family, add a card. Family is ${esc(price)}. You'll see the date of your first charge before you confirm, we email you 3 days before any charge, and you can cancel from your Account page.`)}
      ${button(keepUrl, 'Add a card and keep Family')}
      ${p('Your plans, favorites and lists stay either way. If something isn’t working for your family, reply to this email and tell me.', ';font-size:15px')}`,
    footer: `You're getting this because your free DinnerDrop Family days are ending. <a href="${unsub}" style="color:#8a958f">Unsubscribe</a>`,
  })
  const text = [
    `Hi ${o.firstName || 'there'},`,
    `Your free DinnerDrop Family days end on ${date}. After that you move to the free plan. Nothing is charged and there is nothing to cancel.`,
    `Still free after that:\n- ${stays.join('\n- ')}`,
    `Stops on ${date}:\n- ${stops.join('\n- ')}`,
    `To keep Family, add a card. Family is ${price}. You'll see the date of your first charge before you confirm, we email you 3 days before any charge, and you can cancel from your Account page.`,
    `Add a card and keep Family: ${keepUrl}`,
    'Your plans, favorites and lists stay either way. If something isn’t working for your family, reply to this email and tell me.',
    'Sarah\nFounder, DinnerDrop',
    `Unsubscribe: ${unsub}`,
  ].join('\n\n')
  return { subject, html, text }
}

// ---------- 2. Stripe trial ending: the charge reminder ----------

export interface ChargeInput {
  userId: string
  firstName?: string
  chargeIso: string
  tz?: string
  /** Known from Stripe: the plan's price before any discount. Null when Stripe couldn't be read. */
  amountLabel: string | null
  interval: 'month' | 'year' | null
  discounted: boolean
}

export function chargeReminderEmail(o: ChargeInput): { subject: string; html: string; text: string } {
  const date = dayLabel(o.chargeIso, o.tz)
  const accountUrl = utm('/account', 'trial_charge_3d')
  const every = o.interval === 'year' ? 'year' : 'month'
  let charge: string
  if (o.amountLabel && o.discounted) charge = `your Family plan price after your discount (${o.amountLabel} a ${every} before the discount), then every ${every} until you cancel`
  else if (o.amountLabel) charge = `${o.amountLabel} for a ${every} of Family, then ${o.amountLabel} every ${every} until you cancel`
  else charge = `for Family: ${FAMILY_PRICING.monthly.label.replace('/month', ' a month')} or ${FAMILY_PRICING.yearly.label.replace('/year', ' a year')}, depending on the plan you picked, until you cancel`
  const known = !!o.amountLabel
  const subject = known && !o.discounted
    ? `Your Family trial ends ${date}. First charge: ${o.amountLabel}`
    : `Your Family trial ends ${date}`
  const preview = `Unless you cancel before ${date}, your card will be charged. Cancel from your Account page.`
  const lead = known
    ? `Your DinnerDrop Family trial ends on <strong>${esc(date)}</strong>. Unless you cancel before then, the card you added will be charged ${esc(charge)}.`
    : `Your DinnerDrop Family trial ends on <strong>${esc(date)}</strong>. Unless you've already canceled, the card you added will be charged ${esc(charge)}.`
  const html = shell({
    preview,
    inner: `${p(`Hi ${esc(o.firstName || 'there')},`)}
      ${p(lead)}
      ${p('To keep Family, you don’t need to do anything.')}
      ${p(`To cancel, open your Account page and tap <strong>Manage billing</strong>. That opens Stripe's billing page, where you can cancel your plan. If you cancel before ${esc(date)}, you won't be charged.`)}
      ${button(accountUrl, 'Open my Account')}
      ${p('If you cancel, your weekly dinner plan, the grocery list and Instacart and Walmart carts stay free. Questions about billing? Reply to this email.', ';font-size:15px')}`,
    footer: 'This is a billing notice about your DinnerDrop Family trial, so it is sent even if you turned off other DinnerDrop emails.',
  })
  const text = [
    `Hi ${o.firstName || 'there'},`,
    known
      ? `Your DinnerDrop Family trial ends on ${date}. Unless you cancel before then, the card you added will be charged ${charge}.`
      : `Your DinnerDrop Family trial ends on ${date}. Unless you've already canceled, the card you added will be charged ${charge}.`,
    'To keep Family, you don’t need to do anything.',
    `To cancel, open your Account page and tap Manage billing. That opens Stripe's billing page, where you can cancel your plan. If you cancel before ${date}, you won't be charged.`,
    `Open my Account: ${accountUrl}`,
    'If you cancel, your weekly dinner plan, the grocery list and Instacart and Walmart carts stay free. Questions about billing? Reply to this email.',
    'Sarah\nFounder, DinnerDrop',
  ].join('\n\n')
  return { subject, html, text }
}

// ---------- Stripe lookup (read-only) ----------

interface TrialDetails { chargeIso: string; amountLabel: string; interval: 'month' | 'year' | null; discounted: boolean }

function money(cents: number, currency: string): string {
  const v = cents / 100
  return currency.toLowerCase() === 'usd' ? `$${Number.isInteger(v) ? v : v.toFixed(2)}` : `${v.toFixed(2)} ${currency.toUpperCase()}`
}

/**
 * 'none' = Stripe says no trialing subscription will charge (no trial, or already set to cancel): don't send.
 * null   = Stripe couldn't be read: send the reminder with the general wording.
 */
async function stripeTrial(stripe: Stripe | null, customerId: string | null): Promise<TrialDetails | 'none' | null> {
  if (!stripe || !customerId) return null
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 5 })
    const sub = subs.data.filter((s) => s.trial_end).sort((a, b) => (b.trial_end ?? 0) - (a.trial_end ?? 0))[0]
    if (!sub || !sub.trial_end) return 'none'
    if (sub.cancel_at_period_end || (sub.cancel_at && sub.cancel_at <= sub.trial_end)) return 'none'
    const price = sub.items.data[0]?.price
    const interval = price?.recurring?.interval === 'year' ? 'year' : price?.recurring?.interval === 'month' ? 'month' : null
    if (price?.unit_amount == null) return null
    const qty = sub.items.data[0]?.quantity ?? 1
    return {
      chargeIso: new Date(sub.trial_end * 1000).toISOString(),
      amountLabel: money(price.unit_amount * qty, price.currency),
      interval,
      discounted: (sub.discounts?.length ?? 0) > 0,
    }
  } catch (e) {
    console.error('[trial-ending] stripe lookup failed', e instanceof Error ? e.message : e)
    return null
  }
}

// ---------- the run ----------

export interface TrialEndingReport {
  dryRun: boolean
  familyEnding: { candidates: number; sent: number; skipped: number; failed: number }
  chargeReminder: { candidates: number; sent: number; skipped: number; failed: number }
  preview?: string[]
}

async function sarahHousehold(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from('profiles').select('household_id').ilike('email', SARAH).limit(1).maybeSingle()
  return (data?.household_id as string | null | undefined) ?? null
}

/** Claim the send in campaign_sends; false when it was already sent (primary key campaign + email). */
async function claim(admin: SupabaseClient, campaign: string, email: string, userId: string, variant: string, now: Date): Promise<boolean> {
  const { error } = await admin.from('campaign_sends').insert({ campaign, email: email.toLowerCase(), user_id: userId, variant, sent_at: now.toISOString() })
  return !error
}
async function unclaim(admin: SupabaseClient, campaign: string, email: string): Promise<void> {
  await admin.from('campaign_sends').delete().eq('campaign', campaign).eq('email', email.toLowerCase())
}

async function alreadySent(admin: SupabaseClient, campaign: string, email: string): Promise<boolean> {
  const { data } = await admin.from('campaign_sends').select('campaign').eq('campaign', campaign).eq('email', email.toLowerCase()).maybeSingle()
  return !!data
}

export async function runTrialEndingEmails(
  admin: SupabaseClient,
  now = new Date(),
  opts: { budgetMs?: number; dryRun?: boolean } = {},
): Promise<TrialEndingReport> {
  const started = Date.now()
  const budget = opts.budgetMs ?? 60000
  const dryRun = !!opts.dryRun
  const report: TrialEndingReport = {
    dryRun,
    familyEnding: { candidates: 0, sent: 0, skipped: 0, failed: 0 },
    chargeReminder: { candidates: 0, sent: 0, skipped: 0, failed: 0 },
    ...(dryRun ? { preview: [] as string[] } : {}),
  }
  if (!process.env.RESEND_API_KEY && !dryRun) {
    console.log('[trial-ending] RESEND_API_KEY missing, skipping')
    return report
  }
  const from = new Date(now.getTime() + 2 * DAY).toISOString()
  const to = new Date(now.getTime() + 3 * DAY).toISOString()
  const sarahHh = await sarahHousehold(admin)
  const blocked = (pr: Prof) => !pr.email || INTERNAL.test(pr.email) || (!!sarahHh && pr.household_id === sarahHh)

  // 1. Free Family days ending in 2 to 3 days.
  const { data: ending } = await admin.from('profiles').select(COLS).gte('family_until', from).lt('family_until', to)
  const famDone = new Set<string>()   // one email per household per run (partners share the owner's plan)
  for (const pr of (ending ?? []) as Prof[]) {
    if (Date.now() - started > budget) break
    report.familyEnding.candidates++
    const s = pr.subscription_status ?? ''
    // Card on file, founding member (free through Oct 2027), unsubscribed, internal: no email.
    if (blocked(pr) || pr.is_beta_member || pr.email_unsubscribed || ['active', 'trialing', 'past_due'].includes(s) || !pr.family_until) { report.familyEnding.skipped++; continue }
    if (pr.household_id && famDone.has(pr.household_id)) { report.familyEnding.skipped++; continue }
    const campaign = `${FAMILY_ENDING_CAMPAIGN}:${pr.family_until.slice(0, 10)}`
    const email = pr.email!
    if (await alreadySent(admin, campaign, email)) { report.familyEnding.skipped++; continue }
    const usage = await familyUsage(admin, { id: pr.id, household_id: pr.household_id }).catch(() => null)
    const msg = familyEndingEmail({ userId: pr.id, firstName: firstName(pr), endsIso: pr.family_until, tz: tzOf(pr), texters: usage?.texters ?? 0 })
    if (dryRun) { report.preview!.push(`family-ending ${pr.id} ${pr.family_until.slice(0, 10)}: ${msg.subject}`); report.familyEnding.sent++; continue }
    if (!(await claim(admin, campaign, email, pr.id, 'free_days', now))) { report.familyEnding.skipped++; continue }
    const r = await sendEmail(email, msg.subject, msg.html, { text: msg.text })
    if (!r.ok) { await unclaim(admin, campaign, email); report.familyEnding.failed++; continue }
    if (pr.household_id) famDone.add(pr.household_id)
    report.familyEnding.sent++
    await new Promise((res) => setTimeout(res, 260))   // Resend allows 10 requests a second, shared with other jobs
  }

  // 2. Stripe trials ending in 2 to 3 days: the charge reminder.
  const { data: trials } = await admin.from('profiles').select(COLS).eq('subscription_status', 'trialing').gte('trial_ends_at', from).lt('trial_ends_at', to)
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
  for (const pr of (trials ?? []) as Prof[]) {
    if (Date.now() - started > budget) break
    report.chargeReminder.candidates++
    // Billing notice: sent even when email_unsubscribed (as the payment-failed email is). Internal still skipped.
    if (blocked(pr) || !pr.trial_ends_at) { report.chargeReminder.skipped++; continue }
    const campaign = `${TRIAL_CHARGE_CAMPAIGN}:${pr.trial_ends_at.slice(0, 10)}`
    const email = pr.email!
    if (await alreadySent(admin, campaign, email)) { report.chargeReminder.skipped++; continue }
    const st = await stripeTrial(stripe, pr.stripe_customer_id)
    if (st === 'none') { report.chargeReminder.skipped++; continue }   // no charge coming: no trial in Stripe, or set to cancel
    const chargeIso = st?.chargeIso ?? pr.trial_ends_at
    // Stripe's date wins; if it moved more than a day out of this window, a later run will catch it.
    if (Math.abs(Date.parse(chargeIso) - Date.parse(pr.trial_ends_at)) > DAY) { report.chargeReminder.skipped++; continue }
    const msg = chargeReminderEmail({
      userId: pr.id, firstName: firstName(pr), chargeIso, tz: tzOf(pr),
      amountLabel: st?.amountLabel ?? null, interval: st?.interval ?? null, discounted: st?.discounted ?? false,
    })
    if (dryRun) { report.preview!.push(`trial-charge ${pr.id} ${pr.trial_ends_at.slice(0, 10)}: ${msg.subject}`); report.chargeReminder.sent++; continue }
    if (!(await claim(admin, campaign, email, pr.id, st ? 'stripe' : 'fallback', now))) { report.chargeReminder.skipped++; continue }
    const r = await sendEmail(email, msg.subject, msg.html, { text: msg.text })
    if (!r.ok) { await unclaim(admin, campaign, email); report.chargeReminder.failed++; continue }
    report.chargeReminder.sent++
    await new Promise((res) => setTimeout(res, 260))
  }
  return report
}
