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
// Word-bounded so "hamburger buns", "eggplant" and "butter lettuce" don't read as ham, egg or butter.
const MEAT = /\b(chicken|beef|pork|bacon|ham|sausages?|turkey|lamb|steaks?|prosciutto|pepperoni|salami|chorizo|shrimp|salmon|tuna|cod|tilapia|fish|crab|scallops?|anchovy|anchovies)\b/i
const ANIMAL = /\b(eggs?|milk|cheeses?|butter|cream|yogurt|honey|ghee|parmesan|mozzarella|cheddar|feta|ricotta|mayo|mayonnaise)\b/i
// Plant-based or unrelated items that contain a dairy/egg word; removed before the vegan and dairy-free checks.
const PLANT_LOOKALIKES = /\b((coconut|oat|almond|soy|cashew|rice) (milk|cream|yogurt)|(peanut|almond|sunflower|cashew) butter|butter (lettuce|beans)|butternut|cream of tartar|(vegan|dairy-free|egg-free|plant-based) [a-z]+( [a-z]+)?)\b/gi
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
  const plantHay = hay.replace(PLANT_LOOKALIKES, ' ')
  if (diet === 'Vegan' && ANIMAL.test(plantHay)) return 'Vegan but has animal products'
  if (diet === 'Halal' && PORK.test(hay)) return 'Halal but has pork'
  if (diet === 'Halal' && /\b(chicken|beef|lamb|turkey|goat|veal)\b/i.test(hay) && !(m.ingredients ?? []).some((i) => /halal/i.test(`${i.name} ${i.searchTerm}`))) return 'Halal meat not specified as halal'
  if (diet === 'Gluten-free' && GLUTEN.test(hay.replace(/spaghetti squash|rice noodles?|rice vermicelli|rice paper|corn tortillas?|glass noodles|zucchini noodles|gluten-free [a-z]+( [a-z]+)?|tamari/gi, ' '))) return 'Gluten-free but has gluten'
  if (diet === 'Dairy-free' && DAIRY.test(plantHay)) return 'Dairy-free but has dairy'
  if (diet === 'Keto' && /\b(rice|pasta|potato|bread|tortilla|noodle|sugar|beans|corn)\b/i.test(hay.replace(/green beans|cauliflower rice|riced cauliflower|zucchini noodles|shirataki noodles|sugar-free|no-sugar-added|rice vinegar|rice wine vinegar|corn ?starch/gi, ' '))) return 'Keto but has starch'
  return null
}

const SEAFOOD = /\b(shrimp|salmon|tuna|cod|tilapia|fish|crab|scallops?|halibut|mahi|catfish|sea bass|swordfish|trout|clams?|mussels?)\b/i
const NEEDS_TEMP = /\b(chicken|beef|pork|turkey|lamb|steak|sausage|meatballs?|chorizo|sirloin|chuck|brisket|tenderloin|short ribs?)\b/i
const TEMP = /\b1[2-7]\d\s*°?\s*F\b/i
// Things a step can call for that must then be on the grocery list (water, salt and pepper are exempt).
const STEP_ITEMS: Array<[RegExp, RegExp]> = [
  [/\brice\b(?! vinegar| paper| noodle)/i, /\brice\b|riced/i],
  [/\btortillas?\b/i, /tortilla/i],
  [/\b(bread|buns?)\b/i, /bread|bun|roll|baguette|loaf/i],
  [/\b(pita|naan)\b/i, /pita|naan/i],
  [/\bnoodles?\b/i, /noodle|pasta|spaghetti|linguine|fettuccine|udon|ramen|lo mein/i],
  [/\bsalsa\b/i, /salsa/i],
  [/\bsour cream\b/i, /sour cream/i],
  [/\boil\b/i, /oil|spray/i],
  [/\bbutter\b(?! lettuce)/i, /butter/i],
  [/\blime\b/i, /lime/i],
  [/\blemon\b/i, /lemon/i],
  [/\bcilantro\b/i, /cilantro/i],
  [/\bgarlic\b/i, /garlic/i],
  [/\bginger\b/i, /ginger/i],
  [/\bsoy sauce\b/i, /soy sauce|tamari|coconut aminos/i],
  [/\b(honey|sugar|maple syrup)\b/i, /honey|sugar|syrup/i],
  [/\bvinegar\b/i, /vinegar/i],
  [/\b(broth|stock)\b/i, /broth|stock|bouillon/i],
  [/\b(cumin|paprika|chili powder|oregano)\b/i, /cumin|paprika|chili powder|oregano|seasoning|spice/i],
]
// Products whose usual supermarket version breaks a diet label unless the recipe names a compliant one.
const PRODUCT_RULES: Array<[string, RegExp, RegExp]> = [
  ['Vegetarian', /worcestershire|fish sauce|oyster sauce|anchov/i, /vegetarian|vegan/i],
  ['Vegan', /worcestershire|fish sauce|oyster sauce|curry paste|lo mein|egg noodle|brioche|mayo/i, /vegan|egg-free/i],
  ['Dairy-free', /brioche|naan|pesto|ranch|caesar/i, /dairy-free|vegan/i],
  ['Gluten-free', /enchilada sauce|taco seasoning|tortilla chips|soy sauce|hoisin|teriyaki|broth|sausage|bbq sauce|barbecue sauce|worcestershire/i, /gluten-free|tamari|coconut aminos/i],
  ['Halal', /broth|stock|wine(?! vinegar)|gelatin|vanilla extract|marshmallow/i, /halal|vegetable|veggie|mushroom/i],
]

