/**
 * Instant first week for a brand-new family: picked from the recipe library
 * (recipes with real photos) and saved right away — no AI wait, no
 * confirm step. If they leave and come back, their dinners are already there.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, cookTimeFor, type Weekday } from '@/lib/settings'
import { pickLibraryRecipes, recipeToMeal, fitBudget } from '@/lib/recipe-library'
import { pickWithOverlap } from '@/lib/overlap'
import { varietyLimits, varietyOk, recentUsage, overusePenalty } from '@/lib/variety'
import { completePlates } from '@/lib/full-plate'
import { DEFAULT_SHAPE, mondayOf, type PlanShape } from '@/lib/plan'
import { savePlan } from '@/lib/autoplan'
import { trackStep } from '@/lib/activation'
import { grantNewFamilyTrial } from '@/lib/family-grant'
import { dropStarterWeek } from '@/lib/starter-week'
import type { Meal } from '@/types'

export type FirstPlanResult =
  | { ok: true; meals: Meal[]; totalCost: number; existing: boolean }
  | { ok: false; reason: string }

export async function buildFirstPlan(admin: SupabaseClient, userId: string, opts: { afterSetup?: boolean } = {}): Promise<FirstPlanResult> {
  // Finished setup after we'd built them a starter week (lib/starter-week)? Rebuild it from their answers.
  if (opts.afterSetup) await dropStarterWeek(admin, userId).catch(() => false)
  // Never overwrite: anyone who already has a plan keeps it.
  const { data: existing } = await admin.from('meal_plans').select('meals, total_estimated_cost').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
  if (existing?.[0]) return { ok: true, meals: existing[0].meals as Meal[], totalCost: Number(existing[0].total_estimated_cost) || 0, existing: true }

  // Every new family starts with 14 days of Family (texting, profiles, reminders) — no card.
  await grantNewFamilyTrial(admin, userId).catch(() => {})
  const built = await libraryWeek(admin, userId)
  if (!built.ok) {
    if (built.reason === 'not enough library recipes') await trackStep(admin, userId, 'first_plan_failed', { found: built.found ?? 0 })
    return { ok: false, reason: built.reason }
  }
  const saved = await savePlan(admin, userId, mondayOf(new Date()), built.meals, built.shape)
  const totalCost = saved.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  await trackStep(admin, userId, 'first_plan_saved', { source: 'library', count: saved.length })
  return { ok: true, meals: saved, totalCost, existing: false }
}

/**
 * A week picked from the recipe library for this family's settings — fast, no AI. Used for a new family's first
 * week and by the Sunday Drop ("I picked 5 dinners for you", lib/sunday-drop). Not saved; the caller saves it.
 */
export async function libraryWeek(admin: SupabaseClient, userId: string, excludeNames: string[] = []): Promise<{ ok: true; meals: Meal[]; shape: PlanShape } | { ok: false; reason: string; found?: number }> {
  const { data: p } = await admin.from('profiles').select('family_size, weekly_budget, max_cook_time, dietary_needs, settings').eq('id', userId).single()
  if (!p) return { ok: false, reason: 'no profile' }
  const settings = mergeSettings(p.settings)
  const cookDays: Weekday[] = settings.plan.cookDays.length ? settings.plan.cookDays : DEFAULT_SHAPE.cookDays
  const dinners = Math.min(Math.max(settings.plan.dinnersPerWeek, 3), 7)
  const maxCook = Math.max(...cookDays.map((d) => cookTimeFor(d, settings, p.max_cook_time || 30)))

  // Nov 7 2026: everyone's first week was the same few dinners (one pita recipe went to 86 families in 3 days).
  // Recipes many families already got this week are pushed down, and the week keeps to the variety rules.
  const usage = await recentUsage(admin)
  const picks = await pickLibraryRecipes(admin, {
    boost: (r) => -overusePenalty(usage, r.name),
    limit: dinners + 24,
    maxCookTime: maxCook,
    dietary: p.dietary_needs ?? [],
    excludeWords: [...settings.food.neverIngredients, ...settings.food.avoidProteins],
    excludeNames,
    cuisines: settings.food.cuisines,
    ignoreKept: true,
  })
  // First impressions: dinners with a photo first. Sized to the family (cost included).
  const size = p.family_size || 4
  const withPhoto = picks.filter((r) => r.image_url).map((r, i) => recipeToMeal(r, `L${i + 1}`, size))
  const noPhoto = picks.filter((r) => !r.image_url).map((r, i) => recipeToMeal(r, `N${i + 1}`, size))
  // Within the photo-first order, lead with dinners that share fresh ingredients (whole packages get used).
  const lim = varietyLimits(dinners)
  const pool = [...pickWithOverlap(withPhoto, withPhoto.length, [], (m, ch) => varietyOk(m, ch.slice(0, dinners), lim)), ...noPhoto]
  const budget = Number(String(p.weekly_budget ?? '').replace(/[^0-9.]/g, '')) || 150
  const meals = settings.food.fullPlate ? completePlates(fitBudget(pool, dinners, budget), { dietaryNeeds: p.dietary_needs ?? [], avoid: [...settings.food.neverIngredients, ...settings.food.avoidProteins] }) : fitBudget(pool, dinners, budget)
  if (meals.length < Math.min(3, dinners)) return { ok: false, reason: 'not enough library recipes', found: meals.length }
  const shape: PlanShape = { dinnersPerWeek: dinners, cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  return { ok: true, meals, shape }
}
