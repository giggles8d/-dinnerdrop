/**
 * Instant first week for a brand-new family: picked from the recipe library
 * (recipes with real photos) and saved right away — no AI wait, no
 * confirm step. If they leave and come back, their dinners are already there.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, cookTimeFor, type Weekday } from '@/lib/settings'
import { pickLibraryRecipes, recipeToMeal, fitBudget } from '@/lib/recipe-library'
import { pickWithOverlap } from '@/lib/overlap'
import { proteinGroup } from '@/lib/protein-mix'
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
  const built = await libraryWeek(admin, userId, [], { firstWeek: true })
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
export async function libraryWeek(admin: SupabaseClient, userId: string, excludeNames: string[] = [], opts: { firstWeek?: boolean } = {}): Promise<{ ok: true; meals: Meal[]; shape: PlanShape } | { ok: false; reason: string; found?: number }> {
  const { data: p } = await admin.from('profiles').select('family_size, weekly_budget, max_cook_time, dietary_needs, settings').eq('id', userId).single()
  if (!p) return { ok: false, reason: 'no profile' }
  const settings = mergeSettings(p.settings)
  const cookDays: Weekday[] = settings.plan.cookDays.length ? settings.plan.cookDays : DEFAULT_SHAPE.cookDays
  const dinners = Math.min(Math.max(settings.plan.dinnersPerWeek, 3), 7)
  const maxCook = Math.max(...cookDays.map((d) => cookTimeFor(d, settings, p.max_cook_time || 30)))

  // Nov 7 2026: everyone's first week was the same few dinners (one pita recipe went to 86 families in 3 days).
  // Recipes many families already got this week are pushed down, and the week keeps to the variety rules.
  const usage = await recentUsage(admin)
  // First week (Sarah, Nov 9 2026, after comparing 194 first weeks: weeks with 2+ seafood/adventurous dinners were sent
  // to a store 5% of the time, weeks with 2+ familiar favorites about 13%): no seafood unless the family asked for it
  // (pescatarian, fish in their weekly mix, or Mediterranean), and when no diet is picked, familiar kid favorites lead.
  const diets = (p.dietary_needs ?? []).map((d: string) => d.toLowerCase())
  const styles: string[] = (settings.food as { styles?: string[] }).styles ?? []
  const wantsSeafood = diets.includes('pescatarian') || styles.includes('mediterranean') || Number((settings.food.mix as Record<string, number> | null)?.fish ?? 0) > 0
  const noSeafood = !!opts.firstWeek && !wantsSeafood
  const favoritesFirst = !!opts.firstWeek && diets.length === 0
  // What the family said they like in setup (Tacos, Pasta, Mac and cheese…) leads too, and a cuisine picked as one
  // style among several (e.g. Mediterranean + family + budget) is a preference, not the only food they eat
  // (Nov 9 2026: a taco-and-mac-and-cheese family got fava beans and lamb kebabs).
  let likes: string[] = []
  if (opts.firstWeek) {
    const { data: hh } = await admin.from('profiles').select('household_id').eq('id', userId).single()
    if (hh?.household_id) {
      const { data: mem } = await admin.from('household_members').select('likes').eq('household_id', hh.household_id)
      likes = Array.from(new Set(((mem ?? []) as Array<{ likes: string[] | null }>).flatMap((x) => x.likes ?? []).map((l) => l.toLowerCase().replace(/s$/, '')).filter((l) => l.length >= 3)))
    }
  }
  const softCuisine = !!opts.firstWeek && styles.length > 1
  const preferred = softCuisine ? settings.food.cuisines.map((c) => c.toLowerCase()) : []
  const firstWeekBoost = (r: { name: string; protein: string | null; cuisine: string | null; tags?: string[] | null }) =>
    (favoritesFirst && (r.tags ?? []).some((t) => t === 'kid-favorite' || t === 'comfort-food') ? 3 : 0)
    + (likes.some((l) => r.name.toLowerCase().includes(l)) ? 2 : 0)
    + (preferred.length && r.cuisine && preferred.includes(r.cuisine.toLowerCase()) ? 0.7 : 0)
  // Nov 9 2026: a family ticked six diets at once (vegetarian + keto + paleo + …) and no dinner fits all of them,
  // so their first week failed. When too few dinners fit, loosen step by step: cuisines first, then the softer
  // diet styles one at a time. Hard needs (vegetarian, vegan, allergies) are never dropped.
  const want = Math.min(3, dinners) + 2
  let picks: Awaited<ReturnType<typeof pickLibraryRecipes>> = []
  for (const step of relaxSteps(p.dietary_needs ?? [], softCuisine ? [] : settings.food.cuisines)) {
    picks = await pickLibraryRecipes(admin, {
      boost: (r) => -overusePenalty(usage, r.name) + firstWeekBoost(r),
      limit: dinners + 24,
      maxCookTime: maxCook,
      dietary: step.dietary,
      excludeWords: [...settings.food.neverIngredients, ...settings.food.avoidProteins],
      excludeNames,
      cuisines: step.cuisines,
      ignoreKept: true,
    })
    if (noSeafood) picks = picks.filter((r) => proteinGroup(r.protein, r.name) !== 'fish')
    if (picks.length >= want) break
  }
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

/** Softer styles drop first (first in this list goes first); anything not listed (vegetarian, vegan, allergies) stays. */
const SOFT_DIETS = ['paleo', 'keto', 'mediterranean', 'low-carb', 'high-protein', 'heart-healthy', 'diabetic-friendly']

export function relaxSteps(dietary: string[], cuisines: string[]): { dietary: string[]; cuisines: string[] }[] {
  const steps = [{ dietary, cuisines }]
  if (cuisines.length) steps.push({ dietary, cuisines: [] })
  let d = dietary
  for (const soft of SOFT_DIETS) {
    const next = d.filter((x) => x.toLowerCase() !== soft)
    if (next.length !== d.length) { d = next; steps.push({ dietary: d, cuisines: [] }) }
  }
  return steps
}


/**
 * 12–15 dinners for a family that has never ordered (Sarah, Nov 9 2026: "every week we need to try very hard to get
 * all the ones that have signed up but have not bought … give them more options to pick from and more family
 * friendly options"). Their current week leads (pre-checked on the dashboard), then more dinners that fit them
 * under the first-week rules (familiar favorites, no seafood unless asked). Keys O1…On; [] if fewer than 12.
 */
export async function weekOptions(admin: SupabaseClient, userId: string, current: Meal[]): Promise<Meal[]> {
  const pool: Meal[] = [...current]
  for (let i = 0; i < 3 && pool.length < 15; i++) {
    const more = await libraryWeek(admin, userId, pool.map((m) => m.name), { firstWeek: true }).catch(() => null)
    if (!more || !more.ok || !more.meals.length) break
    pool.push(...more.meals.filter((m) => !pool.some((x) => x.name === m.name)))
  }
  return pool.length >= 12 ? pool.slice(0, 15).map((m, i) => ({ ...m, day: `O${i + 1}` })) : []
}

/** Never ordered and this week's dinners weren't picked by the family themselves → show them options. */
export async function shouldOfferOptions(admin: SupabaseClient, userId: string, latest: Meal[] | null): Promise<boolean> {
  if (!latest?.length) return false
  if (latest.some((m) => (m as Meal & { pickedByFamily?: boolean }).pickedByFamily)) return false
  const { count } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  return !(count ?? 0)
}
