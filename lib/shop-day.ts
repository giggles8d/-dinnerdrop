/**
 * Shop-day morning nudge (Nov 22 2026 review, Part 2 fix 1, Sarah approved).
 *
 * Why: DinnerDrop got one session. 47 of 64 first sends happened within an hour of sign-up and only 9% of families
 * came back after day one, so a family who shops on Saturday had nothing that reached them on Saturday. Setup now
 * asks how and when they shop (components/Walkthrough, saved as stores.mode + the shop-by day + settings.shopping).
 * On that day's morning, a family with a current plan that hasn't sent this week's list gets the no-sign-in link:
 *   online families   → the one-tap Instacart cart (/api/go/shop), plus the list link for an in-person trip
 *   in-store families → the list on their phone (/list)
 * By text when they opted in and never texted STOP (held until their texting hours, lib/send-window), else by email
 * (never to unsubscribed addresses). At most one per family per week, logged as activation_events
 * 'followup_sent' { kind: 'shop_day' } so a rerun the same day sends nothing.
 *
 * Call runShopDayNudges(admin, now) once a day from the daily cron, after runDailyReminders (so a Saturday plan
 * day's new week and its plan-ready email exist first).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, WEEKDAY_LABEL, type Settings, type Weekday } from '@/lib/settings'
import { localNow } from '@/lib/plan'
import { emailShell, sendEmail, smsConfigured } from '@/lib/notify'
import { isFamilyProfile } from '@/lib/access'
import { textMember, type MemberRow } from '@/lib/texting'
import { dropConfig } from '@/lib/sunday-drop'
import { cartLink, listHtml, listUrl, loadSharedList, shopsInStore } from '@/lib/list-link'

const KIND = 'shop_day'
// Internal accounts, as the other bulk senders skip them (lib/checkin-campaign, lib/cart-ask-campaign).
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$|@camcomfginc\.com$)/i
const SARAH = 'setzl1979@gmail.com'

interface Row {
  id: string
  email: string | null
  full_name: string | null
  timezone: string | null
  settings: unknown
  household_id: string | null
  subscription_status: string | null
  is_beta_member: boolean | null
  family_until: string | null
  email_unsubscribed: boolean | null
}

export interface ShopDayReport { checked: number; due: number; texted: number; emailed: number; skipped: Record<string, number>; errors: string[] }

/** The family answered "how do you shop" and gave a day (not "it varies"). */
export function shopDayOf(s: Settings): Weekday | null {
  const asked = (s as unknown as { shopping?: { askedAt?: string; varies?: boolean } }).shopping
  if (!asked?.askedAt || asked.varies) return null
  return s.schedule.reminders.shopBy.day
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export async function runShopDayNudges(admin: SupabaseClient, now: Date = new Date(), opts: { budgetMs?: number; dryRun?: boolean } = {}): Promise<ShopDayReport> {
  const report: ShopDayReport = { checked: 0, due: 0, texted: 0, emailed: 0, skipped: {}, errors: [] }
  const skip = (why: string) => { report.skipped[why] = (report.skipped[why] ?? 0) + 1 }
  const started = Date.now()
  const budget = opts.budgetMs ?? 120_000

  const { data: me } = await admin.from('profiles').select('household_id').eq('email', SARAH).maybeSingle()
  const sarahHousehold = (me?.household_id as string | null) ?? null
  const drop = await dropConfig(admin).catch(() => ({ live: false, address: '' }))

  // Only families who answered the shop question (settings.shopping.askedAt), a few hundred at most.
  const { data: rows, error } = await admin
    .from('profiles')
    .select('id, email, full_name, timezone, settings, household_id, subscription_status, is_beta_member, family_until, email_unsubscribed')
    .not('settings->shopping->>askedAt', 'is', null)
    .limit(5000)
  if (error) { report.errors.push(error.message); return report }

  for (const p of (rows ?? []) as Row[]) {
    if (Date.now() - started > budget) { report.errors.push('time budget reached; the rest wait for tomorrow'); break }
    report.checked++
    try {
      if (p.email && INTERNAL.test(p.email)) { skip('internal'); continue }
      if (sarahHousehold && p.household_id === sarahHousehold) { skip('internal'); continue }
      const settings = mergeSettings(p.settings)
      const day = shopDayOf(settings)
      if (!day) { skip('no_day'); continue }
      const local = localNow(p.timezone || 'America/New_York', now)
      if (local.weekday !== day) continue
      // A family that turned on the shop reminder in Settings already gets one that day, at their own time (lib/reminders).
      if (settings.schedule.reminders.shopBy.channel !== 'off') { skip('own_reminder'); continue }

      // A current plan: this week's or next week's, not an old one from weeks ago.
      const { data: plan } = await admin.from('meal_plans').select('week_start, meals').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!plan || !plan.week_start || plan.week_start < addDays(local.dateStr, -6)) { skip('no_current_plan'); continue }

      // Not sent this week, and not nudged this week.
      const since = new Date(now.getTime() - 6 * 86400000).toISOString()
      const [{ count: sent }, { count: nudged }] = await Promise.all([
        admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id).gte('created_at', since),
        admin.from('activation_events').select('id', { count: 'exact', head: true }).eq('user_id', p.id).eq('step', 'followup_sent').eq('meta->>kind', KIND).gte('created_at', since),
      ])
      if (sent) { skip('already_sent'); continue }
      if (nudged) { skip('already_nudged'); continue }

      const list = await loadSharedList(admin, p.id)
      if (!list || !list.lines.length) { skip('nothing_to_buy'); continue }
      report.due++

      const inStore = shopsInStore(settings)
      const n = list.dinners.length
      const dinners = `${n} dinner${n === 1 ? '' : 's'}`
      const first = (p.full_name || '').trim().split(' ')[0]
      const list_ = listUrl(p.id)
      const cart = cartLink(p.id, KIND)

      // ---- text, when they can get one ----
      let channel: 'sms' | 'email' | null = null
      const canText = smsConfigured() && settings.texting.enabled && isFamilyProfile(p) && !!p.household_id
      if (canText) {
        const { data: mine } = await admin.from('household_members').select('*').eq('household_id', p.household_id!).eq('profile_id', p.id).not('phone', 'is', null).limit(1)
        const m = mine?.[0] as MemberRow | undefined
        if (m && m.phone_opt_in_at && !m.phone_opted_out) {
          // Their plan-ready or reorder text already went out this morning: that one carries the week.
          const { count: plannedText } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('household_id', p.household_id!).in('intent', ['plan_ready', 'reorder_ask']).gte('created_at', new Date(now.getTime() - 12 * 3600000).toISOString())
          if (plannedText) { skip('plan_text_today'); continue }
          const body = inStore
            ? `DinnerDrop: it's shop day. Here's your list for ${dinners}, no sign-in needed. Check items off as you shop: ${list_}`
            : `DinnerDrop: it's shop day. Your ${dinners} are planned. Tap once to fill your Instacart cart, no sign-in: ${cart} Shopping in person? Your list: ${list_}`
          if (opts.dryRun) channel = 'sms'
          else if (await textMember(admin, m, body, KIND)) channel = 'sms'
        }
      }

      // ---- else email ----
      if (!channel) {
        if (!p.email || p.email_unsubscribed) { skip('no_channel'); continue }
        // Sunday with the Sunday Drop live: the Drop is this family's Sunday email (lib/sunday-drop), not two.
        if (day === 'sun' && drop.live) { skip('sunday_drop'); continue }
        // A plan-ready email this morning already carried the one-tap link.
        const { count: planMail } = await admin.from('activation_events').select('id', { count: 'exact', head: true }).eq('user_id', p.id).eq('step', 'followup_sent').eq('meta->>kind', 'plan_ready').gte('created_at', new Date(now.getTime() - 12 * 3600000).toISOString())
        if (planMail) { skip('plan_email_today'); continue }
        const today = WEEKDAY_LABEL[day]
        const subject = inStore ? `Your grocery list for ${today}` : `${today} is shop day: your list for ${list.dinners[0] ?? 'the week'}${n > 1 ? ` and ${n - 1} more` : ''}`
        const html = inStore
          ? emailShell(`Your list for the store${first ? `, ${first}` : ''}`,
            `<p>It's ${today}, your shop day. Here's everything for your ${dinners}. Open it on your phone in the store and check items off as you go. No sign-in needed.</p>${listHtml(list.lines)}`,
            { label: 'Open my list', href: list_ })
          : emailShell(`It's shop day${first ? `, ${first}` : ''}`,
            `<p>Your ${dinners} are planned: ${list.dinners.slice(0, 7).join(', ')}.</p><p>Tap below and every ingredient goes into your Instacart cart. You see the total and check out there.</p><p>Shopping in person instead? <a href="${list_}" style="color:#1a5c38;font-weight:600">Open your list on your phone</a>, no sign-in needed.</p>`,
            { label: 'Send my groceries to Instacart', href: cart })
        if (opts.dryRun) channel = 'email'
        else {
          const r = await sendEmail(p.email, subject, html)
          if (r.ok) channel = 'email'
          else report.errors.push(`${p.id} email: ${r.error}`)
        }
      }

      if (!channel) continue
      if (channel === 'sms') report.texted++
      else report.emailed++
      if (!opts.dryRun) await admin.from('activation_events').insert({ user_id: p.id, step: 'followup_sent', meta: { kind: KIND, channel, mode: inStore ? 'instore' : 'online' } })
      if (channel === 'email') await new Promise((r) => setTimeout(r, 150))   // Resend: 10 requests a second, shared
    } catch (e) {
      report.errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return report
}
