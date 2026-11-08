/**
 * Daily reminders + automatic weekly plans. Runs once a day from /api/cron/daily
 * (Vercel cron, 12:00 UTC ≈ 8am ET). Everything keys off each family's own
 * timezone and the day-level settings in profiles.settings; time-of-day
 * settings pick the morning send vs. an afternoon send when the cron runs
 * more than once a day.
 */
import { leaderLabel } from '@/lib/family-ask'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, WEEKDAY_LABEL, WEEKDAYS, tripsConfig, type Settings, type Channel } from '@/lib/settings'
import { isClassic, resolveTrips, tripInstances, tonightTrip, voteTripOn, addDays } from '@/lib/trips'
import { localNow, mondayOf, timeLabel } from '@/lib/plan'
import { autoPlan } from '@/lib/autoplan'
import { sendEmail, sendSms, emailShell, smsConfigured } from '@/lib/notify'
import { attachLibraryImages } from '@/lib/library-images'
import { planReadySubject, planReadyHtml } from '@/lib/plan-ready-email'
import { dropConfig, sendDrop, type DropProfile } from '@/lib/sunday-drop'
import { shopUrl, logFollowup } from '@/lib/followup'
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

function wantsEmail(c: Channel) { return c === 'email' || c === 'both' }
function wantsSms(c: Channel) { return c === 'sms' || c === 'both' }
function firstName(p: ProfileRow) { return (p.full_name || '').trim().split(' ')[0] || 'there' }

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

async function textAdults(admin: SupabaseClient, p: ProfileRow, settings: Settings, body: string, intent: string) {
  if (!smsConfigured() || !settings.texting.enabled) return
  const adults = await optedInPhones(admin, p.household_id)
  for (const a of adults) {
    const r = await sendSms(a.phone, body)
    await admin.from('sms_messages').insert({ household_id: p.household_id, direction: 'out', to_number: a.phone, body, intent, twilio_sid: r.sid ?? null })
  }
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
  // Families with no plan in this long have drifted away; don't keep planning for them.
  const ACTIVE_DAYS = 45

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
        const { data: recentPlan } = await admin.from('meal_plans').select('created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1)
        const active = recentPlan?.[0]?.created_at && now.getTime() - new Date(recentPlan[0].created_at).getTime() <= ACTIVE_DAYS * 86400000
        if (active && !familyVotes && !existing?.length) {
          const meals = await autoPlan(admin, p, settings, voteTrip.key)
          if (meals) {
            report.autoPlans++
            if (wantsSms(settings.schedule.reminders.planReady) && family) {
              await textAdults(admin, p, settings, `DinnerDrop: dinners for your next trip are planned —\n${meals.map((m) => `${m.day}: ${m.name}`).join('\n')}\nSwap or shop: ${APP}/dashboard`, 'plan_ready')
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
              await sendEmail(p.email!, planReadySubject(withPhotos), planReadyHtml({ firstName: firstName(p), meals: withPhotos, weekLabel, unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}`, shopUrl: shopUrl(p.id, 'plan_ready') }))
              await logFollowup(admin, p.id, 'plan_ready')
            }
          }
        }
      }

      // ---- automatic weekly plan ----
      // Plan day, or the day after if the run ran out of time before reaching this family.
      const dayAfterPlanDay = WEEKDAYS[(WEEKDAYS.indexOf(settings.schedule.planDay) + 1) % 7]
      if (!tripMode && settings.schedule.autoPlan && (settings.schedule.planDay === weekday || dayAfterPlanDay === weekday) && Date.now() - started < 200_000) {
        const { data: recent } = await admin.from('meal_plans').select('created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1)
        const lastPlan = recent?.[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0
        if (now.getTime() - lastPlan <= ACTIVE_DAYS * 86400000) {
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
              await sendEmail(p.email!, planReadySubject(withPhotos), planReadyHtml({ firstName: firstName(p), meals: withPhotos, weekLabel, unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}`, shopUrl: shopUrl(p.id, 'plan_ready') }))
              await logFollowup(admin, p.id, 'plan_ready')
            }
            if (wantsSms(settings.schedule.reminders.planReady) && family) {
              await textAdults(admin, p, settings, `DinnerDrop: this week's dinners are planned —\n${names.join('\n')}\nSwap or shop: ${APP}/dashboard`, 'plan_ready')
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
            if (wantsEmail(shop.channel) && canEmail) {
              await sendEmail(p.email!, `Your grocery list is ready to send`, emailShell(
                `Time to shop, ${firstName(p)}`,
                `<p>Your ${n} dinners are planned and the list is built. One tap sends it to your Instacart or Kroger cart — nothing to type.</p>`,
                { label: 'Send my list to the cart', href: `${APP}/grocery-list` }
              ))
              report.shopReminders++
            }
            if (wantsSms(shop.channel) && family) {
              await textAdults(admin, p, settings, `DinnerDrop: your grocery list for ${n} dinners is ready. One tap to your cart: ${APP}/grocery-list`, 'shop_reminder')
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
            await textAdults(admin, p, settings, `DinnerDrop tonight: ${line}. Steps: ${APP}/recipe/${encodeURIComponent(tonight.day.toLowerCase())}?cook=1`, 'cook_tonight')
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
