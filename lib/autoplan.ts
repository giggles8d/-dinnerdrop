/**
 * Generate + save a week for a family without them lifting a finger.
 * Used by the daily cron (plan day) and by the vote-day texting cycle.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Settings } from '@/lib/settings'
import { assignNights, type PlanShape } from '@/lib/plan'
import type { Meal } from '@/types'
import { pickVaried, varietyLimits } from '@/lib/variety'

const APP = 'https://www.dinnerdrop.app'

export interface AutoPlanProfile {
  id: string
  family_size: number
  weekly_budget: string
  max_cook_time: number
  cuisine_preference: string
  dietary_needs: string[] | null
}

/** Generate + save a plan for a family without them lifting a finger. */
export async function autoPlan(admin: SupabaseClient, p: AutoPlanProfile, settings: Settings, weekStart: string): Promise<Meal[] | null> {
  // Never ordered (Sarah, Nov 9 2026: "try very hard every week" for families who signed up but haven't bought):
  // their weekly menu follows the first-week rules (familiar kid favorites, no seafood unless asked), not new AI
  // dishes. Last week's dinners are left out so it's a fresh week. Falls back to the AI planner if the library can't.
  const { count: sends } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id)
  if (!(sends ?? 0)) {
    try {
      const { libraryWeek } = await import('@/lib/first-plan')
      const { data: last } = await admin.from('meal_plans').select('meals').eq('user_id', p.id).order('created_at', { ascending: false }).limit(2)
      const recent = (last ?? []).flatMap((x) => ((x.meals ?? []) as Meal[]).map((m) => m.name))
      const lw = await libraryWeek(admin, p.id, recent, { firstWeek: true })
      if (lw.ok && lw.meals.length) {
        const chosen = assignNights(lw.meals, lw.shape)
        const total = chosen.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
        await admin.from('meal_plans').insert({ user_id: p.id, week_start: weekStart, meals: chosen, grocery_list: {}, total_estimated_cost: total })
        return chosen
      }
    } catch (e) {
      console.error('autoPlan library week', p.id, e)
    }
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || APP
  const { data: favs } = await admin.from('favorites').select('meal_data').eq('user_id', p.id)
  const res = await fetch(`${base}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({
      userId: p.id,
      familySize: p.family_size,
      weeklyBudget: p.weekly_budget,
      maxCookTime: p.max_cook_time,
      cuisinePreference: p.cuisine_preference,
      dietaryNeeds: p.dietary_needs || [],
      favoriteMeals: (favs ?? []).map((f) => f.meal_data),
      tripKey: weekStart,   // trip mode plans exactly this trip; ignored in the classic setup
    }),
  })
  if (!res.ok) throw new Error(`generate-plan ${res.status}`)
  const data = await res.json() as { meals: Meal[]; plan?: PlanShape }
  const shape: PlanShape = data.plan ?? { dinnersPerWeek: settings.plan.dinnersPerWeek, cookDays: settings.plan.cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  // Family picks and ideas lead the list; the rest of the week keeps to the variety rules (lib/variety).
  const chosen = assignNights(pickVaried(data.meals ?? [], shape.dinnersPerWeek, [], varietyLimits(shape.dinnersPerWeek)), shape)
  if (!chosen.length) return null
  const total = chosen.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  await admin.from('meal_plans').insert({ user_id: p.id, week_start: weekStart, meals: chosen, grocery_list: {}, total_estimated_cost: total })
  return chosen
}


/** Candidate dinners for the family to vote on — generated, not saved as a plan. */
export async function generateCandidates(admin: SupabaseClient, p: AutoPlanProfile, count: number, tripKey?: string): Promise<{ meals: Meal[]; shape: PlanShape }> {
  const base = process.env.NEXT_PUBLIC_APP_URL || APP
  const { data: favs } = await admin.from('favorites').select('meal_data').eq('user_id', p.id)
  const res = await fetch(`${base}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({
      userId: p.id,
      familySize: p.family_size,
      weeklyBudget: p.weekly_budget,
      maxCookTime: p.max_cook_time,
      cuisinePreference: p.cuisine_preference,
      dietaryNeeds: p.dietary_needs || [],
      favoriteMeals: (favs ?? []).map((f) => f.meal_data),
      optionsCount: count,
      tripKey,
    }),
  })
  if (!res.ok) throw new Error(`generate-plan ${res.status}`)
  const data = await res.json() as { meals: Meal[]; plan?: PlanShape }
  const shape: PlanShape = data.plan ?? { dinnersPerWeek: 5, cookDays: ['mon', 'tue', 'wed', 'thu', 'fri'], nightTimes: [], leftoverNight: false }
  return { meals: (data.meals ?? []).slice(0, count), shape }
}

/** Save a finalized week (replacing any plan already saved for that week). */
export async function savePlan(admin: SupabaseClient, userId: string, weekStart: string, meals: Meal[], shape: PlanShape): Promise<Meal[]> {
  const chosen = assignNights(meals, shape)
  const total = chosen.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  const { data: existing } = await admin.from('meal_plans').select('id').eq('user_id', userId).eq('week_start', weekStart).order('created_at', { ascending: false }).limit(1)
  if (existing?.[0]) {
    await admin.from('meal_plans').update({ meals: chosen, grocery_list: {}, total_estimated_cost: total, created_at: new Date().toISOString() }).eq('id', existing[0].id)
  } else {
    await admin.from('meal_plans').insert({ user_id: userId, week_start: weekStart, meals: chosen, grocery_list: {}, total_estimated_cost: total })
  }
  return chosen
}

/**
 * Rebuild a family's already-saved week in place (same week, replaced): used once on Nov 7 2026 to re-plan the
 * auto-built weeks with the variety and full-plate rules (app/api/admin/rebuild-weeks).
 */
export async function rebuildWeek(admin: SupabaseClient, p: AutoPlanProfile, settings: Settings, weekStart: string): Promise<Meal[] | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL || APP
  const { data: favs } = await admin.from('favorites').select('meal_data').eq('user_id', p.id)
  const res = await fetch(`${base}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({
      userId: p.id,
      familySize: p.family_size,
      weeklyBudget: p.weekly_budget,
      maxCookTime: p.max_cook_time,
      cuisinePreference: p.cuisine_preference,
      dietaryNeeds: p.dietary_needs || [],
      favoriteMeals: (favs ?? []).map((f) => f.meal_data),
      tripKey: weekStart,
    }),
  })
  if (!res.ok) throw new Error(`generate-plan ${res.status}`)
  const data = await res.json() as { meals: Meal[]; plan?: PlanShape }
  const shape: PlanShape = data.plan ?? { dinnersPerWeek: settings.plan.dinnersPerWeek, cookDays: settings.plan.cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  const picked = pickVaried(data.meals ?? [], shape.dinnersPerWeek, [], varietyLimits(shape.dinnersPerWeek))
  if (!picked.length) return null
  return savePlan(admin, p.id, weekStart, picked, shape)
}
