/**
 * Family recipes (Sarah, Nov 7 2026): "my family wants to see my normal dinners, but I never wrote them down."
 * A family describes a dinner the way they'd say it ("boxed scalloped potatoes with cut-up ham and peas") —
 * typed, spoken, texted, or as a photo of the box / plate / a handwritten card — and AI writes it up as a
 * recipe that keeps THEIR way of making it (boxed stays boxed, their brands, their sides), sized for the
 * family. Saved to favorites with `familyRecipe: true`; the planner rotates them into weeks and votes.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateSmart, generateWithClaude, generateWithClaudeImages, parseClaudeJSON, type ClaudeImage } from '@/lib/claude'
import type { Meal } from '@/types'

const CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages']
export const MAX_RECIPES_PER_TURN = 8

/** One line per dinner: newlines, or numbered/bulleted lists. Commas stay (they're part of a description). */
export function splitDescriptions(text: string): string[] {
  return text.split(/\r?\n+/).map((l) => l.replace(/^[\s\-•*]+|^\s*\d+[.)]\s*/g, '').trim()).filter((l) => l.length >= 3 && l.length <= 400).slice(0, MAX_RECIPES_PER_TURN)
}

function promptFor(descriptions: string[], servings: number, dietary: string[]): string {
  return `You write up a family's OWN everyday dinners for DinnerDrop, a weeknight family dinner planner.
They described each dinner the way they'd tell a friend. Write each one up as a recipe that is THEIR version — not a fancier, from-scratch or "improved" one.

Their dinners (one per line, in their words):
${descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Rules:
- Keep exactly what they said. Boxed, frozen, jarred, store-bought and brand-name items stay that way ("1 box scalloped potatoes mix", "1 bottle Italian dressing", "1 package frozen pierogies"). Don't swap in from-scratch versions or add fancy ingredients.
- Fill in only what a home cook would obviously need to make it as described (butter or oil to fry, water/milk a boxed mix calls for, salt and pepper).
- If they were vague ("some kind of veg", "potatoes somehow"), pick the most ordinary choice (e.g. green beans; roasted or boiled potatoes) and put the alternatives in "swaps".
- Name it the way a family would say it at the dinner table, short and plain ("Kielbasa & Pierogies", "Scalloped Potatoes with Ham & Peas"). Max 50 characters.
- Size it for ${servings} servings with shoppable quantities: whole counts for produce and packages ("2 boxes", "1 lb", "2 lemons"), fractions no finer than 1/4.
- 3-7 short, plain steps written like they cook it (use the box directions where a box is involved: "Make the potatoes as the box says, stirring in the ham and peas before baking").
- Realistic prepTime and cookTime in minutes. estimatedCost: whole recipe in US dollars at typical grocery prices.
- category must be one of: ${CATEGORIES.join(', ')}.
- protein: one plain word (chicken, beef, pork, sausage, ham, turkey, fish, shrimp, beans, eggs, vegetarian).
${dietary.length ? `- The household eats: ${dietary.join(', ')}. Keep their dish as described, but if an ingredient clearly breaks that, add a "note" saying so — don't silently change their recipe.` : ''}
- If a line is not a dinner at all, skip it.

Return ONLY JSON, no markdown:
{"meals":[{"name":"","original":"their words, as given","cuisine":"American","protein":"","prepTime":10,"cookTime":25,"servings":${servings},"estimatedCost":18.5,"ingredients":[{"name":"","quantity":"1","unit":"box","category":"Pantry & Dry Goods","searchTerm":""}],"steps":[""],"swaps":[""],"note":""}]}`
}

type Built = Meal & { original?: string; swaps?: string[]; note?: string }

function clean(raw: Built[], servings: number, by: string | undefined): Meal[] {
  return raw
    .filter((m) => m && typeof m.name === 'string' && Array.isArray(m.ingredients) && m.ingredients.length && Array.isArray(m.steps) && m.steps.length)
    .slice(0, MAX_RECIPES_PER_TURN)
    .map((m) => ({
      day: 'Saved',
      name: String(m.name).trim().slice(0, 60),
      cuisine: m.cuisine || 'American',
      protein: m.protein || undefined,
      prepTime: Math.max(0, Math.round(Number(m.prepTime) || 10)),
      cookTime: Math.max(5, Math.round(Number(m.cookTime) || 25)),
      servings,
      estimatedCost: Math.max(0, Number(m.estimatedCost) || 0),
      ingredients: m.ingredients.slice(0, 20).map((i) => ({
        name: String(i.name ?? '').slice(0, 60),
        quantity: String(i.quantity ?? '1').slice(0, 12),
        unit: String(i.unit ?? '').slice(0, 20),
        category: (CATEGORIES.includes(i.category) ? i.category : 'Pantry & Dry Goods') as Meal['ingredients'][number]['category'],
        searchTerm: String(i.searchTerm || i.name || '').slice(0, 60),
      })).filter((i) => i.name),
      steps: m.steps.slice(0, 10).map((s) => String(s).slice(0, 400)),
      tags: ['family recipe'],
      familyRecipe: true,
      addedBy: by,
      original: m.original ? String(m.original).slice(0, 400) : undefined,
      swaps: Array.isArray(m.swaps) ? m.swaps.map(String).filter(Boolean).slice(0, 4) : undefined,
      familyNote: m.note ? String(m.note).slice(0, 200) : undefined,
    }))
}

/** Write up the family's own dinners from their descriptions (not saved). */
export async function buildFamilyRecipes(descriptions: string[], opts: { servings: number; dietary?: string[]; by?: string }): Promise<Meal[]> {
  const lines = descriptions.map((d) => d.trim()).filter(Boolean).slice(0, MAX_RECIPES_PER_TURN)
  if (!lines.length) return []
  const prompt = promptFor(lines, opts.servings, opts.dietary ?? [])
  let text: string
  try { text = await generateSmart(prompt, 6000) } catch { text = await generateWithClaude(prompt, 6000) }
  const parsed = parseClaudeJSON<{ meals: Built[] }>(text)
  return clean(parsed.meals ?? [], opts.servings, opts.by)
}

/** A photo of the box, the plate, or a handwritten recipe card → a one-line description of the dinner. */
export async function describeDinnerFromPhotos(images: ClaudeImage[], caption = ''): Promise<string[]> {
  if (!images.length) return []
  const text = await generateWithClaudeImages(`These photos show a family's dinner — the box or package they use, the finished plate, or a handwritten / printed recipe.
${caption ? `They said: "${caption}"\n` : ''}If it's a list of dinners (handwritten, typed or a screenshot), return EVERY dinner on it. Describe each distinct dinner in ONE plain line the way the family would say it, keeping boxed / brand-name items as they are (e.g. "Betty Crocker boxed scalloped potatoes with cut-up ham and frozen peas"). If it's a written recipe, put the main ingredients and method in that one line (up to 300 characters).
Return ONLY JSON: {"dinners":["..."]} — an empty list if there's no food or recipe in the photos.`, images.slice(0, 4), 1500)
  const parsed = parseClaudeJSON<{ dinners: string[] }>(text)
  return (parsed.dinners ?? []).map((d) => String(d).trim()).filter((d) => d.length >= 3).slice(0, MAX_RECIPES_PER_TURN)
}

