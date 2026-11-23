/**
 * Daily reminders + automatic weekly plans. Runs once a day from /api/cron/daily
 * (Vercel cron, 12:00 UTC ≈ 8am ET). Everything keys off each family's own
 * timezone and the day-level settings in profiles.settings; time-of-day
 * settings pick the morning send vs. an afternoon send when the cron runs
 * more than once a day.
 */
import { sendFamilyText } from '@/lib/send-window'
import { hasOrdered, reorderText, REORDER_ASK } from '@/lib/reorder'
import { leaderLabel } from '@/lib/family-ask'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, WEEKDAY_LABEL, WEEKDAYS, tripsConfig, type Settings, type Channel } from '@/lib/settings'
import { isClassic, resolveTrips, tripInstances, tonightTrip, voteTripOn, addDays } from '@/lib/trips'
import { localNow, mondayOf, timeLabel } from '@/lib/plan'
import { autoPlan } from '@/lib/autoplan'
import { sendEmail, emailShell, smsConfigured } from '@/lib/notify'
import { attachLibraryImages } from '@/lib/library-images'
import { planReadySubject, planReadyHtml } from '@/lib/plan-ready-email'
import { isQuiet } from '@/lib/engagement'
import { dropConfig, sendDrop, type DropProfile } from '@/lib/sunday-drop'
import { shopUrl, logFollowup } from '@/lib/followup'
import { cartLink, listUrl, shopsInStore } from '@/lib/list-link'
import { sendListWaitingText, type SetupProfile } from '@/lib/texting-setup'
import { isFamilyProfile } from '@/lib/access'
import { textMember, type MemberRow } from '@/lib/texting'
import type { Meal } from '@/types'

const APP = 'https://www.dinnerdrop.app'

interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  timezone: string | null
  settings: unknown
  household_id: string | null
  family_size: number
  weekly_budget: string
  max_cook_time: number
  cuisine_preference: string
  dietary_needs: string[] | null
  subscription_status: string | null
  is_beta_member: boolean | null
  family_until: string | null
  email_unsubscribed: boolean | null
  created_at?: string | null
}

interface MemberPhone { name: string; phone: string; role: string }

export interface DailyReport {
  checked: number
  autoPlans: number
  shopReminders: number
  cookReminders: number
  listNudges: number
  errors: string[]
}

/**
 * The link a reminder carries, by how the family shops (Nov 22 2026 review, Sarah approved): texts and the shop
 * reminder used to link /grocery-list or /dashboard, a sign-in screen on most phones (web families have no password).
 *   in store  → the list on their phone, no sign-in (/list)
 *   Kroger    → the list page (the Kroger push needs their account), and the copy says so
 *   otherwise → the one-tap Instacart cart, no sign-in
 */
function shopLink(p: ProfileRow, settings: Settings, kind: string): { url: string; cta: string; how: string; signIn: boolean } {
  if (settings.stores.mode === 'instore') return { url: listUrl(p.id), cta: 'Open my list', how: 'Open it on your phone in the store and check items off as you go. No sign-in needed.', signIn: false }
  if (settings.stores.mode === 'kroger') return { url: `${APP}/grocery-list`, cta: 'Open my list to send it to Kroger', how: 'Open your list to send it to your Kroger cart.', signIn: true }
  return { url: cartLink(p.id, kind), cta: 'Send my list to Instacart', how: 'One tap puts it in your Instacart cart, no sign-in. You check out there.', signIn: false }
}

/** The last lines of a "this week's dinners are planned" text: shop with no sign-in first, swapping second. */
function planTextLinks(p: ProfileRow, settings: Settings): string {
  const link = shopLink(p, settings, 'plan_ready')
  const shop = settings.stores.mode === 'instore' ? `Your list, no sign-in: ${link.url}` : link.signIn ? `Send it to Kroger: ${link.url}` : `Fill your Instacart cart, no sign-in: ${link.url}`
  return `${shop}\nSwap a dinner: ${APP}/dashboard`
}

function wantsEmail(c: Channel) { return c === 'email' || c === 'both' }
function wantsSms(c: Channel) { return c === 'sms' || c === 'both' }
function firstName(p: ProfileRow) { return (p.full_name || '').trim().split(' ')[0] || 'there' }

