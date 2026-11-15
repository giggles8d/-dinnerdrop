/**
 * Bring-your-favorites, library first (Sarah, Nov 15 2026: "library match first"). Each pasted dinner name is
 * matched to a public DinnerDrop recipe, preferring the core dinners; only names with no good match go to the AI
 * rebuild. Matching is word overlap on normalized names, with the dish's key words (protein, pasta, tacos…) required.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { coreRecipeIds, normalizeName, recipeToMeal, type RecipeRow } from '@/lib/recipe-library'
import type { Meal } from '@/types'

const STOP = new Set(['the', 'a', 'an', 'and', 'with', 'in', 'on', 'of', 'my', 'easy', 'quick', 'best', 'simple', 'homemade', 'moms', 'mom', 'family', 'style', 'night', 'dinner', 'recipe', 'one', 'pot', 'pan', 'sheet', 'instant', 'crockpot', 'slow', 'cooker', 'baked', 'healthy', 'favorite', 'classic', 'for', 'or', 'n'])
// Words that decide what the dinner is: a match must share at least one when the pasted name has any.
const KEY = /^(chicken|beef|pork|turkey|sausage|salmon|shrimp|fish|tilapia|cod|tuna|steak|meatballs?|meatloaf|ham|bacon|tofu|beans?|lentils?|eggs?|pasta|spaghetti|lasagna|ziti|mac|noodles?|ramen|rice|tacos?|burritos?|enchiladas?|quesadillas?|fajitas?|nachos|chili|soup|stew|curry|stir|pizza|burgers?|sliders|sandwich(es)?|wraps?|bowls?|casserole|pie|potatoes?|gnocchi|risotto|alfredo|parmesan|teriyaki|bbq|sloppy)$/

// Dish forms: a recipe that adds one the family didn't name (a hoagie, a lettuce cup, a skillet) is a different dinner.
const DISH = new Set(['hoagie', 'sub', 'mein', 'salad', 'soup', 'lettuce', 'cup', 'boat', 'pasta', 'penne', 'rotini', 'bowl', 'casserole', 'bake', 'wrap', 'sandwich', 'burger', 'slider', 'pizza', 'quesadilla', 'burrito', 'lasagna', 'squash', 'cauliflower', 'zucchini', 'skillet', 'stir', 'fry', 'kabob', 'skewer', 'flatbread', 'naan', 'polenta'])

function words(s: string): string[] {
  return normalizeName(s).split(' ').map((w) => w.replace(/s$/, '')).filter((w) => w.length > 1 && !STOP.has(w))
}

function score(want: string[], have: string[]): number {
  if (!want.length || !have.length) return 0
  const h = new Set(have)
  const keys = want.filter((w) => KEY.test(w) || KEY.test(w + 's'))
  if (keys.length && !keys.some((k) => h.has(k))) return 0
  const shared = want.filter((w) => h.has(w)).length
  // Share of the pasted name covered, lightly penalised for extra words, more for an extra dish form.
  const extraDish = have.filter((w) => DISH.has(w) && !want.includes(w)).length
  return shared / want.length - Math.max(0, have.length - shared) * 0.04 - extraDish * 0.15
}

export interface MatchResult { matched: Array<{ asked: string; meal: Meal }>; unmatched: string[] }

export async function matchToLibrary(admin: SupabaseClient, names: string[], servings: number): Promise<MatchResult> {
  const { data } = await admin.from('recipes').select('id, name').eq('is_public', true).limit(5000)
  const rows = (data ?? []) as Array<{ id: string; name: string }>
  const core = await coreRecipeIds(admin)
  const prepared = rows.map((r) => ({ ...r, w: words(r.name), core: core.has(String(r.id)) }))
  const picks: Array<{ asked: string; id: string }> = []
  const unmatched: string[] = []
  const used = new Set<string>()
  for (const asked of names) {
    const want = words(asked)
    let best: { id: string; s: number } | null = null
    for (const r of prepared) {
      if (used.has(r.id)) continue
      const s = score(want, r.w) + (r.core ? 0.08 : 0)
      if (!best || s > best.s) best = { id: r.id, s }
    }
    // Nearly all the pasted words must be in the recipe: 1-2 word names need every word, longer names 3 of 4.
    if (best && best.s >= (want.length === 1 ? 0.8 : want.length === 2 ? 0.88 : 0.75)) { picks.push({ asked, id: best.id }); used.add(best.id) }
    else unmatched.push(asked)
  }
  if (!picks.length) return { matched: [], unmatched }
  const { data: full } = await admin.from('recipes').select('*').in('id', picks.map((p) => p.id))
  const byId = new Map(((full ?? []) as RecipeRow[]).map((r) => [String(r.id), r]))
  const matched = picks.flatMap((p) => { const r = byId.get(p.id); return r ? [{ asked: p.asked, meal: recipeToMeal(r, '1', servings) }] : [] })
  return { matched, unmatched: [...unmatched, ...picks.filter((p) => !byId.has(p.id)).map((p) => p.asked)] }
}
