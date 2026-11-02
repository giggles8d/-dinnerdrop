import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'
import { currentSales } from '@/lib/sales'
import { matchSale, isUpcoming, type SaleMatch, type WeeklySales } from '@/lib/sales-shared'
import { mergeSettings } from '@/lib/settings'
import { pickLibraryRecipes, recipeToMeal, normalizeName, type RecipeRow } from '@/lib/recipe-library'
import { allergyConflicts } from '@/lib/allergens'

/**
 * "Swap a dinner to save": find this week's dinner that uses the fewest sale items and a library
 * dinner (same family rules as a normal swap) built on what's on sale at the family's stores.
 * Only main ingredients count — meat and seafood, produce, dairy — never salt, oil or spices.
 */

const MAIN_CATS = /meat|seafood|produce|dairy|egg/i
const TRIVIAL = /^(salt|pepper|black pepper|water|oil|olive oil|vegetable oil|canola oil|cooking spray|sugar|flour|garlic powder|onion powder|paprika|cumin|chili powder|oregano|dried oregano|italian seasoning|baking powder|baking soda|vanilla)$/i
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface SaleHit { ingredient: string; item: string; price: string; store: string; main: boolean }
export interface SwapSuggestion {
  day: string
  current: { name: string; hits: number; image?: string | null }
  next: { recipeId: string; name: string; image: string | null; cookTime: number | null; cuisine: string | null; hits: SaleHit[] }
  store: string
}

type Ing = { name: string; category?: string }

export function saleHits(ingredients: Ing[], sets: WeeklySales[]): SaleHit[] {
  const out: SaleHit[] = []
  const seen = new Set<string>()
  for (const ing of ingredients ?? []) {
    const n = String(ing?.name ?? '').trim()
    if (!n || TRIVIAL.test(n.toLowerCase())) continue
    const m: SaleMatch | null = matchSale(n, sets)
    if (!m || m.upcoming) continue
    const main = MAIN_CATS.test(m.category ?? '') || MAIN_CATS.test(ing.category ?? '')
    const key = m.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ingredient: n, item: m.name, price: m.price, store: m.store, main })
  }
  return out
}

const weight = (h: SaleHit[]) => h.reduce((s, x) => s + (x.main ? 1 : 0.4), 0)

/** Days of this plan still ahead (today counts), from week_start (YYYY-MM-DD). */
function upcomingDays(weekStart: string, todayISO: string): Set<string> {
  const out = new Set<string>()
  const start = new Date(weekStart + 'T12:00:00Z')
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    if (d.toISOString().slice(0, 10) >= todayISO) out.add(DAYS[d.getUTCDay()])
  }
  return out
}

