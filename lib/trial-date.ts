/**
 * When does a family's Stripe trial end? (Nov 22 2026 review, Sarah approved: "the Stripe trial ends when the
 * family's free Family days end, so the first charge is on day 15, not up to day 28".)
 *
 * One rule, used by checkout (Stripe's subscription_data.trial_end) and by /subscribe (the date it shows):
 *  - Free Family days still running (family_until in the future): the trial ends when they end.
 *    Stripe Checkout needs trial_end at least 48 hours out, so a family with under 2 days left gets 2 days
 *    (their first charge can be up to 2 days after the free days end, never before).
 *    Stripe allows at most 730 days (founding families are free through Oct 2027, well inside that).
 *  - Free days already over (family_until in the past): no trial, the first charge is today.
 *  - Never had free days (family_until empty, e.g. went straight from sign-up to /subscribe before the first
 *    plan granted them): the standard 14-day trial, so every family still gets its 14 free days.
 * Pure and client-safe (no Stripe SDK import).
 */
/** Standard Family trial length (lib/stripe re-exports this). */
export const FAMILY_TRIAL_DAYS = 14

const DAY = 24 * 60 * 60 * 1000
const STRIPE_MIN_TRIAL_MS = 49 * 60 * 60 * 1000 // 48 h minimum plus an hour of margin while checkout is open
const STRIPE_MAX_TRIAL_MS = 730 * DAY

export interface TrialPlan {
  /** Unix seconds for Stripe's subscription_data.trial_end, or null for no trial (charge at checkout). */
  trialEnd: number | null
  /** When the first charge happens. */
  firstCharge: Date
  /** Why: for logs and the page. */
  basis: 'free_days' | 'free_days_min_48h' | 'free_days_over' | 'standard_14'
}

export function trialPlan(familyUntil: string | null | undefined, now: Date = new Date()): TrialPlan {
  const t = now.getTime()
  const until = familyUntil ? new Date(familyUntil).getTime() : NaN
  if (!Number.isFinite(until)) {
    const end = t + FAMILY_TRIAL_DAYS * DAY
    return { trialEnd: Math.floor(end / 1000), firstCharge: new Date(end), basis: 'standard_14' }
  }
  if (until <= t) return { trialEnd: null, firstCharge: now, basis: 'free_days_over' }
  if (until - t < STRIPE_MIN_TRIAL_MS) {
    const end = t + STRIPE_MIN_TRIAL_MS
    return { trialEnd: Math.floor(end / 1000), firstCharge: new Date(end), basis: 'free_days_min_48h' }
  }
  const end = Math.min(until, t + STRIPE_MAX_TRIAL_MS)
  return { trialEnd: Math.floor(end / 1000), firstCharge: new Date(end), basis: 'free_days' }
}
