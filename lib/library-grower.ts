/**
 * Grows the recipe library every night so weekly plans can be served instantly
 * from it instead of waiting on live AI generation.
 *
 * Each run looks for the thinnest parts of the library (dietary needs, quick
 * dinners, under-used proteins), asks the model for ORIGINAL recipes inspired
 * by dishes US families commonly cook and search for (never a copy of any
 * published recipe's text), checks every recipe before saving it, and stores
 * survivors without a photo — the nightly photo task gives them one.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { normalizeName, upsertRecipes, honestTags } from '@/lib/recipe-library'
import { parseQuantity } from '@/lib/portions'
import type { Meal } from '@/types'

const DIETS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Keto', 'Halal'] as const
const CATEGORIES = new Set(['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages'])
const MEAT = /\b(chicken|beef|pork|bacon|ham|sausage|turkey|lamb|steak|prosciutto|pepperoni|salami|chorizo|shrimp|salmon|tuna|cod|tilapia|fish|crab|scallop|anchov)/i
const ANIMAL = /\b(egg|milk|cheese|butter|cream|yogurt|honey|ghee|parmesan|mozzarella|cheddar|feta|ricotta|mayo)/i
const PORK = /\b(pork|bacon|ham|prosciutto|pepperoni|salami|chorizo|lard)\b/i
const GLUTEN = /\b(flour|bread|pasta|spaghetti|penne|noodle|tortilla|couscous|barley|soy sauce|panko|breadcrumb|bun|pita|naan|orzo|ramen|udon)\b/i
const DAIRY = /\b(milk|cheese|butter|cream|yogurt|parmesan|mozzarella|cheddar|feta|ricotta|ghee)\b/i

interface Focus { label: string; diet?: (typeof DIETS)[number]; maxMinutes: number; note: string }

export interface GrowReport { requested: number; saved: string[]; rejected: Array<{ name: string; why: string }>; focuses: string[] }

/** Pick this run's targets: the thinnest diets get the most attention, plus quick everyday dinners. */
async function chooseFocuses(admin: SupabaseClient, batches: number): Promise<Focus[]> {
  const { data } = await admin.from('recipes').select('dietary, cook_time, protein').eq('is_public', true).limit(5000)
  const rows = data ?? []
  const dietCount = (d: string) => rows.filter((r) => (r.dietary ?? []).includes(d)).length
  const thinnest = [...DIETS].sort((a, b) => dietCount(a) - dietCount(b))
  const proteinCount = new Map<string, number>()
  for (const r of rows) { const p = (r.protein ?? '').toLowerCase(); if (p) proteinCount.set(p, (proteinCount.get(p) ?? 0) + 1) }
  const underUsed = ['pork', 'ground turkey', 'tilapia', 'cod', 'sausage', 'lentils', 'eggs', 'chickpeas', 'tuna', 'steak']
    .sort((a, b) => (proteinCount.get(a) ?? 0) - (proteinCount.get(b) ?? 0)).slice(0, 4)
  const focuses: Focus[] = [
    { label: `${thinnest[0]} 30-min`, diet: thinnest[0], maxMinutes: 30, note: '' },
    { label: `${thinnest[1]} 30-min`, diet: thinnest[1], maxMinutes: 30, note: '' },
    { label: 'everyday 20-min', maxMinutes: 20, note: 'Very fast weeknight dinners a tired parent can do in 20 minutes.' },
    { label: 'under-used proteins', maxMinutes: 35, note: `Built around proteins the library has few of: ${underUsed.join(', ')}.` },
    { label: `${thinnest[2]} 30-min`, diet: thinnest[2], maxMinutes: 30, note: '' },
    { label: 'budget family favorites', maxMinutes: 30, note: 'Classic kid-friendly family dinners under $3 per serving.' },
  ]
  return focuses.slice(0, batches)
}

function dietViolation(diet: string, m: Meal): string | null {
  const hay = `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' ')}`
  if ((diet === 'Vegetarian' || diet === 'Vegan') && MEAT.test(hay)) return `${diet} but has meat/fish`
  if (diet === 'Vegan' && ANIMAL.test(hay)) return 'Vegan but has animal products'
  if (diet === 'Halal' && PORK.test(hay)) return 'Halal but has pork'
  if (diet === 'Halal' && /\b(chicken|beef|lamb|turkey|goat|veal|steak)\b/i.test(hay) && !(m.ingredients ?? []).some((i) => /halal/i.test(`${i.name} ${i.searchTerm}`))) return 'Halal meat not specified as halal'
  if (diet === 'Gluten-free' && GLUTEN.test(hay) && !/gluten-free/i.test(hay)) return 'Gluten-free but has gluten'
  if (diet === 'Dairy-free' && DAIRY.test(hay) && !/dairy-free|vegan/i.test(hay)) return 'Dairy-free but has dairy'
  if (diet === 'Keto' && /\b(rice|pasta|potato|bread|tortilla|noodle|sugar|beans|corn)\b/i.test(hay) && !/cauliflower rice|low-carb/i.test(hay)) return 'Keto but has starch'
  return null
}

