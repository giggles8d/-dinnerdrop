/**
 * Recipe library — server-only helpers around public.recipes.
 *
 * Every dinner the planner generates is stored once (name-normalized), with
 * its Unsplash photo fetched a single time and kept on the row. Later plans
 * can pull proven dinners straight from the library instead of regenerating
 * them, and families can browse / upload their own.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

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
  return {
    day,
    name: r.name,
    cuisine: r.cuisine ?? undefined,
    protein: r.protein ?? undefined,
    cookTime: r.cook_time ?? 30,
    prepTime: r.prep_time ?? 10,
    servings: servings ?? r.servings ?? 4,
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
      { cache: 'no-store' }
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

  const out: Meal[] = []
  for (const meal of meals) {
    const norm = normalizeName(meal.name)
    const hit = byName.get(norm)
    if (hit) {
      await supabase.from('recipes').update({ times_planned: hit.times_planned + 1, updated_at: new Date().toISOString() }).eq('id', hit.id)
      out.push({ ...meal, recipeId: hit.id, imageUrl: hit.image_url ?? meal.imageUrl })
      continue
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
        tags: meal.tags ?? [],
        dietary: opts.dietary ?? [],
        image_url: img?.url ?? null,
        image_credit: img?.credit ?? null,
        nutrition: meal.nutrition ?? null,
        source: opts.source ?? 'generated',
        created_by: opts.userId ?? null,
        is_public: (opts.source ?? 'generated') === 'generated',
        times_planned: 1,
      })
      .select('id')
      .single()
    out.push({ ...meal, recipeId: inserted?.id, imageUrl: img?.url ?? meal.imageUrl })
  }
  return out
}

/**
 * Proven dinners from the library that fit this family's hard constraints.
 * Ordered by how often families kept them. Excludes anything containing an
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
  }
): Promise<RecipeRow[]> {
  if (opts.limit <= 0) return []
  let q = supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .lte('cook_time', opts.maxCookTime)
    .gte('kept_count', 1)
    .order('kept_count', { ascending: false })
    .order('times_planned', { ascending: false })
    .limit(opts.limit * 6)
  if (opts.dietary.length) q = q.contains('dietary', opts.dietary)
  const { data } = await q
  const excludeNorm = new Set(opts.excludeNames.map(normalizeName))
  const words = opts.excludeWords.map((w) => w.toLowerCase().trim()).filter(Boolean)
  const cuisines = (opts.cuisines ?? []).map((c) => c.toLowerCase())
  const rows = ((data ?? []) as RecipeRow[]).filter((r) => {
    if (excludeNorm.has(r.normalized_name)) return false
    if (cuisines.length && r.cuisine && !cuisines.includes(r.cuisine.toLowerCase())) return false
    const hay = `${r.name} ${(r.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase()
    return !words.some((w) => hay.includes(w))
  })
  return rows.slice(0, opts.limit)
}
