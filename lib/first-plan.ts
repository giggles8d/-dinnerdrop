/**
 * Instant first week for a brand-new family: picked from the recipe library
 * (tested recipes with real photos) and saved right away — no AI wait, no
 * confirm step. If they leave and come back, their dinners are already there.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, cookTimeFor, type Weekday } from '@/lib/settings'
import { pickLibraryRecipes, recipeToMeal } from '@/lib/recipe-library'
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
    limit: dinners + 8,
    maxCookTime: maxCook,
    dietary: p.dietary_needs ?? [],
    excludeWords: [...settings.food.neverIngredients, ...settings.food.avoidProteins],
    excludeNames: [],
    cuisines: settings.food.cuisines,
  })
  // First impressions: dinners with a photo first.
  const pool = [...picks.filter((r) => r.image_url), ...picks.filter((r) => !r.image_url)]
  const ordered = pool.slice(0, dinners)
  // Stay within the family's weekly budget: swap the priciest pick for a cheaper spare until it fits.
  const budget = Number(String(p.weekly_budget ?? '').replace(/[^0-9.]/g, '')) || 100
  const cost = (r: (typeof pool)[number]) => Number(r.estimated_cost) || 0
  const spares = pool.slice(dinners).sort((a, b) => cost(a) - cost(b))
  let total = ordered.reduce((s, r) => s + cost(r), 0)
  while (total > budget && spares.length) {
    const i = ordered.reduce((best, r, idx) => (cost(r) > cost(ordered[best]) ? idx : best), 0)
    if (cost(spares[0]) >= cost(ordered[i])) break
    const swapIn = spares.shift()!
    total += cost(swapIn) - cost(ordered[i])
    ordered[i] = swapIn
  }
  if (ordered.length < Math.min(3, dinners)) {
    await trackStep(admin, userId, 'first_plan_failed', { found: ordered.length })
    return { ok: false, reason: 'not enough library recipes' }
  }

  const shape: PlanShape = { dinnersPerWeek: dinners, cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  const meals = ordered.map((r, i) => recipeToMeal(r, `L${i + 1}`, p.family_size || 4))
  const saved = await savePlan(admin, userId, mondayOf(new Date()), meals, shape)
  const totalCost = saved.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  await trackStep(admin, userId, 'first_plan_saved', { source: 'library', count: saved.length })
  return { ok: true, meals: saved, totalCost, existing: false }
}
