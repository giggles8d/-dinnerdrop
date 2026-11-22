/**
 * Family-plan access, in one place.
 *
 * past_due (Nov 22 2026 review, Sarah approved): a failed Family payment now PAUSES Family here too. Before, this
 * file kept past_due families on Family (texting, reminders, Kroger push kept running) while the dashboard told
 * them "your plan is paused". Now both agree: Family features stop until the card is fixed. Planning, the grocery
 * list and the Instacart and Walmart carts are free, so they keep working. Free days (family_until) and founding
 * membership still count, so a past_due family that also has those keeps Family.
 */
export interface AccessProfile {
  subscription_status?: string | null
  is_beta_member?: boolean | null
  family_until?: string | null
}

export function isFamilyProfile(p: AccessProfile): boolean {
  const s = p.subscription_status
  if (s === 'active' || s === 'trialing') return true
  if (p.is_beta_member) return true
  if (p.family_until && new Date(p.family_until) > new Date()) return true
  return false
}

/**
 * Why a family does or doesn't have Family right now, for banners and emails.
 *  - 'paid' / 'trialing': Stripe subscription (card on file)
 *  - 'founding':          founding member, free through Oct 18 2027
 *  - 'free_days':         free Family days with no card (family_until in the future)
 *  - 'past_due':          a Family payment failed; Family is paused until the card is updated
 *  - 'free_days_ended':   free Family days ran out and no card was added; back on Free
 *  - 'free':              never had Family
 */
export type FamilyState = 'paid' | 'trialing' | 'founding' | 'free_days' | 'past_due' | 'free_days_ended' | 'free'

export function familyState(p: AccessProfile, now = new Date()): FamilyState {
  const s = p.subscription_status
  if (s === 'active') return 'paid'
  if (s === 'trialing') return 'trialing'
  if (p.is_beta_member) return 'founding'
  if (p.family_until && new Date(p.family_until) > now) return 'free_days'
  if (s === 'past_due') return 'past_due'
  if (p.family_until) return 'free_days_ended'
  return 'free'
}
