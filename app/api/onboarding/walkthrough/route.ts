import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { applyStyles } from '@/lib/apply-style'
import { trackStep } from '@/lib/activation'
import { ensureHousehold, setupFamilyTexting, type SetupProfile } from '@/lib/texting-setup'
import { GOAL_KEYS, type Goal } from '@/lib/onboarding'
import { mergeSettings, setSundayDinner, WEEKDAYS, type Weekday } from '@/lib/settings'
import { MIX_GROUPS, type MixKey } from '@/lib/protein-mix'
import { FOOD_STYLES } from '@/lib/styles'

export const dynamic = 'force-dynamic'

/**
 * POST — the first-time walkthrough's answers (components/Walkthrough.tsx), saved in one go before the first week:
 * goal, people [{ name, role, likes, dislikes, allergies, phone }] (people[0] is the planner), styles, diets,
 * weekly mix + how often, cook nights + busy-night minutes, Sunday family dinner, budget, store brands, vote day.
 */
type PersonIn = { name?: string; role?: string; likes?: string[]; dislikes?: string[]; allergies?: string[]; phone?: string }

const list = (x: unknown, max = 20) => (Array.isArray(x) ? x.map((v) => String(v).trim().slice(0, 40)).filter(Boolean).slice(0, max) : [])

export async function POST(request: Request) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const b = await request.json().catch(() => ({})) as Record<string, unknown>

  const { data: p } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
  if (!p) return NextResponse.json({ error: 'No profile' }, { status: 404 })
  const profile = p as SetupProfile

  const people = (Array.isArray(b.people) ? (b.people as PersonIn[]) : []).slice(0, 10)
  const goal = GOAL_KEYS.includes(String(b.goal)) ? (b.goal as Goal) : null
  const familySize = Math.min(Math.max(Number(b.familySize) || people.length || 4, 1), 12)
  const weeklyBudget = /^\$\d{2,4}\+?$/.test(String(b.weeklyBudget ?? '')) ? String(b.weeklyBudget) : '$150'
  const dietaryNeeds = list(b.dietaryNeeds, 8)
  const styles = list(b.styles, 13).filter((k) => FOOD_STYLES.some((s) => s.key === k))
  const busy = [15, 20, 30, 45, 60].includes(Number(b.busyMinutes)) ? Number(b.busyMinutes) : 30
  const cookDays = list(b.cookDays, 7).filter((d): d is Weekday => (WEEKDAYS as string[]).includes(d) && d !== 'sun')
  const voteDay = (WEEKDAYS as string[]).includes(String(b.voteDay)) ? (String(b.voteDay) as Weekday) : 'sat'

  // Settings first (styles read and add to them below).
  const settings = mergeSettings(profile.settings)
  if (goal) (settings as unknown as Record<string, unknown>).goal = goal
  if (cookDays.length) { settings.plan.cookDays = cookDays; settings.plan.dinnersPerWeek = Math.min(Math.max(cookDays.length, 3), 7) }
  const mixIn = b.mix && typeof b.mix === 'object' ? (b.mix as Record<string, unknown>) : null
  if (mixIn) {
    const mix: Partial<Record<MixKey, number>> = {}
    for (const g of MIX_GROUPS) { const n = Math.max(0, Math.min(7, Number(mixIn[g.key]) || 0)); if (n) mix[g.key] = n }
    settings.food.mix = Object.keys(mix).length ? mix : null
    const ev = (b.mixEvery && typeof b.mixEvery === 'object' ? b.mixEvery : {}) as Record<string, unknown>
    settings.food.mixEvery = Object.fromEntries(MIX_GROUPS.map((g) => [g.key, Number(ev[g.key])]).filter(([, v]) => v === 2 || v === 4)) as Settings['food']['mixEvery']
  }
  const sun = (b.sunday && typeof b.sunday === 'object' ? b.sunday : {}) as { on?: boolean; minutes?: number; extraForMonday?: boolean }
  if (sun.on) setSundayDinner(settings, true, Number(sun.minutes) || 120, sun.extraForMonday !== false)
  settings.food.storeBrands = b.storeBrands === true
  settings.texting.voteDay = voteDay
  if (people.some((x) => x.role === 'kid')) settings.food.kidFriendly = true

  await admin.from('profiles').update({
    family_size: familySize,
    weekly_budget: weeklyBudget,
    dietary_needs: dietaryNeeds,
    max_cook_time: busy,
    settings,
    onboarding_complete: true,
    ...(people[0]?.name?.trim() && !profile.full_name ? { full_name: people[0].name.trim().slice(0, 40) } : {}),
  }).eq('id', user.id)
  if (styles.length) await applyStyles(admin, user.id, styles).catch(() => {})

  // The family: the planner (people[0]) plus everyone named, with their likes, won't-eats and allergies.
  const hid = await ensureHousehold(admin, profile)
  if (hid) {
    const { data: existing } = await admin.from('household_members').select('id, name, profile_id').eq('household_id', hid)
    for (let i = 0; i < people.length; i++) {
      const x = people[i]
      const name = String(x.name ?? '').trim().slice(0, 40)
      if (!name && i > 0) continue
      const role = x.role === 'kid' ? 'kid' : 'adult'
      const row = {
        name: name || (profile.full_name || 'Me').split(' ')[0], role, age_band: role === 'kid' ? 'kid' : 'adult',
        likes: list(x.likes), dislikes: list(x.dislikes), allergies: list(x.allergies),
      }
      const same = i === 0
        ? (existing ?? []).find((e) => e.profile_id === profile.id)
        : (existing ?? []).find((e) => !e.profile_id && e.name?.toLowerCase() === name.toLowerCase())
      if (same) await admin.from('household_members').update(row).eq('id', same.id)
      else await admin.from('household_members').insert({ household_id: hid, ...(i === 0 ? { profile_id: profile.id } : {}), can_vote: true, can_add: role === 'adult', ...row })
    }
  }

  // Texting: re-read settings so styles applied above aren't overwritten.
  let texting: unknown = null
  const ownerPhone = people[0]?.phone
  const family = people.slice(1).filter((x) => String(x.name ?? '').trim() && String(x.phone ?? '').replace(/\D/g, '').length >= 10).map((x) => ({ name: String(x.name).trim(), phone: String(x.phone) }))
  if ((ownerPhone && ownerPhone.replace(/\D/g, '').length >= 10) || family.length) {
    const { data: fresh } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
    if (fresh) {
      const r = await setupFamilyTexting(admin, fresh as SetupProfile, { ownerPhone, members: family })
      if (!('error' in r)) texting = r
    }
  }
  await trackStep(admin, user.id, 'quick_setup_done', { walkthrough: true, goal, people: people.length, styles: styles.length, mix: !!mixIn, sunday: !!sun.on, phone: !!ownerPhone })
  return NextResponse.json({ ok: true, texting })
}

type Settings = ReturnType<typeof mergeSettings>
