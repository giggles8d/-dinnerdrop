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