/** Every check a recipe must pass before it can be served to a family. */
function check(m: Meal & { dietary?: string[] }, maxMinutes: number): string | null {
  if (!m.name || m.name.length < 4 || m.name.length > 80) return 'bad name'
  const ings = m.ingredients ?? []
  if (ings.length < 3 || ings.length > 10) return `${ings.length} ingredients`
  for (const i of ings) {
    if (!i.name || !i.searchTerm) return `ingredient missing name/searchTerm`
    if (!CATEGORIES.has(i.category)) return `bad category "${i.category}"`
    const seasoning = /taste|pinch|dash/i.test(`${i.quantity} ${i.unit}`) && /salt|pepper|spice|seasoning|herb|flakes/i.test(i.name)
    if (parseQuantity(i.quantity) == null && !seasoning) return `unshoppable quantity "${i.quantity}" ${i.unit}`
  }
  const steps = m.steps ?? []
  if (steps.length < 2 || steps.length > 6) return `${steps.length} steps`
  const total = (Number(m.cookTime) || 0)
  if (total < 5 || total > maxMinutes + 5) return `cook time ${total} min`
  const cost = Number(m.estimatedCost) || 0
  const per = cost / (Number(m.servings) || 4)
  if (per < 1.25 || per > 9) return `cost $${per.toFixed(2)}/serving`
  for (const d of m.dietary ?? []) { const v = dietViolation(d, m); if (v) return v }
  return null
}

export async function growLibrary(admin: SupabaseClient, opts: { batches?: number; perBatch?: number } = {}): Promise<GrowReport> {
  const batches = Math.min(Math.max(opts.batches ?? 4, 1), 6)
  const perBatch = Math.min(Math.max(opts.perBatch ?? 5, 1), 8)
  const focuses = await chooseFocuses(admin, batches)
  const report: GrowReport = { requested: batches * perBatch, saved: [], rejected: [], focuses: focuses.map((f) => f.label) }

  const { data: existing } = await admin.from('recipes').select('normalized_name, name, dietary').limit(5000)
  const known = new Set((existing ?? []).map((r) => r.normalized_name as string))

  const results = await Promise.allSettled(focuses.map(async (f) => {
    const avoid = (existing ?? [])
      .filter((r) => !f.diet || (r.dietary ?? []).includes(f.diet))
      .map((r) => r.name as string)
      .sort(() => Math.random() - 0.5)
      .slice(0, 120)
    const prompt = `You write recipes for DinnerDrop, a weeknight dinner planner for busy US families.

Write ${perBatch} ORIGINAL weeknight dinner recipes${f.diet ? ` that are strictly ${f.diet}` : ''}, each on the table in ${f.maxMinutes} minutes or less (prep included). ${f.note}
Base them on dishes American families actually cook and search for — classics and currently popular dinners — but write every recipe yourself in your own words. Do not reproduce any specific published recipe, blog, cookbook or brand recipe, and do not name sources.

Rules:
- Servings: exactly 4. Realistic US supermarket cost for the whole dinner (most run $10–$24 for 4); do not inflate.
- 4–8 ingredients with shoppable quantities ("1" "lb", "1" "can", "1" "bunch"), each with a "searchTerm" that matches a grocery product. Per serving at least 6 oz raw boneless meat/fish (5.5 oz ground) when there is meat.
- 3–5 short steps, one sentence each, for a tired parent.
- "dietary": list EVERY one of these the recipe truly complies with: ${DIETS.join(', ')} (empty list if none). Halal dinners with meat must call for halal meat by name (e.g. "halal chicken thighs").
- 1–3 tags from: quick, sheet-pan, one-pot, air-fryer, grill, kid-favorite, budget, high-protein, vegetarian, 15-min
- Different proteins and cuisines across the ${perBatch}; none may be a version of these existing dinners: ${avoid.join('; ')}

Return ONLY valid JSON, no markdown:
{"meals":[{"name":"string","cuisine":"Mexican","protein":"chicken thighs","cookTime":25,"prepTime":10,"servings":4,"estimatedCost":16.5,"dietary":["Gluten-free"],"tags":["quick"],"nutrition":{"calories":520,"protein":34},"ingredients":[{"name":"chicken thighs","quantity":"1 1/2","unit":"lb","category":"Meat & Seafood","searchTerm":"boneless chicken thighs"}],"steps":["..."]}]}
Categories must be one of: ${Array.from(CATEGORIES).join(', ')}.`
    const text = await generateWithClaude(prompt, 6000)
    const out = parseClaudeJSON<{ meals: Array<Meal & { dietary?: string[] }> }>(text)
    return { f, meals: out.meals ?? [] }
  }))

  for (const r of results) {
    if (r.status !== 'fulfilled') { report.rejected.push({ name: '(batch)', why: String(r.reason).slice(0, 120) }); continue }
    const { f, meals } = r.value
    for (const raw of meals) {
      const m = { ...raw, servings: 4, cookTime: Number(raw.cookTime) || 0, prepTime: Number(raw.prepTime) || 0, day: '1' }
      // Keep only diets we track; the batch's target diet must be among them.
      m.dietary = (raw.dietary ?? []).filter((d): d is (typeof DIETS)[number] => (DIETS as readonly string[]).includes(d))
      if (f.diet && !m.dietary.includes(f.diet)) { report.rejected.push({ name: m.name, why: `not tagged ${f.diet}` }); continue }
      const norm = normalizeName(m.name ?? '')
      if (known.has(norm)) { report.rejected.push({ name: m.name, why: 'duplicate' }); continue }
      const why = check(m, f.maxMinutes)
      if (why) { report.rejected.push({ name: m.name, why }); continue }
      known.add(norm)
      try {
        await upsertRecipes(admin, [{ ...m, tags: honestTags(m.tags ?? [], m.cookTime) }], { dietary: m.dietary, fetchImages: false })
        report.saved.push(m.name)
      } catch (e) {
        report.rejected.push({ name: m.name, why: `save failed: ${String(e).slice(0, 80)}` })
      }
    }
  }
  return report
}
