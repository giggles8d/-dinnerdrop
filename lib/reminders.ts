/**
 * Daily reminders + automatic weekly plans. Runs once a day from /api/cron/daily
 * (Vercel cron, 12:00 UTC ≈ 8am ET). Everything keys off each family's own
 * timezone and the day-level settings in profiles.settings; time-of-day
 * settings pick the morning send vs. an afternoon send when the cron runs
 * more than once a day.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, WEEKDAY_LABEL, type Settings, type Channel } from '@/lib/settings'
import { assignNights, localNow, mondayOf, type PlanShape } from '@/lib/plan'
import { sendEmail, sendSms, emailShell, smsConfigured } from '@/lib/notify'
import { isFamilyProfile } from '@/lib/access'
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
}

interface MemberPhone { name: string; phone: string; role: string }

export interface DailyReport {
  checked: number
  autoPlans: number
  shopReminders: number
  cookReminders: number
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

/** Generate + save a plan for a family without them lifting a finger. */
async function autoPlan(admin: SupabaseClient, p: ProfileRow, settings: Settings, weekStart: string): Promise<Meal[] | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL || APP
  const { data: favs } = await admin.from('favorites').select('meal_data').eq('user_id', p.id)
  const res = await fetch(`${base}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: p.id,
      familySize: p.family_size,
      weeklyBudget: p.weekly_budget,
      maxCookTime: p.max_cook_time,
      cuisinePreference: p.cuisine_preference,
      dietaryNeeds: p.dietary_needs || [],
      favoriteMeals: (favs ?? []).map((f) => f.meal_data),
    }),
  })
  if (!res.ok) throw new Error(`generate-plan ${res.status}`)
  const data = await res.json() as { meals: Meal[]; plan?: PlanShape }
  const shape: PlanShape = data.plan ?? { dinnersPerWeek: settings.plan.dinnersPerWeek, cookDays: settings.plan.cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  const chosen = assignNights((data.meals ?? []).slice(0, shape.dinnersPerWeek), shape)
  if (!chosen.length) return null
  const total = chosen.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  await admin.from('meal_plans').insert({ user_id: p.id, week_start: weekStart, meals: chosen, grocery_list: {}, total_estimated_cost: total })
  return chosen
}

export async function runDailyReminders(admin: SupabaseClient, now: Date = new Date()): Promise<DailyReport> {
  const report: DailyReport = { checked: 0, autoPlans: 0, shopReminders: 0, cookReminders: 0, errors: [] }
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, timezone, settings, household_id, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs, subscription_status, is_beta_member, family_until, email_unsubscribed')
    .not('settings', 'eq', '{}')
  const thisMonday = mondayOf(now)

  for (const p of (profiles ?? []) as ProfileRow[]) {
    report.checked++
    try {
      const settings = mergeSettings(p.settings)
      const tz = p.timezone || 'America/New_York'
      const { weekday } = localNow(tz, now)
      const todayLabel = WEEKDAY_LABEL[weekday]
      const canEmail = !!p.email && !p.email_unsubscribed
      const family = isFamilyProfile(p)

      // ---- automatic weekly plan ----
      if (settings.schedule.autoPlan && settings.schedule.planDay === weekday) {
        // Planning on Sat/Sun targets the coming Monday; mid-week targets this week.
        const target = (weekday === 'sat' || weekday === 'sun')
          ? mondayOf(new Date(now.getTime() + 2 * 86400000 + (weekday === 'sat' ? 86400000 : 0)))
          : thisMonday
        const { data: existing } = await admin.from('meal_plans').select('id').eq('user_id', p.id).eq('week_start', target).limit(1)
        if (!existing?.length) {
          const meals = await autoPlan(admin, p, settings, target)
          if (meals) {
            report.autoPlans++
            const names = meals.map((m) => `${m.day}: ${m.name}`)
            if (wantsEmail(settings.schedule.reminders.planReady) && canEmail) {
              await sendEmail(p.email!, `Your dinners for the week are planned`, emailShell(
                `Hi ${firstName(p)}, your week is planned`,
                `<p>Here's what's cooking:</p><ul>${names.map((n) => `<li>${n}</li>`).join('')}</ul><p>Swap anything you like, then send the list to your cart in one tap.</p>`,
                { label: 'See the week', href: `${APP}/dashboard` }
              ))
            }
            if (wantsSms(settings.schedule.reminders.planReady) && family) {
              await textAdults(admin, p, settings, `DinnerDrop: this week's dinners are planned —\n${names.join('\n')}\nSwap or shop: ${APP}/dashboard`, 'plan_ready')
            }
          }
        }
      }

      // ---- time to shop ----
      const shop = settings.schedule.reminders.shopBy
      if (shop.channel !== 'off' && shop.day === weekday) {
        const { data: plan } = await admin.from('meal_plans').select('id, meals, created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1).single()
        if (plan) {
          const since = new Date(now.getTime() - 6 * 86400000).toISOString()
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
        const { data: plan } = await admin.from('meal_plans').select('meals').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1).single()
        const tonight = ((plan?.meals as Meal[]) ?? []).find((m) => m.day === todayLabel)
        if (tonight) {
          const line = `${tonight.name} — about ${tonight.cookTime} min${tonight.prepTime ? ` (${tonight.prepTime} min prep)` : ''}`
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
  return report
}
