/**
 * Generate + save a week for a family without them lifting a finger.
 * Used by the daily cron (plan day) and by the vote-day texting cycle.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Settings } from '@/lib/settings'
import { assignNights, type PlanShape } from '@/lib/plan'
import type { Meal } from '@/types'

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


/** Candidate dinners for the family to vote on — generated, not saved as a plan. */
export async function generateCandidates(admin: SupabaseClient, p: AutoPlanProfile, count: number): Promise<{ meals: Meal[]; shape: PlanShape }> {
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
      optionsCount: count,
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