/** Save to favorites (skips names already saved). Returns the names saved. */
export async function saveFamilyRecipes(db: SupabaseClient, userId: string, meals: Meal[]): Promise<{ saved: string[]; skipped: string[] }> {
  const { data: existing } = await db.from('favorites').select('meal_name').eq('user_id', userId)
  const have = new Set((existing ?? []).map((f) => String(f.meal_name).toLowerCase()))
  const fresh = meals.filter((m) => !have.has(m.name.toLowerCase()))
  if (fresh.length) {
    const { error } = await db.from('favorites').insert(fresh.map((m) => ({ user_id: userId, meal_name: m.name, meal_data: m })))
    if (error) throw new Error(error.message)
  }
  return { saved: fresh.map((m) => m.name), skipped: meals.filter((m) => have.has(m.name.toLowerCase())).map((m) => m.name) }
}

/** A recipe sent back from the preview, checked before saving (the client could have changed anything). */
export function sanitizeMeal(x: unknown, servings: number): Meal | null {
  if (!x || typeof x !== 'object') return null
  const m = x as Built & { addedBy?: string }
  const out = clean([m], Number(m.servings) > 0 ? Math.min(Number(m.servings), 20) : servings, typeof m.addedBy === 'string' ? m.addedBy.slice(0, 40) : undefined)
  return out[0] ?? null
}

/**
 * Family recipes due this week, for the planner: least recently planned first, skipping any in the last
 * `minWeeks` weeks of plans. `perWeek` 0 turns it off.
 */
export function classicsDue(favorites: Meal[], recentPlans: Meal[][], perWeek: number, minWeeks = 2): Meal[] {
  if (perWeek <= 0) return []
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const lastSeen = (name: string) => { const i = recentPlans.findIndex((p) => p.some((m) => norm(m.name) === norm(name))); return i < 0 ? Infinity : i }
  return favorites
    .filter((m) => m && (m as Meal & { familyRecipe?: boolean }).familyRecipe && lastSeen(m.name) >= minWeeks)
    .map((m) => ({ m, seen: lastSeen(m.name), r: Math.random() }))
    .sort((a, b) => (b.seen - a.seen) || (a.r - b.r))
    .slice(0, perWeek)
    .map(({ m }) => m)
}
