/**
 * "What can I make tonight?" (Sarah, Oct 31 2026 — an ad promised "snap your fridge, get dinner tonight"
 * and the app didn't have it). A photo or a typed list of what's in the fridge → dinners from the
 * recipe library the family can make with mostly what's there, each with what's missing.
 *
 * Server-only. The photo is read once by the vision model; matching against the library is plain code
 * (no AI), and AI writes dinners only when the library has nothing close.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWithClaude, generateWithClaudeImage, parseClaudeJSON, type ClaudeImage } from '@/lib/claude'
import { allergyConflicts } from '@/lib/allergens'
import { recipeToMeal, type RecipeRow } from '@/lib/recipe-library'
import { proteinGroup } from '@/lib/protein-mix'
import type { Meal } from '@/types'

/** What most kitchens have, so a recipe isn't marked "missing" for salt or olive oil. */
const STAPLE = /\b(salt|pepper(corns)?|black pepper|kosher salt|sea salt|(olive|vegetable|canola|avocado|sesame|cooking) oil|oil|cooking spray|water|ice|sugar|brown sugar|flour|all-purpose flour|baking (soda|powder)|garlic powder|onion powder|paprika|smoked paprika|chili powder|cumin|oregano|thyme|basil|dried \w+|italian seasoning|cinnamon|red pepper flakes|crushed red pepper|cayenne|bay leaf|bay leaves|vinegar|\w+ vinegar|soy sauce|ketchup|mustard|mayonnaise|mayo|hot sauce|honey|cornstarch|vanilla|seasoning|spice blend|taco seasoning|broth|stock|bouillon)\b/i

function singular(w: string): string {
  if (w.length <= 3) return w
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y'
  if (/(oes|ches|shes|sses)$/.test(w)) return w.slice(0, -2)
  if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1)
  return w
}

const FILLER = new Set(['fresh', 'large', 'small', 'medium', 'boneless', 'skinless', 'shredded', 'grated', 'chopped', 'diced', 'sliced', 'minced', 'frozen', 'canned', 'can', 'cans', 'of', 'and', 'or', 'the', 'a', 'ground', 'whole', 'lean', 'extra', 'virgin', 'low', 'sodium', 'reduced', 'fat', 'free', 'organic', 'baby', 'raw', 'cooked', 'leftover', 'plain', 'unsalted', 'salted', 'bag', 'box', 'jar', 'package', 'pack', 'block', 'bunch', 'head', 'lb', 'oz', 'cup', 'cups'])

/** The words that identify an item ("2 lbs boneless chicken thighs" → chicken, thigh). */
export function keyWords(name: string): string[] {
  return name.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/)
    .filter((w) => w.length > 2 && !FILLER.has(w)).map(singular)
}

/** Is this recipe ingredient covered by something in the fridge? */
export function covered(ingredient: string, fridge: string[][]): boolean {
  const ing = keyWords(ingredient)
  if (!ing.length) return true
  const head = ing[ing.length - 1]
  return fridge.some((f) => {
    if (!f.length) return false
    const fHead = f[f.length - 1]
    // "chicken thighs" ↔ "boneless chicken thighs"; "cheddar" ↔ "shredded cheddar cheese"; "beef" ↔ "ground beef"
    // Same last word: a match unless both sides are qualified differently ("cream cheese" ≠ "cheddar cheese").
    if (fHead === head) return f.length === 1 || ing.length === 1 || f.some((w) => w !== fHead && ing.includes(w))
    // "beef" in the fridge covers "ground beef"; "cheddar" covers "cheddar cheese".
    // …and "chicken thighs" covers a recipe that just says "chicken".
    return ing.includes(fHead) || (f.length === 1 && ing.includes(f[0])) || (ing.length === 1 && f.includes(head))
  })
}

export interface TonightMeal extends Meal {
  have: string[]
  missing: string[]
  coverage: number
  source: 'library' | 'ai'
}

/** Read a fridge / pantry photo into item names. */
export async function readFridgePhoto(image: ClaudeImage): Promise<string[]> {
  const text = await generateWithClaudeImage(
    `Look at this photo of a fridge, freezer, pantry or counter. List every food item you can identify that could go into a dinner, as short grocery names ("chicken thighs", "broccoli", "cheddar cheese", "eggs", "tortillas"). Skip drinks, condiments you can't read, and anything you're unsure of.
Return ONLY JSON: {"items":["..."]}`,
    image,
    800,
  )
  const j = parseClaudeJSON<{ items?: unknown }>(text)
  return Array.isArray(j.items) ? j.items.filter((x): x is string => typeof x === 'string' && x.trim().length > 1).map((x) => x.trim()).slice(0, 60) : []
}