/**
 * Saturday reorder text for a family that turned texting on and has sent a cart (Sarah approved Nov 22 2026). The
 * "plan ready" channel defaults to email, so these families never got the one message that matters most by the
 * channel they chose. Not for pick-my-own, in-store or Kroger families (the text's link fills an Instacart cart).
 */
async function reorderByText(admin: SupabaseClient, p: ProfileRow, settings: Settings, family: boolean): Promise<boolean> {
  if (!family || !settings.texting.enabled || settings.plan.pickMyOwn || shopsInStore(settings) || settings.stores.mode === 'kroger') return false
  return hasOrdered(admin, p.id)
}
async function optedInPhones(admin: SupabaseClient, householdId: string | null): Promise<MemberPhone[]> {
  if (!householdId) return []
  const { data } = await admin
    .from('household_members')
    .select('name, phone, role, phone_opt_in_at, phone_opted_out')
    .eq('household_id', householdId)
    .not('phone', 'is', null)
  return (data ?? [])
    .filter((m) => m.phone_opt_in_at && !m.phone_opted_out && m.role === 'adult')
    .map((m) => ({ name: m.name, phone: m.phone as string, role: m.role }))
}

/** The family's text vote for this week is still open: the vote result will set the week and text them. */
async function voteOpenFor(admin: SupabaseClient, p: ProfileRow, weekStart: string): Promise<boolean> {
  if (!p.household_id) return false
  const { data } = await admin.from('vote_rounds').select('id').eq('household_id', p.household_id).eq('week_start', weekStart).eq('status', 'open').limit(1)
  return !!data?.length
}

async function textAdults(admin: SupabaseClient, p: ProfileRow, settings: Settings, body: string, intent: string, opts: { at?: string; sameDayOnly?: boolean; weekStart?: string } = {}) {
  if (!smsConfigured() || !settings.texting.enabled || !p.household_id) return
  // Nov 23 2026: a family whose vote was still open got "your dinner choices are ready, pick the ones you want" and
  // "no votes came in, the week is set" in the same minute — the plan-day catch-up planned the week at 7:00 and the
  // vote closed at 7:05. While the vote for that week is open, the vote result is the only plan text they get.
  if (opts.weekStart && (intent === 'plan_ready' || intent === REORDER_ASK) && (await voteOpenFor(admin, p, opts.weekStart))) return
  const adults = await optedInPhones(admin, p.household_id)
  // Held until the family's texting hours, or the reminder's own time (lib/send-window).
  for (const a of adults) await sendFamilyText(admin, { householdId: p.household_id, to: a.phone, body, intent }, opts)
}

