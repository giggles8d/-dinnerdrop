/**
 * Recipe library — server-only helpers around public.recipes.
 *
 * Every dinner the planner generates is stored once (name-normalized), with
 * its Unsplash photo fetched a single time and kept on the row. Only the
 * nightly grower's recipes are public; dinners generated inside a family's
 * plan or swap stay private to that family. Later plans pull from the public
 * library instead of regenerating, and families can browse / upload their own.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanNutrition } from '@/lib/nutrition-shared'
import { allergyConflicts } from '@/lib/allergens'
import { mergeDiets } from '@/lib/diets'
import type { Meal } from '@/types'
import { ensurePortions, scaleMeal } from '@/lib/portions'

/** Drop time-claim tags the recipe's own numbers don't support ("15-min" on a 30-minute dinner). */
export function honestTags(tags: string[], totalMinutes: number): string[] {
  return tags.filter((t) => {
    if (t.toLowerCase() === 'quick') return totalMinutes > 0 && totalMinutes <= 30
    const m = t.match(/^(\d+)-?min/i)
    if (!m) return true
    return totalMinutes > 0 && totalMinutes <= Number(m[1])
  })
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

export function slugify(name: string): string {
  return normalizeName(name).replace(/ /g, '-').slice(0, 80)
}

export interface RecipeRow {
  id: string
  normalized_name: string
  name: string
  slug: string
  cuisine: string | null
  protein: string | null
  cook_time: number | null
  prep_time: number | null
  servings: number | null
  estimated_cost: number | null
  ingredients: Meal['ingredients']
  steps: string[]
  tags: string[]
  dietary: string[]
  image_url: string | null
  image_credit: string | null
  nutrition: Meal['nutrition'] | null
  source: 'generated' | 'user'
  created_by: string | null
  is_public: boolean
  times_planned: number
  kept_count: number
  skipped_count: number
}

export function recipeToMeal(r: RecipeRow, day: string, servings?: number): Meal {
  const base = recipeAsStored(r, day)
  // Resize to the family: a recipe stored for 4 is half the groceries (and cost) for 2.
  const stored = Number(r.servings) || 4
  if (!servings || servings === stored) return base
  return ensurePortions(scaleMeal({ ...base, servings }, servings / stored))
}

function recipeAsStored(r: RecipeRow, day: string): Meal {
  return {
    day,
    name: r.name,
    cuisine: r.cuisine ?? undefined,
    protein: r.protein ?? undefined,
    cookTime: r.cook_time ?? 30,
    prepTime: r.prep_time ?? 10,
    servings: r.servings ?? 4,
    estimatedCost: Number(r.estimated_cost ?? 0),
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    tags: r.tags ?? [],
    nutrition: r.nutrition ?? undefined,
    imageUrl: r.image_url ?? undefined,
    recipeId: r.id,
    fromLibrary: true,
  }
}

async function fetchUnsplash(name: string): Promise<{ url: string; credit: string } | null> {
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(`${name} dinner food`)}&per_page=1&orientation=landscape&client_id=${key}`,
      { cache: 'no-store', signal: AbortSignal.timeout(2500) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const r = data.results?.[0]
    if (!r) return null
    return { url: r.urls.regular as string, credit: `${r.user.name} / Unsplash` }
  } catch {
    return null
  }
}

/**
 * Store generated meals in the library (idempotent on normalized name) and
 * return the meals with recipeId + stored imageUrl attached.
 */
export async function upsertRecipes(
  supabase: SupabaseClient,
  meals: Meal[],
  opts: { userId?: string; dietary?: string[]; source?: 'generated' | 'user'; fetchImages?: boolean } = {}
): Promise<Meal[]> {
  if (!meals.length) return meals
  const names = meals.map((m) => normalizeName(m.name))
  const { data: existing } = await supabase
    .from('recipes')
    .select('id, normalized_name, image_url, times_planned')
    .in('normalized_name', names)
  const byName = new Map<string, { id: string; image_url: string | null; times_planned: number }>()
  for (const r of existing ?? []) byName.set(r.normalized_name, r)

  // Everything in parallel: image lookups and inserts are independent per meal.
  const out = await Promise.all(meals.map(async (meal): Promise<Meal> => {
    const norm = normalizeName(meal.name)
    const hit = byName.get(norm)
    if (hit) {
      await supabase.from('recipes').update({ times_planned: hit.times_planned + 1, updated_at: new Date().toISOString() }).eq('id', hit.id)
      return { ...meal, recipeId: hit.id, imageUrl: hit.image_url ?? meal.imageUrl }
    }
    const img = opts.fetchImages === false ? null : await fetchUnsplash(meal.name)
    const { data: inserted } = await supabase
      .from('recipes')
      .insert({
        normalized_name: norm,
        name: meal.name,
        slug: `${slugify(meal.name)}-${Math.random().toString(36).slice(2, 6)}`,
        cuisine: meal.cuisine ?? null,
        protein: meal.protein ?? null,
        cook_time: meal.cookTime,
        prep_time: meal.prepTime,
        servings: meal.servings,
        estimated_cost: meal.estimatedCost,
        ingredients: meal.ingredients,
        steps: meal.steps,
        tags: honestTags(meal.tags ?? [], (meal.cookTime ?? 0) + (meal.prepTime ?? 0)),
        dietary: mergeDiets(opts.dietary ?? [], { name: meal.name, ingredients: meal.ingredients, nutrition: meal.nutrition }),
        image_url: img?.url ?? null,
        image_credit: img?.credit ?? null,
        nutrition: cleanNutrition(meal.nutrition) ?? null,
        source: opts.source ?? 'generated',
        created_by: opts.userId ?? null,
        // Only the nightly grower (no userId) adds to the shared library. Dinners
        // generated inside one family's plan or swap are sized for that household and
        // labeled with that family's diet, so they stay private to the family.
        is_public: (opts.source ?? 'generated') === 'generated' && !opts.userId,
        // A grower recipe has not been planned by anyone yet.
        times_planned: opts.userId ? 1 : 0,
      })
      .select('id')
      .single()
    return { ...meal, recipeId: inserted?.id, imageUrl: img?.url ?? meal.imageUrl }
  }))
  return out
}

/**
 * Dinners from the shared library that fit this family's hard constraints.
 * Every public recipe is eligible; kept / photographed dinners are favored,
 * often-skipped ones are not, and picks are spread across proteins so the week
 * doesn't come back as four chicken dinners. Excludes anything containing an
 * excluded ingredient word, and anything this family has seen recently.
 */
export async function pickLibraryRecipes(
  supabase: SupabaseClient,
  opts: {
    limit: number
    maxCookTime: number
    dietary: string[]
    excludeWords: string[]
    excludeNames: string[]
    cuisines?: string[]
    /** Allergies: matched by allergen (dairy also catches cheese and butter), not just the word. */
    allergies?: string[]
  }
): Promise<RecipeRow[]> {
  if (opts.limit <= 0) return []
  let q = supabase
    .from('recipes')
    .select('id, normalized_name, name, cuisine, protein, ingredients, kept_count, skipped_count, image_url')
    .eq('is_public', true)
    .lte('cook_time', opts.maxCookTime)
    .limit(2000)
  if (opts.dietary.length) q = q.contains('dietary', opts.dietary)
  const { data } = await q
  type Lite = Pick<RecipeRow, 'id' | 'normalized_name' | 'name' | 'cuisine' | 'protein' | 'ingredients' | 'kept_count' | 'skipped_count' | 'image_url'>
  const excludeNorm = new Set(opts.excludeNames.map(normalizeName))
  const words = opts.excludeWords.map((w) => w.toLowerCase().trim()).filter(Boolean)
  const cuisines = (opts.cuisines ?? []).map((c) => c.toLowerCase()).filter((c) => c && c !== 'mixed')
  const allergyList = (opts.allergies ?? []).filter((a) => a && a.trim())
  const pool = ((data ?? []) as Lite[]).filter((r) => {
    if (excludeNorm.has(r.normalized_name)) return false
    if (cuisines.length && r.cuisine && !cuisines.includes(r.cuisine.toLowerCase())) return false
    const hay = `${r.name} ${(r.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase()
    if (words.some((w) => hay.includes(w))) return false
    if (allergyList.length && allergyConflicts(r.ingredients ?? [], [{ name: '', allergies: allergyList }], r.name).length) return false
    return true
  })
  const scored = pool
    .map((r) => ({
      r,
      score: Math.random() + Math.min(r.kept_count ?? 0, 5) * 0.3 - Math.min(r.skipped_count ?? 0, 5) * 0.15 + (r.image_url ? 0.4 : 0),
    }))
    .sort((a, b) => b.score - a.score)
  // One dinner per main protein first; repeat proteins only if the pool runs short.
  const chosen: Lite[] = []
  const usedProteins = new Set<string>()
  for (const { r } of scored) {
    if (chosen.length >= opts.limit) break
    const p = (r.protein ?? '').toLowerCase()
    if (p && usedProteins.has(p)) continue
    chosen.push(r)
    if (p) usedProteins.add(p)
  }
  for (const { r } of scored) {
    if (chosen.length >= opts.limit) break
    if (!chosen.includes(r)) chosen.push(r)
  }
  if (!chosen.length) return []
  const { data: full } = await supabase.from('recipes').select('*').in('id', chosen.map((c) => c.id))
  const byId = new Map(((full ?? []) as RecipeRow[]).map((r) => [r.id, r]))
  return chosen.map((c) => byId.get(c.id)).filter((r): r is RecipeRow => !!r)
}

