/**
 * Weekly one-tap reorder (Sarah, Nov 10 2026: "build it"). Families who have sent a cart before get their new week
 * with the cart one tap away:
 * - Text (texting on): the week, "Reply YES and I'll text your Instacart cart link." YES (or CART) → the link.
 * - Email (the Sunday Drop): "Your week is ready. Your Instacart cart is one tap away." + one button.
 *
 * Both point to the signed /api/go/shop link (kind 'reorder'), which builds the Instacart cart from the family's
 * current list at the moment they tap — so swaps made after the message are in it, the Instacart affiliate tracking
 * is the same as the app's button, and every tap is logged as a cart sent (grocery_handoffs + followup_shop).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { shopUrl } from '@/lib/followup'
import type { Meal } from '@/types'

export const REORDER_ASK = 'reorder_ask'
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const day = (d: string | undefined, i: number) => (/^(mon|tue|wed|thu|fri|sat|sun)/i.test(d ?? '') ? String(d).slice(0, 3) : DAYS[i % 7])

/** Has this family ever sent a list to a store? */
export async function hasOrdered(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  return (count ?? 0) > 0
}

/** The Saturday text for a family that has ordered before. Numbered so "SWAP 2" means the second dinner. */
export function reorderText(meals: Meal[]): string {
  const lines = meals.map((m, i) => `${i + 1}. ${day(m.day, i)}: ${m.name}`)
  return `Your DinnerDrop week is ready 🍽️\n${lines.join('\n')}\nReply YES and I'll text your Instacart cart link. Reply SWAP 2 to change a dinner.`
}

/** Did we send this phone the reorder text in the last 3 days (and not answer it yet)? */
export async function reorderAsked(admin: SupabaseClient, householdId: string, phone: string): Promise<boolean> {
  const since = new Date(Date.now() - 3 * 86400000).toISOString()
  const { data } = await admin.from('sms_messages').select('intent, created_at').eq('household_id', householdId).eq('direction', 'out')
    .eq('to_number', phone).in('intent', [REORDER_ASK, 'reorder_cart']).gte('created_at', since).order('created_at', { ascending: false }).limit(1)
  return data?.[0]?.intent === REORDER_ASK
}

/** The reply to YES / CART: the one-tap link to the planner's Instacart cart. */
export async function reorderCartReply(admin: SupabaseClient, ownerId: string): Promise<string> {
  const { data: plan } = await admin.from('meal_plans').select('meals').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const n = ((plan?.meals as Meal[] | null) ?? []).length
  try { await admin.from('activation_events').insert({ user_id: ownerId, step: 'reorder_yes', meta: { channel: 'sms' } }) } catch { /* tracking only */ }
  return `Here's your cart${n ? ` for ${n} dinners` : ''}. Tap to open it in Instacart, then check out:\n${shopUrl(ownerId, 'reorder')}\nWant a change first? Reply SWAP 2 (any number).`
}
