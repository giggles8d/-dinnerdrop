import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GroceryCategory, GroceryItem, Meal } from '@/types'
import { normalizeItemName, guessCategory, dueStaples, basicsFor, sameListItem, type Staple } from '@/lib/list'
import { mergeSettings } from '@/lib/settings'

/**
 * Follow-up tracking for new families.
 * - Every lifecycle touch (day-1/3/7 email, weekly plan email) is logged as an activation_events row
 *   step 'followup_sent' {kind, channel}; texts are already in sms_messages.
 * - Emails carry a signed one-tap link (/api/go/shop?u=&k=&s=) that logs 'followup_click' and sends the
 *   family's list straight to Instacart — no sign-in, because most email taps open a browser that isn't signed in.
 */

const APP = 'https://www.dinnerdrop.app'
export type FollowupKind = 'day1' | 'day3' | 'day7' | 'plan_ready' | 'starter' | 'campaign' | 'texting' | 'receipt' | 'reorder'

function secret(): string {
  return process.env.FOLLOWUP_LINK_SECRET || process.env.CRON_SECRET || ''
}
export function signFollowup(userId: string, kind: string): string {
  return createHmac('sha256', secret()).update(`shop:${userId}:${kind}`).digest('base64url').slice(0, 24)
}
export function verifyFollowup(userId: string, kind: string, sig: string): boolean {
  if (!secret() || !userId || !sig) return false
  const want = Buffer.from(signFollowup(userId, kind))
  const got = Buffer.from(sig)
  return want.length === got.length && timingSafeEqual(want, got)
}
/** One tap from an email to the family's Instacart cart. */
export function shopUrl(userId: string, kind: FollowupKind): string {
  return `${APP}/api/go/shop?u=${encodeURIComponent(userId)}&k=${kind}&s=${signFollowup(userId, kind)}`
}

/** One tap from an email to "add your family's numbers" — no sign-in (app/go/texting). */
export function textingUrl(userId: string, campaign = 'texting'): string {
  return `${APP}/go/texting?u=${encodeURIComponent(userId)}&s=${signFollowup(userId, 'texting')}&utm_source=email&utm_medium=campaign&utm_campaign=${encodeURIComponent(campaign)}`
}

/** One tap from the day-after email to upload the order's receipt — no sign-in (app/go/receipt). */
export function receiptUrl(userId: string): string {
  return `${APP}/go/receipt?u=${encodeURIComponent(userId)}&s=${signFollowup(userId, 'receipt')}&utm_source=email&utm_medium=lifecycle&utm_campaign=receipt`
}

export async function logFollowup(admin: SupabaseClient, userId: string, kind: FollowupKind, channel: 'email' | 'sms' = 'email'): Promise<void> {
  try {
    await admin.from('activation_events').insert({ user_id: userId, step: 'followup_sent', meta: { kind, channel } })
  } catch (e) {
    console.error('[followup] log failed', e)
  }
}

/**
 * What to put in the family's cart.
 *  - The family has opened this week's list (it has the plan's lines): the open lines on it.
 *  - Not opened yet: the plan's groceries plus what the list page would add on first open — things they texted or
 *    typed (this week, or left over from the last 3 weeks), staples that are due, and breakfast/lunch basics if they
 *    asked for them. Before Nov 22 2026 a texted "ADD milk" before opening the list sent a cart with only the milk,
 *    and staples never reached a one-tap cart (week-two cart check, Sarah approved the fix).
 * Read-only: nothing on the list changes here; the list page still saves these lines when it first opens.
 */
export async function itemsForFamily(admin: SupabaseClient, userId: string): Promise<{ items: GroceryItem[]; weekStart: string | null; estTotal: number | null }> {
  const { data: plan } = await admin.from('meal_plans').select('week_start, meals, grocery_list, total_estimated_cost').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!plan) return { items: [], weekStart: null, estTotal: null }
  const est = Number(plan.total_estimated_cost) > 0 ? Number(plan.total_estimated_cost) : null
  const { data: all } = await admin.from('list_items').select('name, quantity, unit, category, search_term, ordered_at, have, checked, source').eq('user_id', userId).eq('week_start', plan.week_start)
  const toItem = (r: { name: string; quantity: string | null; unit: string | null; category: string | null; search_term: string | null }): GroceryItem =>
    ({ name: r.name, quantity: r.quantity ?? '1', unit: r.unit ?? 'each', category: (r.category ?? 'Pantry & Dry Goods') as GroceryCategory, searchTerm: r.search_term ?? r.name })
  if (all?.some((r) => r.source === 'plan')) {
    // The family has a list for this week: send only what's still open. Everything ordered or "have it" →
    // no items, and the link opens the grocery list instead of re-sending the whole week (Nov 21 2026 review).
    const rows = all.filter((r) => !r.ordered_at && !r.have)
    return { items: rows.map(toItem), weekStart: plan.week_start, estTotal: rows.length === all.length ? est : null }
  }

  // The plan's groceries.
  let base: GroceryItem[] = []
  const list = plan.grocery_list as Record<string, GroceryItem[]> | null
  if (list && Object.keys(list).length) base = Object.values(list).flat().filter((i) => i?.name)
  else {
    const byName = new Map<string, GroceryItem>()
    for (const m of ((plan.meals as Meal[]) ?? [])) {
      for (const ing of m.ingredients ?? []) {
        const key = normalizeItemName(ing.name)
        if (!key) continue
        const prev = byName.get(key)
        const q = Number(ing.quantity)
        if (prev && prev.unit === ing.unit && !isNaN(Number(prev.quantity)) && !isNaN(q)) prev.quantity = String(Number(prev.quantity) + q)
        else if (!prev) byName.set(key, { name: ing.name, quantity: String(ing.quantity ?? '1'), unit: ing.unit ?? 'each', category: (ing.category as GroceryCategory) ?? guessCategory(ing.name), searchTerm: ing.searchTerm ?? ing.name })
      }
    }
    base = Array.from(byName.values())
  }

  // What the list page adds on first open.
  const extras: GroceryItem[] = (all ?? []).filter((r) => !r.ordered_at && !r.have).map(toItem)
  const firstOpen = !(all ?? []).some((r) => r.source === 'staples' || r.source === 'extra')
  if (firstOpen) {
    const [{ data: carried }, { data: staples }, { data: prof }] = await Promise.all([
      admin.from('list_items').select('name, quantity, unit, category, search_term').eq('user_id', userId).neq('week_start', plan.week_start)
        .is('ordered_at', null).eq('have', false).eq('checked', false).in('source', ['sms', 'manual']).gte('created_at', new Date(Date.now() - 21 * 86400000).toISOString()),
      admin.from('staples').select('*').eq('user_id', userId),
      admin.from('profiles').select('settings, family_size').eq('id', userId).maybeSingle(),
    ])
    extras.push(...(carried ?? []).map(toItem))
    extras.push(...dueStaples((staples as Staple[]) ?? [], plan.week_start).map((st) => toItem({ name: st.name, quantity: st.quantity, unit: st.unit, category: st.category, search_term: st.name })))
    const settings = mergeSettings(prof?.settings)
    const size = Number(prof?.family_size) || 4
    if (settings.plan.includeLunches) extras.push(...basicsFor('lunch', size))
    if (settings.plan.includeBreakfasts) extras.push(...basicsFor('breakfast', size))
  }
  // One line per item: what the family added wins over the recipe's line for the same thing.
  const items: GroceryItem[] = []
  for (const it of [...extras, ...base]) if (!items.some((x) => sameListItem(x.name, it.name))) items.push(it)
  return { items, weekStart: plan.week_start, estTotal: extras.length ? null : est }
}