/** Repairs that never change what the dinner is: wording and tags the recipe's own numbers decide. */
export function normalize(m: Meal & { dietary?: string[] }): Meal & { dietary?: string[] } {
  const ingredients = (m.ingredients ?? []).map((i) =>
    SEAFOOD.test(i.name) ? { ...i, name: i.name.replace(/\bhalal\s+/gi, ''), searchTerm: (i.searchTerm ?? '').replace(/\bhalal\s+/gi, '') } : i)
  // "Halal Salmon" is meaningless (fish is halal by default) and breaks grocery matching.
  const name = SEAFOOD.test(m.name ?? '') && !NEEDS_TEMP.test(m.name ?? '') ? (m.name ?? '').replace(/\bhalal\s+/gi, '') : m.name
  const total = (Number(m.prepTime) || 0) + (Number(m.cookTime) || 0)
  const per = (Number(m.estimatedCost) || 0) / (Number(m.servings) || 4)
  const stepText = (m.steps ?? []).join(' ')
  // "a skillet or wok" names one vessel, not two; a fallback in another step doesn't count either.
  const vesselText = stepText.toLowerCase().replace(/\b(or|and\/or)\s+(a\s+|an\s+)?(large\s+|deep\s+|heavy\s+)?(skillet|wok|pot|saucepan|dutch oven|baking dish|sheet pan|grill pan)\b/g, ' ')
  const vessels = new Set((vesselText.match(/sheet pan|baking sheet|baking dish|saucepan|skillet|wok|stockpot|large pot|\bpot\b|rice cooker|air fryer|slow cooker/g) ?? []).map((v) => (v === 'baking sheet' ? 'sheet pan' : v === 'large pot' || v === 'stockpot' ? 'pot' : v)))
  const heat = (m.ingredients ?? []).some((i) => /red pepper flakes|gochujang|sriracha|jalape|cayenne|chipotle|harissa|chili paste|chili oil|hot sauce|curry paste|habanero|serrano/i.test(i.name))
  let tags = honestTags(m.tags ?? [], total).filter((t) => {
    if (t === 'vegetarian' || t === '15-min') return false
    if (t === 'budget') return per > 0 && per <= 5
    if (t === 'one-pot') return vessels.size <= 1
    if (t === 'sheet-pan') return vessels.has('sheet pan')
    if (t === 'kid-favorite') return !heat || /plain|kids'? portion|set aside|on the side/i.test(stepText)
    return true
  })
  if ((m.dietary ?? []).some((d) => d === 'Vegetarian' || d === 'Vegan') && !tags.includes('meatless')) tags = [...tags, 'meatless']
  return { ...m, name, ingredients, tags }
}

