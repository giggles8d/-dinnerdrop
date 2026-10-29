/**
 * Shared fresh ingredients across a week (Mealime's "smart recipes" idea, Sarah Oct 29 2026).
 * A bunch of cilantro, a bag of spinach or a tub of sour cream bought for one dinner usually
 * gets thrown out half-used. Picking dinners that share those fresh items uses whole packages
 * and lowers the cart. Pure and client-safe: used by the planner (server), the picking screen
 * and the grocery list ("which dinners use this?").
 */
import type { Ingredient, Meal } from '@/types'

const STRIP = /\b(fresh|freshly|chopped|minced|diced|sliced|shredded|grated|large|small|medium|ripe|boneless|skinless|optional|for serving|for garnish|to taste|whole|baby|organic|leaves|leaf|bunch|of)\b/g

/** Comparable key for an ingredient or list line: "Fresh cilantro, chopped" → "cilantro". */
export function ingredientKey(name: string): string {
  return name.toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(',')[0]
    .replace(/[^a-z ]+/g, ' ')
    .replace(STRIP, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(oes|ies|s)$/, (m) => (m === 'ies' ? 'y' : m === 'oes' ? 'o' : ''))
}

/** Two keys name the same thing ("green onion" / "green onions", "cilantro" / "cilantro sprigs"). */
export function sameIngredient(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  return s.length >= 4 && new RegExp(`(^| )${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(l)
}

// Fresh things that come in a package bigger than one dinner uses and spoil within the week.
const FRESH_RE = /\b(cilantro|parsley|basil|mint|dill|thyme|rosemary|chive|green onion|scallion|spinach|kale|arugula|lettuce|romaine|spring mix|cabbage|slaw|celery|bell pepper|jalape|zucchini|mushroom|broccoli|cauliflower|cucumber|tomato|avocado|lime|lemon|ginger|bok choy|snap pea|green bean|asparagus|sour cream|heavy cream|cream cheese|ricotta|yogurt|buttermilk|feta|cotija|mozzarella|parmesan|cheddar|tortilla|naan|pita|bun|coconut milk|tomato paste|salsa)\b/
// Never worth matching on: always in the pantry, or bought exactly per dinner.
const SKIP_RE = /\b(salt|pepper flake|black pepper|oil|water|sugar|flour|garlic powder|onion powder|paprika|cumin|chili powder|oregano|stock|broth)\b/

export function isFresh(ing: Pick<Ingredient, 'name' | 'category'> | string): boolean {
  const name = typeof ing === 'string' ? ing : ing.name
  const k = ingredientKey(name)
  if (!k || SKIP_RE.test(k)) return false
  if (FRESH_RE.test(k)) return true
  return typeof ing !== 'string' && ing.category === 'Produce' && !/\b(onion|potato|garlic|carrot|apple|banana)\b/.test(k)
}

export interface SharedItem { key: string; label: string; meals: string[] }

/** Fresh ingredients used by 2+ of these dinners, most-shared first. */
export function sharedFresh(meals: Meal[]): SharedItem[] {
  const groups: SharedItem[] = []
  for (const m of meals) {
    const seen = new Set<string>()
    for (const ing of m.ingredients ?? []) {
      if (!isFresh(ing)) continue
      const key = ingredientKey(ing.name)
      let g = groups.find((x) => sameIngredient(x.key, key))
      if (!g) { g = { key, label: key, meals: [] }; groups.push(g) }
      if (!seen.has(g.key) && !g.meals.includes(m.name)) { g.meals.push(m.name); seen.add(g.key) }
    }
  }
  return groups.filter((g) => g.meals.length >= 2).sort((a, b) => b.meals.length - a.meals.length || a.label.localeCompare(b.label))
}

function freshKeys(m: Meal): string[] {
  return Array.from(new Set((m.ingredients ?? []).filter(isFresh).map((i) => ingredientKey(i.name))))
}

/** How many of `meal`'s fresh items something in `chosen` already buys. */
export function overlapWith(meal: Meal, chosen: Meal[]): string[] {
  const have = chosen.flatMap(freshKeys)
  return freshKeys(meal).filter((k) => have.some((h) => sameIngredient(h, k)))
}

/**
 * Choose `n` dinners from `pool` that share the most fresh ingredients, keeping proteins varied.
 * `seed` = dinners already chosen (kept picks); they count for overlap but aren't returned.
 * Greedy: start from the pool's order (the planner's ranking), then each step takes the dinner
 * that adds the most shared fresh items, with a penalty for repeating a protein.
 */
export function pickWithOverlap(pool: Meal[], n: number, seed: Meal[] = []): Meal[] {
  const picked: Meal[] = []
  const seedNames = new Set(seed.map((s) => s.name.toLowerCase()))
  const left = pool.filter((m) => !seedNames.has(m.name.toLowerCase()))
  while (picked.length < n && left.length) {
    const chosen = [...seed, ...picked]
    let best = 0, bestScore = -Infinity
    left.forEach((m, i) => {
      const shared = chosen.length ? overlapWith(m, chosen).length : freshKeys(m).filter((k) => left.some((o) => o !== m && freshKeys(o).some((x) => sameIngredient(x, k)))).length
      const sameProtein = chosen.filter((c) => c.protein && m.protein && c.protein.toLowerCase() === m.protein.toLowerCase()).length
      const score = shared * 2 - sameProtein * 3 - i * 0.05
      if (score > bestScore) { bestScore = score; best = i }
    })
    picked.push(left.splice(best, 1)[0])
  }
  return picked
}

/** One line for the picking screen / plan: "Shares cilantro, spinach and limes — less goes to waste". */
export function sharedSummary(meals: Meal[]): string | null {
  const s = sharedFresh(meals)
  if (!s.length) return null
  const names = s.slice(0, 3).map((x) => x.label)
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `${s.length} fresh ingredient${s.length === 1 ? '' : 's'} shared across dinners (${list}${s.length > 3 ? ', …' : ''}) — whole packages get used, less goes to waste`
}

/** Grocery list: which of this week's dinners use a list line. */
export function mealsUsing(lineName: string, meals: Meal[]): string[] {
  const k = ingredientKey(lineName)
  if (!k) return []
  return meals.filter((m) => (m.ingredients ?? []).some((i) => sameIngredient(ingredientKey(i.name), k) || sameIngredient(ingredientKey(i.searchTerm ?? ''), k))).map((m) => m.name)
}
