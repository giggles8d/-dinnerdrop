import type { SupabaseClient } from '@supabase/supabase-js'
import { emailShell, sendEmail } from './notify'

/**
 * Weekend push offer (Oct 31 – Nov 1 2026, ET): a family that signs up during the window and sends
 * its FIRST grocery list to Instacart before the deadline gets 90 days of Family, no card.
 * Granted automatically from the Instacart handoff route; once per family.
 */
export const WEEKEND_OFFER = {
  id: 'weekend-2026-10-31',
  signupFrom: '2026-10-31T04:00:00Z',   // Fri Oct 31 00:00 ET (offer is advertised Sat–Sun; Friday sign-ups count too)
  sendBy: '2026-11-02T04:59:59Z',       // Sun Nov 1 11:59 PM ET (EST after the Nov 1 clock change)
  days: 90,
  label: '3 months of Family free',
}

export function weekendOfferOpen(now = new Date()): boolean {
  return now.getTime() <= new Date(WEEKEND_OFFER.sendBy).getTime()
}

/** Call right after a real (non-quote) Instacart handoff is logged. Returns true when the reward was just granted. */
export async function grantWeekendOffer(admin: SupabaseClient, userId: string, now = new Date()): Promise<boolean> {
  if (!weekendOfferOpen(now)) return false
  const { data: p } = await admin.from('profiles').select('id, email, full_name, created_at, subscription_status, family_until, settings').eq('id', userId).single()
  if (!p) return false
  if (new Date(p.created_at) < new Date(WEEKEND_OFFER.signupFrom)) return false
  if (p.subscription_status === 'active' || p.subscription_status === 'trialing') return false
  const settings = (p.settings && typeof p.settings === 'object' ? p.settings : {}) as Record<string, unknown>
  const promos = (settings.promos && typeof settings.promos === 'object' ? settings.promos : {}) as Record<string, unknown>
  if (promos[WEEKEND_OFFER.id]) return false
  // Only the first list counts; the route inserts the handoff before calling us, so one row = first send.
  const { count } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if ((count ?? 0) > 1) return false

  const base = p.family_until && new Date(p.family_until) > now ? new Date(p.family_until) : now
  const until = new Date(base.getTime() + WEEKEND_OFFER.days * 86400000)
  const { error } = await admin.from('profiles').update({
    family_until: until.toISOString(),
    settings: { ...settings, promos: { ...promos, [WEEKEND_OFFER.id]: { grantedAt: now.toISOString(), days: WEEKEND_OFFER.days } } },
  }).eq('id', userId)
  if (error) { console.error('[weekend-offer] grant failed:', error); return false }
  await admin.from('activation_events').insert({ user_id: userId, step: 'weekend_offer_granted', meta: { offer: WEEKEND_OFFER.id, until: until.toISOString() } }).then(() => undefined, () => undefined)

  if (p.email) {
    const first = (p.full_name || '').trim().split(' ')[0] || 'there'
    const html = emailShell(
      'Your 3 months of Family are on 🎉',
      `<p>Hi ${first},</p>
       <p>Your first grocery list is on its way to Instacart — that unlocked <strong>${WEEKEND_OFFER.label}</strong>, no card needed. Family is yours until <strong>${until.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</p>
       <p>The part most families love: add a couple of phone numbers and DinnerDrop texts everyone the week's dinners to vote on. Anyone can text "ADD milk" and it lands on the list. One minute to set up.</p>`,
      { label: 'Set up family texting', href: 'https://www.dinnerdrop.app/dashboard?texting=1' },
    )
    await sendEmail(p.email, 'Your 3 months of Family are on 🎉', html).catch(() => undefined)
  }
  return true
}