/** Every check a recipe must pass before it can be served to a family. */
export function check(m: Meal & { dietary?: string[] }, maxMinutes: number): string | null {
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
  const prep = Number(m.prepTime) || 0
  if (prep < 3) return `prep time ${prep} min`
  const total = prep + (Number(m.cookTime) || 0)
  if (total < 10 || total > maxMinutes + 5) return `total time ${total} min`
  const cost = Number(m.estimatedCost) || 0
  const per = cost / (Number(m.servings) || 4)
  if (per < 1.25 || per > 9) return `cost $${per.toFixed(2)}/serving`
  for (const d of m.dietary ?? []) { const v = dietViolation(d, m); if (v) return v }
  const ingText = ings.map((i) => `${i.name} ${i.searchTerm}`).join(' | ')
  const stepText = steps.join(' ')
  // Food safety: meat and poultry need a target temperature, not "cooked through".
  if (NEEDS_TEMP.test(ings.map((i) => i.name).join(' ')) && !TEMP.test(stepText)) return 'meat with no target temperature'
  if (/swordfish|king mackerel|shark|tilefish/i.test(ingText)) return 'high-mercury fish (FDA advice for kids)'
  // The grocery list has to cover everything the steps use, unless the step calls it optional.
  const required = steps.filter((s) => !/optional|if you have|if you like/i.test(s)).join(' ')
  for (const [inStep, inList] of STEP_ITEMS) {
    // A component named in the title ("Mango Salsa") is made in the recipe, not bought.
    if (inStep.test(m.name ?? '')) continue
    if (inStep.test(required) && !inList.test(ingText)) return `step uses "${(required.match(inStep) ?? [''])[0]}" not on the grocery list`
  }
  for (const [diet, risky, ok] of PRODUCT_RULES) {
    if (!(m.dietary ?? []).includes(diet)) continue
    const bad = ings.find((i) => risky.test(i.name) && !ok.test(`${i.name} ${i.searchTerm}`))
    if (bad) return `${diet} needs a compliant "${bad.name}" named in the ingredient`
  }
  if (/\b(divide|split)\b[^.]{0,40}\b(between|among) (two|2)\b/i.test(stepText)) return 'steps portion for 2, recipe serves 4'
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
- 3–5 short steps, one sentence each, for a tired parent. prepTime + cookTime must cover every step, including rests and batches; prepTime is never 0.
- Every item a step uses or serves (oil, butter, garlic, rice, tortillas, bread, salsa, sauces, spices, broth, lime/lemon) must be in the ingredients; only water, salt and pepper may be left out. A truly optional extra says "(optional)" in the step. If rice or pasta is served, include it and say how to cook it (or use microwave rice pouches when time is short).
- Food safety: give a target temperature for meat and poultry — chicken/turkey 165°F, ground beef/pork/lamb and sausage 160°F, whole cuts of beef/pork/lamb 145°F then rest 3 minutes. Never use swordfish, king mackerel, shark or tilefish.
- Portions and step wording must match 4 servings (four plates/bowls, enough buns/tortillas/fillets for 4).
- If heat (chiles, red pepper flakes, sriracha, curry paste) is mixed in and you tag kid-favorite, include a step that sets aside a plain portion before the heat goes in.
- "dietary": list EVERY one of these the recipe truly complies with: ${DIETS.join(', ')} (empty list if none). Halal dinners with meat must call for halal meat by name (e.g. "halal chicken thighs") and use halal or vegetable broth; never write "halal" on fish or shellfish. When a label depends on the product, name the compliant product in the ingredient and searchTerm (gluten-free soy sauce/tamari, gluten-free enchilada sauce, vegetarian Worcestershire, vegan curry paste, dairy-free buns).
- 1–3 tags from: quick, sheet-pan, one-pot, air-fryer, grill, kid-favorite, budget, high-protein. Use "one-pot" only if the whole dinner uses one pot or pan, and "sheet-pan" only if it cooks on a sheet pan.
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
      let m = { ...raw, servings: 4, cookTime: Number(raw.cookTime) || 0, prepTime: Number(raw.prepTime) || 0, day: '1' }
      // Keep only diets we track; the batch's target diet must be among them.
      m.dietary = (raw.dietary ?? []).filter((d): d is (typeof DIETS)[number] => (DIETS as readonly string[]).includes(d))
      if (f.diet && !m.dietary.includes(f.diet)) { report.rejected.push({ name: m.name, why: `not tagged ${f.diet}` }); continue }
      m = normalize(m)
      const norm = normalizeName(m.name ?? '')
      if (known.has(norm)) { report.rejected.push({ name: m.name, why: 'duplicate' }); continue }
      const why = check(m, f.maxMinutes)
      if (why) { report.rejected.push({ name: m.name, why }); continue }
      known.add(norm)
      try {
        await upsertRecipes(admin, [m], { dietary: m.dietary, fetchImages: false })
        report.saved.push(m.name)
      } catch (e) {
        report.rejected.push({ name: m.name, why: `save failed: ${String(e).slice(0, 80)}` })
      }
    }
  }
  return report
}