/** Daily: give library recipes that were stored without a photo one (Unsplash, once). */
export async function backfillImages(supabase: SupabaseClient, limit = 40): Promise<number> {
  const { data } = await supabase.from('recipes').select('id, name').is('image_url', null).order('times_planned', { ascending: false }).limit(limit)
  let n = 0
  for (const r of data ?? []) {
    const img = await fetchUnsplash(r.name)
    if (!img) continue
    await supabase.from('recipes').update({ image_url: img.url, image_credit: img.credit }).eq('id', r.id)
    n++
  }
  return n
}

/**
 * Take `count` dinners from `pool` (in preference order) that fit the weekly budget:
 * while over budget, swap the priciest chosen dinner for the cheapest unused one.
 */
export function fitBudget(pool: Meal[], count: number, budget: number): Meal[] {
  const cost = (m: Meal) => Number(m.estimatedCost) || 0
  const chosen = pool.slice(0, count)
  const spares = pool.slice(count).sort((a, b) => cost(a) - cost(b))
  let total = chosen.reduce((s, m) => s + cost(m), 0)
  while (total > budget && spares.length) {
    const i = chosen.reduce((best, m, idx) => (cost(m) > cost(chosen[best]) ? idx : best), 0)
    if (cost(spares[0]) >= cost(chosen[i])) break
    const swapIn = spares.shift()!
    total += cost(swapIn) - cost(chosen[i])
    chosen[i] = swapIn
  }
  return chosen
}
