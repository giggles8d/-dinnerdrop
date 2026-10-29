/**
 * Instant first week for a brand-new family: picked from the recipe library
 * (recipes with real photos) and saved right away — no AI wait, no
 * confirm step. If they leave and come back, their dinners are already there.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, cookTimeFor, type Weekday } from '@/lib/settings'
import { pickLibraryRecipes, recipeToMeal, fitBudget } from '@/lib/recipe-library'
import { pickWithOverlap } from '@/lib/overlap'
import { DEFAULT_SHAPE, mondayOf, type PlanShape } from '@/lib/plan'
import { savePlan } from '@/lib/autoplan'
import { trackStep } from '@/lib/activation'
import type { Meal } from '@/types'

export type FirstPlanResult =
  | { ok: true; meals: Meal[]; totalCost: number; existing: boolean }
  | { ok: false; reason: string }

export async function buildFirstPlan(admin: SupabaseClient, userId: string): Promise<FirstPlanResult> {
  // Never overwrite: anyone who already has a plan keeps it.
  const { data: existing } = await admin.from('meal_plans').select('meals, total_estimated_cost').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
  if (existing?.[0]) return { ok: true, meals: existing[0].meals as Meal[], totalCost: Number(existing[0].total_estimated_cost) || 0, existing: true }

  const { data: p } = await admin.from('profiles').select('family_size, weekly_budget, max_cook_time, dietary_needs, settings').eq('id', userId).single()
  if (!p) return { ok: false, reason: 'no profile' }
  const settings = mergeSettings(p.settings)
  const cookDays: Weekday[] = settings.plan.cookDays.length ? settings.plan.cookDays : DEFAULT_SHAPE.cookDays
  const dinners = Math.min(Math.max(settings.plan.dinnersPerWeek, 3), 7)
  const maxCook = Math.max(...cookDays.map((d) => cookTimeFor(d, settings, p.max_cook_time || 30)))

  const picks = await pickLibraryRecipes(admin, {
    limit: dinners + 14,
    maxCookTime: maxCook,
    dietary: p.dietary_needs ?? [],
    excludeWords: [...settings.food.neverIngredients, ...settings.food.avoidProteins],
    excludeNames: [],
    cuisines: settings.food.cuisines,
  })
  // First impressions: dinners with a photo first. Sized to the family (cost included).
  const size = p.family_size || 4
  const withPhoto = picks.filter((r) => r.image_url).map((r, i) => recipeToMeal(r, `L${i + 1}`, size))
  const noPhoto = picks.filter((r) => !r.image_url).map((r, i) => recipeToMeal(r, `N${i + 1}`, size))
  // Within the photo-first order, lead with dinners that share fresh ingredients (whole packages get used).
  const pool = [...pickWithOverlap(withPhoto, withPhoto.length), ...noPhoto]
  const budget = Number(String(p.weekly_budget ?? '').replace(/[^0-9.]/g, '')) || 150
  const meals = fitBudget(pool, dinners, budget)
  if (meals.length < Math.min(3, dinners)) {
    await trackStep(admin, userId, 'first_plan_failed', { found: meals.length })
    return { ok: false, reason: 'not enough library recipes' }
  }

  const shape: PlanShape = { dinnersPerWeek: dinners, cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  const saved = await savePlan(admin, userId, mondayOf(new Date()), meals, shape)
  const totalCost = saved.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  await trackStep(admin, userId, 'first_plan_saved', { source: 'library', count: saved.length })
  return { ok: true, meals: saved, totalCost, existing: false }
}