/** Split a typed list ("chicken, broccoli and rice\ncheddar") into items. */
export function parseTypedFridge(text: string): string[] {
  return text.split(/[,\n;]|\band\b/i).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 60)
}

interface Household {
  familySize: number
  dietary: string[]
  never: string[]
  allergies: string[]
  maxCookTime: number
}

/**
 * Library dinners ranked by how much of them is already in the fridge. A dinner only counts when its
 * main protein is on hand (or it's meatless) — nobody can make chicken fajitas without the chicken.
 */
export async function matchLibrary(admin: SupabaseClient, items: string[], h: Household, limit = 5): Promise<TonightMeal[]> {
  const fridge = items.map(keyWords).filter((w) => w.length)
  if (!fridge.length) return []
  let q = admin.from('recipes').select('*').eq('is_public', true).lte('cook_time', Math.max(h.maxCookTime, 30) + 15).limit(2000)
  if (h.dietary.length) q = q.contains('dietary', h.dietary)
  const { data } = await q
  const never = h.never.map((w) => w.toLowerCase().trim()).filter(Boolean)
  const scored: Array<{ r: RecipeRow; have: string[]; missing: string[]; coverage: number; proteinOk: boolean }> = []
  for (const r of (data ?? []) as RecipeRow[]) {
    const ings = (r.ingredients ?? []).map((i) => i.name).filter(Boolean)
    if (!ings.length) continue
    const hay = `${r.name} ${ings.join(' ')}`.toLowerCase()
    if (never.some((w) => hay.includes(w))) continue
    if (h.allergies.length && allergyConflicts(r.ingredients ?? [], [{ name: '', allergies: h.allergies }], r.name).length) continue
    const counted = ings.filter((n) => !STAPLE.test(n) || keyWords(n).length > 2)
    if (counted.length < 2) continue
    const have = counted.filter((n) => covered(n, fridge))
    const missing = counted.filter((n) => !have.includes(n))
    const group = proteinGroup(r.protein, r.name)
    const proteinOk = group === 'meatless' ? true : !!r.protein && covered(r.protein, fridge)
    scored.push({ r, have, missing, coverage: have.length / counted.length, proteinOk })
  }
  return scored
    .filter((s) => s.proteinOk && s.have.length >= 2 && s.missing.length <= 3)
    .sort((a, b) => a.missing.length - b.missing.length || b.coverage - a.coverage || (b.r.kept_count ?? 0) - (a.r.kept_count ?? 0))
    .slice(0, limit)
    .map((s, i) => ({ ...recipeToMeal(s.r, `tonight-${i + 1}`, h.familySize), have: s.have, missing: s.missing, coverage: s.coverage, source: 'library' as const }))
}

/** When the library has nothing close: AI writes a couple of dinners from what's there. */
export async function writeFromFridge(items: string[], h: Household, count = 2): Promise<TonightMeal[]> {
  const prompt = `A family wants dinner TONIGHT using what they already have. Write ${count} simple weeknight dinners for ${h.familySize} people built mostly from these items: ${items.join(', ')}.
Rules:
- Use only those items plus kitchen staples (salt, pepper, oil, butter, flour, sugar, dried spices, vinegar, soy sauce, broth). At most 2 other ingredients per dinner, and list them in "missing".
- On the table in ${Math.max(h.maxCookTime, 20)} minutes or less. Maximum 7 ingredients, maximum 5 short steps.
${h.dietary.length ? `- STRICT: every dinner is ${h.dietary.join(', ')}.\n` : ''}${h.allergies.length || h.never.length ? `- NEVER use: ${[...h.allergies, ...h.never].join(', ')}.\n` : ''}- Ingredient quantities are what you'd use for ${h.familySize} servings.
Return ONLY JSON:
{"meals":[{"name":"string","cuisine":"American","protein":"chicken thighs","cookTime":25,"prepTime":10,"servings":${h.familySize},"estimatedCost":0,"tags":["quick"],"ingredients":[{"name":"chicken thighs","quantity":"1 1/2","unit":"lb","category":"Meat & Seafood","searchTerm":"chicken thighs"}],"steps":["..."],"missing":["..."],"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0}}]}`
  const j = parseClaudeJSON<{ meals?: Array<Meal & { missing?: string[] }> }>(await generateWithClaude(prompt, 3000))
  return (j.meals ?? []).slice(0, count).map((m, i) => {
    const missing = Array.isArray(m.missing) ? m.missing.filter((x) => typeof x === 'string') : []
    const ings = (m.ingredients ?? []).map((x) => x.name)
    return { ...m, day: `tonight-ai-${i + 1}`, missing, have: ings.filter((n) => !missing.includes(n)), coverage: 1, source: 'ai' as const, tags: m.tags ?? [] }
  })
}
