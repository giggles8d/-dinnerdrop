/**
 * Build a week's grocery list from the dinners' stored ingredients, with no AI (Sarah, Nov 25 2026).
 *
 * Why: the list used to come from a Claude call in /api/generate-list that took ~12 s, and since the first week now
 * lands straight on the grocery list, that was the first screen every new family waited on (15 s tap-to-list on a
 * phone). Library recipes already store name, quantity, unit, store category and search term for every ingredient,
 * so the list can be built in code in milliseconds, on the server when a plan is saved or in the route on demand.
 *
 * What it does, same rules the AI prompt asked for:
 *   - the same shortcuts, pre-cut swaps and plate sides as the route (lib/shortcuts, lib/prepped, lib/side-steps);
 *   - one line per item (lib/overlap ingredientKey), adding amounts that can be added: tsp/tbsp/cup together,
 *     oz/lb together, otherwise the same unit;
 *   - amounts a shopper can buy (lib/portions formatQuantity: quarters of a lb or cup, whole ounces and counts);
 *   - singular units ("lb", "cup", "clove"), store sections in shopping order, a clean search term.
 * `needsAi` says when a week's ingredients are too unstructured for this (rare: free-text imports); the route then
 * falls back to the AI list. Used only when app_kv list_builder = 'code' (listBuilderMode, below).
 */
import type { GroceryCategory, GroceryItem, Ingredient, Meal } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatQuantity, parseQuantity } from '@/lib/portions'
import { preppedIngredients } from '@/lib/prepped'
import { withShortcut } from '@/lib/shortcuts'
import { scaleSideItems } from '@/lib/side-steps'
import { CATEGORY_ORDER, guessCategory } from '@/lib/list'
import { ingredientKey } from '@/lib/overlap'

// Extra words that don't make a different thing to buy: "broccoli florets" = "broccoli", "parmesan cheese" =
// "parmesan", "yellow onion" = "onion", "kosher salt" = "salt". Anything else keeps its own line ("red onion",
// "green onion", "sweet potato", "garlic powder"). Lines also only merge within one unit family (see `family`).
const SAFE_EXTRA = new Set(['floret', 'cheese', 'yellow', 'white', 'kosher', 'all', 'purpose', 'extra', 'virgin', 'block', 'crown', 'head', 'stalk', 'rib', 'plain', 'regular'])

