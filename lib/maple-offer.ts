/**
 * Maple families (Sarah, Nov 15 2026): Maple Family Organizer closes Dec 31 2026 (its in-app notice reportedly
 * says Nov 30). Anyone who signs up from /maple (signup_source: source maple, landing page /maple, or a maple campaign) gets 30 days of Family free, no card
 * (profiles.family_until). Once per account; paying members are skipped. Granted when attribution is attached.
 *
 * OFF (Nov 22 2026 review, Sarah approved: "14 days of Family free for everyone, then ask for a card"). Maple
 * families now get the same 14 days as every new family (lib/family-grant.ts). The 30 days stacked on top of those
 * 14, so a Maple sign-up got 44 free days. Families who already got the 30 days keep them. The /maple page and the
 * Maple blog post still promise 30 days; their copy must change in the same deploy (see build notes).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const MAPLE_OFFER_DAYS = 30
export const MAPLE_OFFER_ENDS = new Date('2027-01-16T05:00:00Z') // Jan 15 2027, 11:59 PM ET
const MAPLE_OFFER_ON: boolean = false

export async function grantMapleOffer(admin: SupabaseClient, userId: string, now = new Date()): Promise<boolean> {
  if (!MAPLE_OFFER_ON) return false
  if (now >= MAPLE_OFFER_ENDS) return false
  const key = `maple_offer:${userId}`
  const { data: prof } = await admin.from('profiles').select('subscription_status, family_until').eq('id', userId).maybeSingle()
  if (!prof || prof.subscription_status === 'active') return false
  const { error } = await admin.from('app_kv').insert({ key, value: { at: now.toISOString() }, updated_at: now.toISOString() })
  if (error) return false   // already granted
  const base = prof.family_until && new Date(prof.family_until) > now ? new Date(prof.family_until) : now
  const until = new Date(base.getTime() + MAPLE_OFFER_DAYS * 86400000).toISOString().slice(0, 10)
  await admin.from('profiles').update({ family_until: until }).eq('id', userId)
  await admin.from('app_kv').update({ value: { at: now.toISOString(), until } }).eq('key', key)
  return true
}
