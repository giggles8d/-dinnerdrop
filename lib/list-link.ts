/**
 * The no-sign-in grocery list link, and "Text me this list" / "Email me this list" (Nov 22 2026 review, Sarah
 * approved: a list sent to the family for shopping in the store counts as a successful send).
 *
 * Why: 90 of the 107 families who opened the list and never sent had the Instacart button on screen and none tapped
 * it. Many shop in person. Web families have no password, so any text or email link to /grocery-list lands on a
 * sign-in wall. This link (/list?u=&s=) opens the family's open list on any phone with no sign-in, using the same
 * HMAC as the one-tap cart link (lib/followup), kind 'list'. The same signature also opens the Instacart cart
 * (/api/go/shop?k=list), so one signed link pair serves both kinds of shopper.
 *
 * Sending the list records a grocery_handoffs row with store 'In store' and the item count: the same "first send"
 * the online carts record, so the 12% number stays one number.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { signFollowup, verifyFollowup, shopUrl, itemsForFamily, type FollowupKind } from '@/lib/followup'
import { mergeSettings, type Settings } from '@/lib/settings'
import { CATEGORY_ORDER } from '@/lib/list'
import { formatQuantity } from '@/lib/format-qty'
import { emailShell, sendEmail, sendSms, smsConfigured } from '@/lib/notify'
import { isFamilyProfile } from '@/lib/access'
import type { GroceryCategory, Meal } from '@/types'

const APP = 'https://www.dinnerdrop.app'
export const LIST_KIND = 'list'
export const IN_STORE = 'In store'

/** The family's list on any phone, no sign-in. Short on purpose: it goes in texts. */
export function listUrl(userId: string): string {
  return `${APP}/list?u=${userId}&s=${signFollowup(userId, LIST_KIND)}`
}

/** One tap from the list page (or a shop-day text) to the Instacart cart, signed with the same list signature. */
export function listCartUrl(userId: string, sig: string): string {
  return `${APP}/api/go/shop?u=${userId}&k=${LIST_KIND}&s=${encodeURIComponent(sig)}`
}

/** The one-tap cart link for a send that isn't one of lib/followup's kinds (e.g. 'shop_day'), so taps are told apart. */
export function cartLink(userId: string, kind: string): string {
  return `${APP}/api/go/shop?u=${userId}&k=${encodeURIComponent(kind)}&s=${signFollowup(userId, kind)}`
}

export function verifyListLink(u: string, s: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(u) && verifyFollowup(u, LIST_KIND, s)
}

export const shopsInStore = (s: Settings) => s.stores.mode === 'instore'

/** The no-sign-in link that fits how the family shops: the list for in-store families, the one-tap cart otherwise. */
export function sendLinkFor(userId: string, settings: Settings, kind: FollowupKind): string {
  return shopsInStore(settings) ? listUrl(userId) : shopUrl(userId, kind)
}

export interface SharedLine { id: string | null; name: string; qty: string; category: GroceryCategory; checked: boolean }
export interface SharedList { weekStart: string | null; dinners: string[]; lines: SharedLine[]; firstName: string; allBought: boolean }

/**
 * What the family still has to buy: open lines on this week's list (ordered and "have it" lines left off), or,
 * before the list page was ever opened, the plan's built list or its dinners' ingredients (lib/followup).
 */
