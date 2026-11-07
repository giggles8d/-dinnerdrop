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
- A number from 1 to 5 at the start of a line ("5 - Chicken Marsala", "4.5 - Sliders") is the family's own rating of that dinner: put it in "rating" (round 4.5 to 5) and leave it out of the name and original. No number → rating 0.
- If a line is not a dinner at all, skip it.

Return ONLY JSON, no markdown:
{"meals":[{"name":"","original":"their words, as given","cuisine":"American","protein":"","prepTime":10,"cookTime":25,"servings":${servings},"estimatedCost":18.5,"ingredients":[{"name":"","quantity":"1","unit":"box","category":"Pantry & Dry Goods","searchTerm":""}],"steps":[""],"swaps":[""],"note":"","rating":0}]}`
}

/** The family's 1–5 rating, or undefined. */
export function ratingOf(x: unknown): number | undefined {
  const n = Math.round(Number(x))
  return n >= 1 && n <= 5 ? n : undefined
}

type Built = Meal & { original?: string; swaps?: string[]; note?: string; familyNote?: string; shareOk?: boolean; rating?: number }

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
      ingredients: m.ingredients.slice(0, 30).map((i) => ({
        name: String(i.name ?? '').slice(0, 60),
        quantity: String(i.quantity ?? '1').slice(0, 12),
        unit: String(i.unit ?? '').slice(0, 20),
        category: (CATEGORIES.includes(i.category) ? i.category : 'Pantry & Dry Goods') as Meal['ingredients'][number]['category'],
        searchTerm: String(i.searchTerm || i.name || '').slice(0, 60),
      })).filter((i) => i.name),
      steps: m.steps.slice(0, 15).map((s) => String(s).slice(0, 600)).filter((s) => s.trim()),
      tags: ['family recipe'],
      familyRecipe: true,
      addedBy: by,
      original: m.original ? String(m.original).slice(0, 400) : undefined,
      swaps: Array.isArray(m.swaps) ? m.swaps.map(String).filter(Boolean).slice(0, 4) : undefined,
      familyNote: (m.note || m.familyNote) ? String(m.note || m.familyNote).slice(0, 200) : undefined,
      shareOk: m.shareOk === true ? true : undefined,
      familyRating: ratingOf(m.familyRating ?? m.rating),
      imageUrl: typeof m.imageUrl === 'string' && /^https:\/\//.test(m.imageUrl) ? m.imageUrl : undefined,
    }))
}

/** Write up the family's own dinners from their descriptions (not saved). A leading 1–5 is their rating. */
export async function buildFamilyRecipes(descriptions: string[], opts: { servings: number; dietary?: string[]; by?: string }): Promise<Meal[]> {
  const lines = descriptions.map((d) => d.trim()).filter(Boolean).slice(0, MAX_RECIPES_PER_TURN)
  if (!lines.length) return []
  // Two dinners per request, all at once: a list of 8 comes back in the time of 2.
  const chunks: string[][] = []
  for (let i = 0; i < lines.length; i += 2) chunks.push(lines.slice(i, i + 2))
  const results = await Promise.all(chunks.map(async (chunk) => {
    const prompt = promptFor(chunk, opts.servings, opts.dietary ?? [])
    try {
      let text: string
      try { text = await generateSmart(prompt, 3500) } catch { text = await generateWithClaude(prompt, 3500) }
      return parseClaudeJSON<{ meals: Built[] }>(text).meals ?? []
    } catch (e) { console.error('[family-recipes] chunk failed', e); return [] as Built[] }
  }))
  return clean(results.flat(), opts.servings, opts.by)
}

/** A photo of the box, the plate, or a handwritten recipe card → a one-line description of the dinner. */
export async function describeDinnerFromPhotos(images: ClaudeImage[], caption = ''): Promise<string[]> {
  if (!images.length) return []
  const text = await generateWithClaudeImages(`These photos show a family's dinner — the box or package they use, the finished plate, or a handwritten / printed recipe.
${caption ? `They said: "${caption}"\n` : ''}If it's a list of dinners (handwritten, typed or a screenshot), return EVERY dinner on it. If a dinner has a number (a 1–5 rating) in front of it, keep that number at the start of its line ("5 - Chicken Marsala"). Describe each distinct dinner in ONE plain line the way the family would say it, keeping boxed / brand-name items as they are (e.g. "Betty Crocker boxed scalloped potatoes with cut-up ham and frozen peas"). If it's a written recipe, put the main ingredients and method in that one line (up to 300 characters).
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
export function classicsDue(favorites: Meal[], recentPlans: Meal[][], perWeek: number): Meal[] {
  if (perWeek <= 0) return []
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const lastSeen = (name: string) => { const i = recentPlans.findIndex((p) => p.some((m) => norm(m.name) === norm(name))); return i < 0 ? Infinity : i }
  // The family's rating sets how often a dinner comes back (Sarah, Nov 7 2026): a 5 can return after a week off,
  // a 4 after two, a 3 or lower after three; unrated counts as a 4. Among the ones due, higher ratings are
  // picked more often (weight = rating²: a 5 is about three times as likely as a 3), never always.
  const rated = (m: Meal) => m.familyRating ?? 4
  const gap = (m: Meal) => (rated(m) >= 5 ? 1 : rated(m) === 4 ? 2 : 3)
  const pool = favorites.filter((m) => m && m.familyRecipe && lastSeen(m.name) >= gap(m))
  const out: Meal[] = []
  while (out.length < perWeek && pool.length) {
    const total = pool.reduce((s, m) => s + rated(m) ** 2, 0)
    let pick = Math.random() * total
    const i = Math.max(0, pool.findIndex((m) => (pick -= rated(m) ** 2) <= 0))
    out.push(pool.splice(i, 1)[0])
  }
  return out
}