/** Same thing to buy: same key, or one key plus only harmless descriptor words. */
function sameItem(a: string, b: string): boolean {
  const ka = ingredientKey(a), kb = ingredientKey(b)
  if (!ka || !kb) return false
  if (ka === kb) return true
  const [s, l] = ka.length <= kb.length ? [ka, kb] : [kb, ka]
  if (s.length < 4 || !new RegExp(`(^| )${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(l)) return false
  const sw = new Set(s.split(' '))
  return l.split(' ').filter((w) => !sw.has(w)).every((w) => SAFE_EXTRA.has(w.replace(/s$/, '')))
}

type MealLike = { servings?: number; ingredients?: Ingredient[]; steps?: string[]; tags?: string[]; name?: string; side?: { for?: string[]; onList?: boolean; items?: Ingredient[] } }

/** Every ingredient the week's shop needs, exactly as /api/generate-list collected them. */
export function weekIngredients(meals: MealLike[], prepped: boolean): Ingredient[] {
  return (meals ?? []).flatMap((meal) => [
    ...(Array.isArray(meal.ingredients) ? ((m) => (prepped ? preppedIngredients(m).ingredients : m.ingredients))(withShortcut(meal as Meal, prepped)) : []),
    ...((meal.side?.for?.length || meal.side?.onList) && Array.isArray(meal.side?.items) ? scaleSideItems(meal.side as Parameters<typeof scaleSideItems>[0], meal.servings) : []),
  ])
}

const UNIT_ALIAS: Record<string, string> = {
  lbs: 'lb', pound: 'lb', pounds: 'lb', ounce: 'oz', ounces: 'oz',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp',
  cups: 'cup', cloves: 'clove', cans: 'can', jars: 'jar', packages: 'package', bunches: 'bunch', heads: 'head',
  slices: 'slice', sprigs: 'sprig', stalks: 'stalk', sticks: 'stick', bags: 'bag', boxes: 'box', bottles: 'bottle',
  each: 'count', whole: 'count', counts: 'count', pieces: 'piece', large: 'count', medium: 'count', small: 'count',
}
const TSP: Record<string, number> = { tsp: 1, tbsp: 3, cup: 48 }

/*
 * Units that are really the item itself (11-week check, Nov 25 2026): recipes store "3 peppers" bell peppers,
 * "2 onion" onion, "3 avocados" avocado, "2 fillets (6 oz each)" salmon. Kept as their own unit they made a second
 * line next to the counted one ("5 count avocados" + "3 avocados avocado") and went to Instacart as 1 package.
 * Now a unit that names the item (or a whole-item noun like fillet) counts, and "(6 oz each)" becomes a weight.
 * Real store units (can, head, bunch, clove…) are never touched.
 */
const STORE_UNITS = new Set(['can', 'jar', 'package', 'bag', 'box', 'bottle', 'bunch', 'head', 'slice', 'sprig', 'stalk', 'stick',
  'clove', 'piece', 'pint', 'quart', 'gallon', 'container', 'carton', 'loaf', 'block', 'dozen', 'pinch', 'dash', 'leaf', 'ear', 'strip', 'link', 'sheet'])
const ITEM_NOUNS = new Set(['fillet', 'filet', 'breast', 'thigh', 'drumstick', 'chop', 'steak', 'pepper', 'onion', 'avocado', 'lime', 'lemon',
  'potato', 'tomato', 'egg', 'apple', 'banana', 'orange', 'zucchini', 'cucumber', 'carrot', 'shallot', 'jalapeno', 'tortilla', 'bun', 'roll'])
const singular = (w: string) => w.toLowerCase().replace(/(o|ch|sh|x)es$/, '$1').replace(/ies$/, 'y').replace(/s$/, '')
function isItemUnit(unit: string, name: string): boolean {
  const u = singular(unit)
  if (!u || u === 'count' || STORE_UNITS.has(u) || u in TSP || u in OZ) return false
  return ITEM_NOUNS.has(u) || name.toLowerCase().split(/[^a-z]+/).some((w) => w && singular(w) === u)
}
const EACH = /^([a-z]+)\s*\(\s*([\d./ ]+)\s*(oz|ounces?|lbs?|pounds?)\s+each\s*\)$/i
const OZ: Record<string, number> = { oz: 1, lb: 16 }

function unitOf(u: string | null | undefined): string {
  const t = (u ?? '').trim().toLowerCase().replace(/\.$/, '')
  return UNIT_ALIAS[t] ?? t
}
const family = (u: string) => (u in TSP ? 'vol' : u in OZ ? 'wt' : `u:${u}`)
const isCategory = (c: unknown): c is GroceryCategory => typeof c === 'string' && (CATEGORY_ORDER as string[]).includes(c)

/** Pick the unit a shopper reads best for a total in the family's base unit (tsp or oz). */
function bestUnit(fam: string, base: number, fallback: string): { n: number; unit: string } {
  // Cups from 1/2 cup up; below that tablespoons, so 4 1/2 tbsp doesn't round up to 1/2 cup.
  if (fam === 'vol') return base >= 24 ? { n: base / 48, unit: 'cup' } : base >= 3 ? { n: base / 3, unit: 'tbsp' } : { n: base, unit: 'tsp' }
  if (fam === 'wt') return base >= 16 ? { n: base / 16, unit: 'lb' } : { n: base, unit: 'oz' }
  return { n: base, unit: fallback }
}

/** Too little structure to build without AI: over 30% of lines have no usable amount and no store section. */
export function needsAi(ingredients: Ingredient[]): boolean {
  if (!ingredients.length) return false
  const loose = ingredients.filter((i) => parseQuantity(i.quantity) == null && !isCategory(i.category)).length
  return loose / ingredients.length > 0.3
}

/**
 * The list to save with a new plan: the built list, or {} (the list page then builds it through /api/generate-list,
 * with AI) when the week's ingredients are too unstructured, or when building throws for any reason.
 */
export function prebuiltList(meals: MealLike[], prepped: boolean): Record<string, GroceryItem[]> {
  try {
    const ings = weekIngredients(meals, prepped)
    if (!ings.length || needsAi(ings)) return {}
    return buildGroceryList(meals, { prepped })
  } catch {
    return {}
  }
}

/** The week's grocery list, by store section, built from stored ingredients. */
export function buildGroceryList(meals: MealLike[], opts: { prepped?: boolean } = {}): Record<GroceryCategory, GroceryItem[]> {
  type Line = { name: string; fam: string; unit: string; base: number | null; raw: string; category: GroceryCategory; searchTerm: string }
  const lines: Line[] = []
  for (const ing of weekIngredients(meals, !!opts.prepped)) {
    let name = String(ing?.name ?? '').trim()
    if (!name) continue
    let n = parseQuantity(ing.quantity)
    let rawUnit = String(ing.unit ?? '').trim()
    // "2 fillets (6 oz each)" → 12 oz, so it adds up with the same fish or steak given by weight.
    const each = EACH.exec(rawUnit)
    const per = each ? parseQuantity(each[2]) : null
    if (each && n != null && per != null) { n = n * per; rawUnit = each[3] }
    let unit = unitOf(rawUnit)
    // "3 peppers" bell peppers, "2 lime" lime: the unit is the item, so it's a count.
    if (isItemUnit(unit, name)) unit = 'count'
    // "garlic cloves" (counted, or "2 clove garlic cloves"): the same as garlic by the clove (it made a second
    // garlic line in 5 of 11 weeks).
    if (/\bcloves?$/i.test(name) && (unit === 'count' || unit === '' || unit === 'clove') && name.replace(/\s*\bcloves?$/i, '').trim()) {
      name = name.replace(/\s*\bcloves?$/i, '').trim()
      unit = 'clove'
    }
    const fam = family(unit)
    const base = n == null ? null : fam === 'vol' ? n * TSP[unit] : fam === 'wt' ? n * OZ[unit] : n
    const same = lines.find((l) => l.fam === fam && sameItem(l.name, name))
    if (same) {
      if (same.base != null && base != null) same.base += base
      else if (same.base == null && base != null) same.base = base
      continue
    }
    lines.push({
      name, fam, unit, base, raw: String(ing.quantity ?? '').trim(),
      category: isCategory(ing.category) ? ing.category : guessCategory(name),
      searchTerm: String(ing.searchTerm ?? '').trim() || name,
    })
  }
  const out = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, [] as GroceryItem[]])) as Record<GroceryCategory, GroceryItem[]>
  for (const l of lines) {
    let quantity: string, unit: string
    if (l.base == null) { quantity = l.raw || '1'; unit = l.unit }
    else {
      const best = bestUnit(l.fam, l.base, l.unit)
      unit = best.unit
      quantity = formatQuantity(best.n, best.unit)
    }
    out[l.category].push({ name: l.name, quantity, unit, category: l.category, searchTerm: l.searchTerm })
  }
  return out
}

/**
 * Kill switch (Sarah, Nov 25 2026): app_kv key 'list_builder' = 'code' | 'ai'. Missing or anything else = 'ai',
 * which is exactly the old behavior (plans save with an empty list; /api/generate-list asks the AI). Flip it with:
 *   insert into app_kv (key, value, updated_at) values ('list_builder', '"code"', now())
 *     on conflict (key) do update set value = excluded.value, updated_at = now();
 * Back to AI: the same with '"ai"'. New weeks follow within 30 s, no redeploy. A list already built in code stays on
 * its plan: to rebuild one family's list with AI, clear it (update meal_plans set grocery_list = '{}' where
 * id = '<plan id>') and their list page builds it again on the next visit. Server only (reads app_kv).
 */
export type ListBuilder = 'code' | 'ai'
let builderCache: { at: number; mode: ListBuilder } | null = null
export async function listBuilderMode(admin: SupabaseClient): Promise<ListBuilder> {
  if (builderCache && Date.now() - builderCache.at < 30_000) return builderCache.mode
  let mode: ListBuilder = 'ai'
  try {
    const { data } = await admin.from('app_kv').select('value').eq('key', 'list_builder').maybeSingle()
    const v = data?.value as unknown
    if (v === 'code' || (!!v && typeof v === 'object' && (v as { mode?: unknown }).mode === 'code')) mode = 'code'
  } catch { /* the default stays 'ai' */ }
  builderCache = { at: Date.now(), mode }
  return mode
}