export async function runDailyReminders(admin: SupabaseClient, now: Date = new Date(), opts: { onlyAutoPlan?: boolean } = {}): Promise<DailyReport> {
  const report: DailyReport = { checked: 0, autoPlans: 0, shopReminders: 0, cookReminders: 0, listNudges: 0, errors: [] }
  // One run at a time: two overlapping runs (the cron and a manual run, or a double request) each saw
  // "no plan for that week yet" and both planned and emailed 35 families on Oct 31. The lock is a row in
  // app_kv that expires after 10 minutes, so a crashed run never blocks the next day.
  const LOCK = 'daily_reminders_lock'
  const { data: lock } = await admin.from('app_kv').select('value').eq('key', LOCK).maybeSingle()
  const lockedAt = Date.parse(String((lock?.value as { at?: string } | null)?.at ?? '')) || 0
  if (Date.now() - lockedAt < 10 * 60000) { report.errors.push('another run is in progress — skipped'); return report }
  await admin.from('app_kv').upsert({ key: LOCK, value: { at: new Date().toISOString() }, updated_at: new Date().toISOString() })
  try {
  const dropCfg = await dropConfig(admin)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, timezone, settings, household_id, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs, subscription_status, is_beta_member, family_until, email_unsubscribed, created_at')
  const started = Date.now()

  for (const p of (profiles ?? []) as ProfileRow[]) {
    report.checked++
    try {
      const settings = mergeSettings(p.settings)
      const tz = p.timezone || 'America/New_York'
      const { weekday } = localNow(tz, now)
      const todayLabel = WEEKDAY_LABEL[weekday]
      const canEmail = !!p.email && !p.email_unsubscribed
      const family = isFamilyProfile(p)
      // Shopping trips (Nov 1 2026). Classic families (Monday week, one trip) skip every trip branch below.
      const tcfg = tripsConfig(settings)
      const tripMode = !isClassic(tcfg)
      const today = localNow(tz, now).dateStr
      const shopTripToday = tripMode ? tripInstances(tcfg, today).find((t) => t.shopDate === today) ?? null : null
      const voteTrip = tripMode ? voteTripOn(tcfg, today) : null

      // ---- automatic plan per trip: the day before its shop day (unless the family votes on it by text) ----
      if (tripMode && voteTrip && settings.schedule.autoPlan && Date.now() - started < 200_000) {
        const resolved = resolveTrips(tcfg)[voteTrip.index]
        const familyVotes = family && settings.texting.enabled && resolved?.vote !== false
        const { data: existing } = await admin.from('meal_plans').select('id').eq('user_id', p.id).eq('week_start', voteTrip.key).limit(1)
        // Quiet families (no cart, visit or text in 14 days) get no new week (Nov 22 2026, lib/engagement).
        const active = !(await isQuiet(admin, p, now))
        if (active && !familyVotes && !existing?.length) {
          const meals = await autoPlan(admin, p, settings, voteTrip.key)
          if (meals) {
            report.autoPlans++
            if (!wantsSms(settings.schedule.reminders.planReady) && settings.schedule.reminders.planReady !== 'off' && await reorderByText(admin, p, settings, family)) {
              await textAdults(admin, p, settings, reorderText(meals, p.id), REORDER_ASK, { weekStart: voteTrip.key })
            } else if (wantsSms(settings.schedule.reminders.planReady) && family) {
              // Ordered before → the one-tap reorder text (lib/reorder): YES gets the Instacart cart link.
              if (settings.plan.pickMyOwn) await textAdults(admin, p, settings, `DinnerDrop: your dinner choices for the week are ready. Pick the ones you want: ${APP}/dashboard`, 'plan_ready', { weekStart: voteTrip.key })
              else if (await hasOrdered(admin, p.id)) await textAdults(admin, p, settings, reorderText(meals, p.id), REORDER_ASK, { weekStart: voteTrip.key })
              else await textAdults(admin, p, settings, `DinnerDrop: dinners for your next trip are planned:\n${meals.map((m) => `${m.day}: ${m.name}`).join('\n')}\n${planTextLinks(p, settings)}`, 'plan_ready', { weekStart: voteTrip.key })
            }
            // The Sunday Drop v3 is this family's week email now (one email, not two); the plain plan email only
            // when the Drop isn't live or already went out in the last 5 days (a second shopping trip that week).
            let dropSent = false
            if (wantsEmail(settings.schedule.reminders.planReady) && canEmail && dropCfg.live) {
              const r = await sendDrop(admin, p as unknown as DropProfile, dropCfg, { now, given: { weekStart: voteTrip.key, meals } })
              dropSent = r.sent || (!r.recent && !r.error)
              if (r.sent) await logFollowup(admin, p.id, 'plan_ready')
            }
            if (wantsEmail(settings.schedule.reminders.planReady) && canEmail && !dropSent) {
              const withPhotos = await attachLibraryImages(admin, meals)
              const weekLabel = new Date(`${voteTrip.shopDate}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              await sendEmail(p.email!, planReadySubject(withPhotos), planReadyHtml({ firstName: firstName(p), meals: withPhotos, weekLabel, unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}`, shopUrl: shopUrl(p.id, 'plan_ready'), listLink: listUrl(p.id) }))
              await logFollowup(admin, p.id, 'plan_ready')
            }
          }
        }
      }

      // ---- automatic weekly plan ----
      // Plan day, or the day after if the run ran out of time before reaching this family.
      const dayAfterPlanDay = WEEKDAYS[(WEEKDAYS.indexOf(settings.schedule.planDay) + 1) % 7]
      if (!tripMode && settings.schedule.autoPlan && (settings.schedule.planDay === weekday || dayAfterPlanDay === weekday) && Date.now() - started < 200_000) {
        // The newest-plan test never closed (each Saturday's plan reset it), so plan emails ran forever. Now: no new week
        // and no plan-ready email for a family with no cart, visit or text in 14 days (Sarah approved Nov 22 2026).
        if (!(await isQuiet(admin, p, now))) {
        const planningDay = settings.schedule.planDay === weekday ? weekday : settings.schedule.planDay
        // Planning on Sat/Sun targets the coming Monday; mid-week targets this week.
        const catchUp = planningDay !== weekday ? 1 : 0
        const planNow = new Date(now.getTime() - catchUp * 86400000)
        const target = (planningDay === 'sat' || planningDay === 'sun')
          ? mondayOf(new Date(planNow.getTime() + 2 * 86400000 + (planningDay === 'sat' ? 86400000 : 0)))
          : mondayOf(planNow)
        const { data: existing } = await admin.from('meal_plans').select('id').eq('user_id', p.id).eq('week_start', target).limit(1)
        if (!existing?.length) {
          const meals = await autoPlan(admin, p, settings, target)
          if (meals) {
            report.autoPlans++
            const names = meals.map((m) => `${m.day}: ${m.name}`)
            let dropSent = false
            if (wantsEmail(settings.schedule.reminders.planReady) && canEmail && dropCfg.live) {
              const r = await sendDrop(admin, p as unknown as DropProfile, dropCfg, { now, given: { weekStart: target, meals } })
              dropSent = r.sent || (!r.recent && !r.error)
              if (r.sent) await logFollowup(admin, p.id, 'plan_ready')
            }
            if (wantsEmail(settings.schedule.reminders.planReady) && canEmail && !dropSent) {
              const withPhotos = await attachLibraryImages(admin, meals)
              const weekLabel = new Date(`${target}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
              await sendEmail(p.email!, planReadySubject(withPhotos), planReadyHtml({ firstName: firstName(p), meals: withPhotos, weekLabel, unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}`, shopUrl: shopUrl(p.id, 'plan_ready'), listLink: listUrl(p.id) }))
              await logFollowup(admin, p.id, 'plan_ready')
            }
            if (!wantsSms(settings.schedule.reminders.planReady) && settings.schedule.reminders.planReady !== 'off' && await reorderByText(admin, p, settings, family)) {
              await textAdults(admin, p, settings, reorderText(meals, p.id), REORDER_ASK, { weekStart: target })
            } else if (wantsSms(settings.schedule.reminders.planReady) && family) {
              if (settings.plan.pickMyOwn) await textAdults(admin, p, settings, `DinnerDrop: your dinner choices for the week are ready. Pick the ones you want: ${APP}/dashboard`, 'plan_ready', { weekStart: target })
              else if (await hasOrdered(admin, p.id)) await textAdults(admin, p, settings, reorderText(meals, p.id), REORDER_ASK, { weekStart: target })
              else await textAdults(admin, p, settings, `DinnerDrop: this week's dinners are planned:\n${names.join('\n')}\n${planTextLinks(p, settings)}`, 'plan_ready', { weekStart: target })
            }
          }
        }
        }
      }

      if (opts.onlyAutoPlan) continue
      // ---- day-after nudge: new family, list built, nothing sent to a store yet → one text ----
      const ageH = (now.getTime() - new Date(p.created_at ?? 0).getTime()) / 3600000
      if (ageH >= 20 && ageH <= 72 && family && settings.texting.enabled && settings.texting.ownerPhone && smsConfigured() && p.household_id) {
        const { count: sent } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id)
        if (!sent) {
          const { count: plans } = await admin.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', p.id)
          if (plans && await sendListWaitingText(admin, p as unknown as SetupProfile, firstName(p) === 'there' ? '' : firstName(p))) report.listNudges++
        }
      }
      // ---- "anything else?" — the day before shopping day, ask the whole household (not just adults) ----
      const shop = settings.schedule.reminders.shopBy
      if (shop.channel !== 'off' && settings.texting.enabled && family && smsConfigured() && p.household_id) {
        const dayBefore = WEEKDAYS[(WEEKDAYS.indexOf(shop.day) + 6) % 7]
        if (tripMode ? !!voteTrip : dayBefore === weekday) {
          const { data: mem } = await admin.from('household_members').select('*').eq('household_id', p.household_id).not('phone', 'is', null)
          const since = new Date(now.getTime() - (tripMode ? 1 : 6) * 86400000).toISOString()
          const { count: asked } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('household_id', p.household_id).eq('intent', 'anything_else').gte('created_at', since)
          if (!asked) {
            for (const m of (mem ?? []) as MemberRow[]) {
              if (!m.can_add) continue
              await textMember(admin, m, `DinnerDrop: ${m.profile_id === p.id ? 'You send' : `${leaderLabel(p)} sends`} the grocery order tomorrow. Anything you want this week? Reply ADD + items (or send a photo of it).`, 'anything_else', settings.texting.weeklyCap)
            }
          }
        }
      }

      // ---- time to shop ----
      if (shop.channel !== 'off' && (tripMode ? !!shopTripToday : shop.day === weekday)) {
        const q = admin.from('meal_plans').select('id, meals, created_at').eq('user_id', p.id)
        const { data: plan } = await (shopTripToday ? q.eq('week_start', shopTripToday.key) : q).order('created_at', { ascending: false }).limit(1).single()
        if (plan) {
          const since = shopTripToday ? `${addDays(shopTripToday.shopDate, -1)}T00:00:00Z` : new Date(now.getTime() - 6 * 86400000).toISOString()
          const { count } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id).gte('created_at', since)
          if (!count) {
            const n = ((plan.meals as Meal[]) ?? []).length
            const link = shopLink(p, settings, 'shop_reminder')
            if (wantsEmail(shop.channel) && canEmail) {
              await sendEmail(p.email!, settings.stores.mode === 'instore' ? 'Your grocery list for the store' : 'Your grocery list is ready to send', emailShell(
                firstName(p) === 'there' ? 'Time to shop' : `Time to shop, ${firstName(p)}`,
                `<p>Your ${n} dinners are planned and the list is built. ${link.how}</p>`,
                { label: link.cta, href: link.url }
              ))
              report.shopReminders++
            }
            if (wantsSms(shop.channel) && family) {
              const line = settings.stores.mode === 'instore'
                ? `DinnerDrop: your grocery list for ${n} dinners is ready for the store. It opens on your phone, no sign-in: ${link.url}`
                : link.signIn
                  ? `DinnerDrop: your grocery list for ${n} dinners is ready. Open it to send it to Kroger: ${link.url}`
                  : `DinnerDrop: your grocery list for ${n} dinners is ready. Tap to put it in your Instacart cart, no sign-in: ${link.url} You check out there.`
              await textAdults(admin, p, settings, line, 'shop_reminder', { at: shop.time, sameDayOnly: true })
              report.shopReminders++
            }
          }
        }
      }

      // ---- tonight's dinner ----
      const cook = settings.schedule.reminders.cookTonight
      if (cook.channel !== 'off' && settings.plan.cookDays.includes(weekday)) {
        const tt = tripMode ? tonightTrip(tcfg, today) : null
        const cq = admin.from('meal_plans').select('meals').eq('user_id', p.id)
        const { data: plan } = tripMode && !tt ? { data: null } : await (tt ? cq.eq('week_start', tt.key) : cq).order('created_at', { ascending: false }).limit(1).single()
        const tonight = ((plan?.meals as Meal[]) ?? []).find((m) => m.day === todayLabel)
        if (tonight) {
          const line = `${tonight.name} — ${timeLabel(tonight)}`
          if (wantsEmail(cook.channel) && canEmail) {
            await sendEmail(p.email!, `Tonight: ${tonight.name}`, emailShell(
              `Tonight's dinner`,
              `<p><strong>${line}</strong></p>${tonight.steps?.length ? `<ol>${tonight.steps.slice(0, 5).map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}`,
              { label: 'Open cook mode', href: `${APP}/recipe/${encodeURIComponent(tonight.day.toLowerCase())}?cook=1` }
            ))
            report.cookReminders++
          }
          if (wantsSms(cook.channel) && family) {
            await textAdults(admin, p, settings, `DinnerDrop tonight: ${line}. Steps: ${APP}/recipe/${encodeURIComponent(tonight.day.toLowerCase())}?cook=1`, 'cook_tonight', { at: cook.time, sameDayOnly: true })
            report.cookReminders++
          }
        }
      }
    } catch (e) {
      report.errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  } finally {
    await admin.from('app_kv').delete().eq('key', LOCK)
  }
  return report
}