export async function suggestSwaps(admin: SupabaseClient, ownerId: string, opts: { max?: number; todayISO?: string } = {}): Promise<{ suggestions: SwapSuggestion[]; reason?: string; planId?: string }> {
  const max = opts.max ?? 2
  const todayISO = opts.todayISO ?? new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10) // ET-ish
  const [{ data: plan }, { data: prof }, sets] = await Promise.all([
    admin.from('meal_plans').select('id, meals, week_start').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('profiles').select('settings, household_id, dietary_needs, family_size, max_cook_time').eq('id', ownerId).maybeSingle(),
    currentSales(admin, ownerId),
  ])
  const current = (sets ?? []).filter((s) => !isUpcoming(s))
  if (!plan) return { suggestions: [], reason: 'no-plan' }
  if (!current.length) return { suggestions: [], reason: 'no-sales', planId: plan.id }
  const { data: ordered } = await admin.from('list_items').select('id').eq('user_id', ownerId).eq('week_start', plan.week_start).not('ordered_at', 'is', null).limit(1)
  if (ordered?.length) return { suggestions: [], reason: 'already-ordered', planId: plan.id }

  const meals = ((plan.meals as Meal[]) ?? []).filter((m) => m && m.name)
  const ahead = upcomingDays(plan.week_start, todayISO)
  const candidates = meals.filter((m) => ahead.has(m.day))
  if (!candidates.length) return { suggestions: [], reason: 'week-over', planId: plan.id }

  // Family rules — the same hard limits a normal swap uses.
  const settings = mergeSettings(prof?.settings)
  const exclude = [...settings.food.neverIngredients, ...settings.food.avoidProteins]
  const allergies: string[] = ((prof?.dietary_needs ?? []) as string[]).filter((d) => /-free$/i.test(d.trim())).map((d) => d.replace(/-free$/i, '').trim())
  if (prof?.household_id) {
    const { data: members } = await admin.from('household_members').select('allergies').eq('household_id', prof.household_id)
    for (const m of members ?? []) { exclude.push(...(m.allergies ?? [])); allergies.push(...(m.allergies ?? [])) }
  }
  const dietary: string[] = Array.isArray(prof?.dietary_needs) ? (prof!.dietary_needs as string[]) : []
  const rows: RecipeRow[] = await pickLibraryRecipes(admin, {
    limit: 40,
    maxCookTime: Number(prof?.max_cook_time) || 45,
    maxCalories: settings.food.maxCalories,
    dietary,
    excludeWords: exclude,
    allergies,
    excludeNames: meals.map((m) => m.name),
    cuisines: settings.food.cuisines,
    boost: (r) => weight(saleHits(((r as unknown as { ingredients?: Ing[] }).ingredients ?? []), current)) * 3,
  })

  const scoredNext = rows
    .map((r) => ({ r, hits: saleHits((r.ingredients ?? []) as Ing[], current) }))
    .filter((x) => x.hits.some((h) => h.main) && weight(x.hits) >= 2)
    .filter((x) => !allergyConflicts(x.r.ingredients ?? [], [{ name: '', allergies }], x.r.name).length)
    .sort((a, b) => weight(b.hits) - weight(a.hits))

  const weakest = candidates
    .map((m) => ({ m, hits: saleHits((m.ingredients ?? []) as Ing[], current) }))
    .sort((a, b) => weight(a.hits) - weight(b.hits))

  const out: SwapSuggestion[] = []
  const used = new Set<string>()
  for (const w of weakest) {
    if (out.length >= max) break
    const pick = scoredNext.find((x) => !used.has(x.r.id) && weight(x.hits) >= weight(w.hits) + 1.5 && normalizeName(x.r.name) !== normalizeName(w.m.name))
    if (!pick) continue
    used.add(pick.r.id)
    const byStore = new Map<string, number>()
    pick.hits.forEach((h) => byStore.set(h.store, (byStore.get(h.store) ?? 0) + 1))
    const store = Array.from(byStore.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    out.push({
      day: w.m.day,
      current: { name: w.m.name, hits: w.hits.length, image: (w.m as Meal & { image?: string }).image ?? null },
      next: { recipeId: pick.r.id, name: pick.r.name, image: pick.r.image_url ?? null, cookTime: (pick.r as RecipeRow & { cook_time?: number }).cook_time ?? null, cuisine: pick.r.cuisine ?? null, hits: pick.hits.sort((a, b) => Number(b.main) - Number(a.main)).slice(0, 5) },
      store,
    })
  }
  return { suggestions: out, planId: plan.id, reason: out.length ? undefined : 'no-better-match' }
}

/** Put the library dinner in place of the planned one for that day; the grocery list rebuilds on next open. */
export async function applySwap(admin: SupabaseClient, ownerId: string, day: string, recipeId: string): Promise<{ ok: boolean; meal?: Meal; error?: string }> {
  const [{ data: plan }, { data: recipe }, { data: prof }] = await Promise.all([
    admin.from('meal_plans').select('id, meals, week_start').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('recipes').select('*').eq('id', recipeId).eq('is_public', true).maybeSingle(),
    admin.from('profiles').select('family_size').eq('id', ownerId).maybeSingle(),
  ])
  if (!plan) return { ok: false, error: 'No plan this week.' }
  if (!recipe) return { ok: false, error: 'That dinner is no longer available.' }
  const { data: ordered } = await admin.from('list_items').select('id').eq('user_id', ownerId).eq('week_start', plan.week_start).not('ordered_at', 'is', null).limit(1)
  if (ordered?.length) return { ok: false, error: 'This week’s groceries were already ordered.' }
  const meals = (plan.meals as Meal[]) ?? []
  if (!meals.some((m) => m.day === day)) return { ok: false, error: 'That night isn’t on this week’s plan.' }
  const meal = recipeToMeal(recipe as RecipeRow, day, Number(prof?.family_size) || undefined)
  const updated = meals.map((m) => (m.day === day ? meal : m))
  const { error } = await admin.from('meal_plans').update({ meals: updated, grocery_list: null }).eq('id', plan.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true, meal }
}