export async function loadSharedList(admin: SupabaseClient, userId: string): Promise<SharedList | null> {
  const [{ data: plan }, { data: prof }] = await Promise.all([
    admin.from('meal_plans').select('week_start, meals').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
  ])
  if (!plan) return null
  const dinners = ((plan.meals as Meal[] | null) ?? []).map((m) => String(m?.name ?? '').trim()).filter(Boolean)
  const firstName = String(prof?.full_name ?? '').trim().split(' ')[0] ?? ''
  const { data: rows } = await admin.from('list_items').select('id, name, quantity, unit, category, checked, have, ordered_at').eq('user_id', userId).eq('week_start', plan.week_start).order('created_at')
  let lines: SharedLine[]
  let allBought = false
  if (rows?.length) {
    const open = rows.filter((r) => !r.ordered_at && !r.have)
    allBought = open.length === 0
    lines = open.map((r) => ({ id: r.id as string, name: r.name as string, qty: r.quantity ? formatQuantity(r.quantity, r.unit ?? '') : '', category: (r.category ?? 'Pantry & Dry Goods') as GroceryCategory, checked: !!r.checked }))
  } else {
    const { items } = await itemsForFamily(admin, userId)
    lines = items.map((i) => ({ id: null, name: i.name, qty: i.quantity ? formatQuantity(i.quantity, i.unit ?? '') : '', category: i.category ?? 'Pantry & Dry Goods', checked: false }))
  }
  const rank = (c: GroceryCategory) => { const i = CATEGORY_ORDER.indexOf(c); return i < 0 ? CATEGORY_ORDER.length : i }
  lines.sort((a, b) => rank(a.category) - rank(b.category))
  return { weekStart: plan.week_start ?? null, dinners, lines, firstName, allBought }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The list grouped by aisle, for the body of an email (works with no signal in the store). */
export function listHtml(lines: SharedLine[]): string {
  const out: string[] = []
  for (const c of CATEGORY_ORDER) {
    const rows = lines.filter((l) => l.category === c)
    if (!rows.length) continue
    out.push(`<p style="margin:16px 0 4px;font-weight:700">${esc(c)}</p><ul style="margin:0;padding-left:20px">${rows.map((r) => `<li>${esc(r.name)}${r.qty ? ` <span style="color:#6b6b6b">(${esc(r.qty)})</span>` : ''}</li>`).join('')}</ul>`)
  }
  return out.join('')
}

export function listText(lines: SharedLine[]): string {
  const out: string[] = []
  for (const c of CATEGORY_ORDER) {
    const rows = lines.filter((l) => l.category === c)
    if (!rows.length) continue
    out.push(c.toUpperCase(), ...rows.map((r) => `- ${r.name}${r.qty ? ` (${r.qty})` : ''}`), '')
  }
  return out.join('\n').trim()
}

interface ProfileForSend {
  id: string
  email: string | null
  full_name: string | null
  household_id: string | null
  settings: unknown
  subscription_status: string | null
  is_beta_member: boolean | null
  family_until: string | null
}
interface OwnPhone { id: string; household_id: string; phone: string }

const PROFILE_COLS = 'id, email, full_name, household_id, settings, subscription_status, is_beta_member, family_until'

/** The planner's own texting number, only when texting is on and they opted in and never texted STOP. */
async function ownPhone(admin: SupabaseClient, p: ProfileForSend): Promise<OwnPhone | null> {
  if (!smsConfigured() || !p.household_id || !isFamilyProfile(p)) return null
  if (!mergeSettings(p.settings).texting.enabled) return null
  const { data } = await admin.from('household_members').select('id, household_id, phone, phone_opt_in_at, phone_opted_out').eq('household_id', p.household_id).eq('profile_id', p.id).not('phone', 'is', null).limit(1)
  const m = data?.[0]
  if (!m?.phone || !m.phone_opt_in_at || m.phone_opted_out) return null
  return { id: m.id as string, household_id: m.household_id as string, phone: m.phone as string }
}

export type ListChannel = 'sms' | 'email'
export interface ListRoute { channel: ListChannel | null; hint: string }

/** How "send me this list" reaches this person: a text when they can get one, else email. */
export async function listRouteFor(admin: SupabaseClient, userId: string): Promise<ListRoute & { profile: ProfileForSend | null; phone: OwnPhone | null }> {
  const { data } = await admin.from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle()
  const p = (data as ProfileForSend | null) ?? null
  if (!p) return { channel: null, hint: '', profile: null, phone: null }
  const phone = await ownPhone(admin, p)
  if (phone) return { channel: 'sms', hint: `•••${phone.phone.slice(-4)}`, profile: p, phone }
  const email = String(p.email ?? '').trim()
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { channel: 'email', hint: email, profile: p, phone: null }
  return { channel: null, hint: '', profile: p, phone: null }
}

export interface SendListResult { ok: boolean; channel?: ListChannel; items?: number; duplicate?: boolean; error?: string }

/**
 * "Text me this list" / "Email me this list": the person who tapped gets the plan owner's list link (partners share
 * the owner's list). Records the send in grocery_handoffs (store 'In store'). A second tap within a minute is a
 * double tap: nothing is sent or recorded twice.
 */
export async function sendListToShopper(admin: SupabaseClient, opts: { userId: string; ownerId: string; estTotal?: number | null; weekStart?: string | null }): Promise<SendListResult> {
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count: recent } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', opts.userId).eq('store', IN_STORE).gte('created_at', since)
  if (recent) return { ok: true, duplicate: true }

  const list = await loadSharedList(admin, opts.ownerId)
  if (!list || !list.lines.length) return { ok: false, error: 'Your list is empty right now. Add a few items first.' }
  const route = await listRouteFor(admin, opts.userId)
  if (!route.channel || !route.profile) return { ok: false, error: 'We don’t have a phone number or email to send it to. Add one in Settings.' }
  const url = listUrl(opts.ownerId)
  const n = list.lines.length
  const d = list.dinners.length

  let sent = false
  if (route.channel === 'sms' && route.phone) {
    // They asked for it this second, so it goes now (not held for texting hours like scheduled texts).
    const body = `DinnerDrop: here's your grocery list, ${n} item${n === 1 ? '' : 's'}${d ? ` for ${d} dinner${d === 1 ? '' : 's'}` : ''}. It opens on your phone with no sign-in. Check items off as you shop: ${url}`
    const r = await sendSms(route.phone.phone, body)
    await admin.from('sms_messages').insert({ household_id: route.phone.household_id, member_id: route.phone.id, direction: 'out', to_number: route.phone.phone, body, intent: 'instore_list', twilio_sid: r.sid ?? null })
    sent = r.ok
  } else if (route.profile.email) {
    const first = String(route.profile.full_name ?? '').trim().split(' ')[0]
    const subject = `Your grocery list: ${n} item${n === 1 ? '' : 's'}`
    const html = emailShell(
      `Your grocery list${first ? `, ${esc(first)}` : ''}`,
      `<p>Here's everything for ${d ? `your ${d} dinners` : 'this week'}. Open it on your phone in the store and check items off as you go. No sign-in needed.</p>${listHtml(list.lines)}`,
      { label: 'Open my list', href: url },
    )
    const text = `Your grocery list, ${n} items. Open it on your phone, no sign-in: ${url}\n\n${listText(list.lines)}`
    const r = await sendEmail(route.profile.email, subject, html, { text })
    sent = r.ok
  }
  if (!sent) return { ok: false, channel: route.channel, error: route.channel === 'sms' ? 'The text didn’t go through. Try again in a minute.' : 'The email didn’t go through. Try again in a minute.' }

  try {
    // followup_sent_at is set now: the "How did your grocery order go?" email is written for online orders
    // (lib/order-followup), and its copy reads wrong for an in-store trip.
    await admin.from('grocery_handoffs').insert({
      user_id: opts.userId,
      store: IN_STORE,
      item_count: n,
      est_total: Number(opts.estTotal) > 0 ? Math.round(Number(opts.estTotal) * 100) / 100 : null,
      week_start: typeof opts.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(opts.weekStart) ? opts.weekStart : list.weekStart,
      followup_sent_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[list-link] handoff log failed', e)
  }
  return { ok: true, channel: route.channel, items: n }
}
