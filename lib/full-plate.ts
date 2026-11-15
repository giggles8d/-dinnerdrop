/**
 * Full plate (Sarah, Nov 7 2026): every dinner comes with a protein, a starch and a vegetable. When a recipe is
 * missing the starch or the vegetable, a simple side is added (rice, potatoes, bread; green beans, broccoli, salad)
 * and it goes on the grocery list. Low-carb / keto families get a second vegetable instead of the starch.
 * On by default; Settings → Food → "Full plate" turns it off. Client-safe, no AI.
 */
import type { Ingredient, Meal } from '@/types'
import { SIDES, SOUP, ASIAN, MEX, type Side } from '@/lib/sides'
import { allergyTargets, allergyConflicts, type AllergenKey } from '@/lib/allergens'

const STARCH = /\b(rice|pasta|spaghetti|penne|rigatoni|ziti|macaroni|orzo|noodles?|tortillas?|potato(es)?|fries|tots|hash ?browns?|bread|buns?|rolls?|biscuits?|cornbread|naan|pitas?|flatbreads?|couscous|quinoa|polenta|grits|gnocchi|lasagna|pizza|sandwich|wraps?|tacos?|burritos?|quesadillas?|tostadas?|enchiladas?|pierogi|dumplings?|stuffing|baguette|croutons|tater|sliders?|hoagie|sub rolls?|english muffins?|pancakes?|waffles?)\b/
const VEG = /\b(broccoli|broccolini|green beans|asparagus|brussels|zucchini|carrots?|(?:bell|sweet|red|green|yellow|orange|mini|poblano|banana) peppers?|peppers|squash|cauliflower|peas|snap peas|snow peas|corn(?! tortillas?| chips| ?starch| syrup| ?meal| ?bread| flakes)|spinach|kale|salad|greens|lettuce|romaine|arugula|slaw|cabbage|cucumbers?|bok choy|eggplant|mushrooms?|okra|beets?|edamame|vegetables?(?! oil| broth| stock| spray| shortening)|veggies?|celery|sweet potato(es)?|butternut)\b/
const LOW_CARB = /low[- ]?carb|keto|paleo|atkins/i
// Cuisine for the starch side, from the dish itself. lib/sides' MED also matches "lemon" and "olive oil", which put
// garlic bread next to shawarma, chicken cutlets and a chicken salad (Nov 14 2026: three nights of frozen garlic bread
// for a dairy-allergic family). Middle Eastern / Greek → pita; Italian → garlic bread; everything else → by protein.
const PITA = /\b(mediterranean|greek|feta|tzatziki|shawarma|tahini|hummus|falafel|sumac|za'?atar|gyros?|souvlaki|kebabs?|kofta|fattoush|tabbouleh)\b/
const ITALIAN = /\b(italian|pesto|marinara|parmesan|parmigiana|piccata|tuscan|caprese|bolognese|alfredo|cacciatore|saltimbocca)\b/

/** What a side carries that its grocery items don't say (frozen garlic bread is butter and cheese on wheat bread). */
const SIDE_ALLERGENS: Record<string, AllergenKey[]> = {
  'Garlic bread': ['milk', 'wheat'],
  'Crusty bread': ['wheat'],
  'Dinner rolls': ['wheat', 'milk', 'egg'],
  'Warm pita and hummus': ['wheat', 'sesame'],
  'Mashed potatoes': ['milk'],
  'Buttered corn': ['milk'],
  'Buttered peas': ['milk'],
  'Quick slaw': ['egg'],
  'Chips and salsa': [],
}

const extra = {
  roastPotatoes: { name: 'Roasted potatoes', minutes: 25, items: [{ name: 'Baby potatoes', quantity: '1.5', unit: 'lb', category: 'Produce' as const }] },
  carrots: { name: 'Roasted carrots', minutes: 15, items: [{ name: 'Baby carrots', quantity: '1', unit: 'lb', category: 'Produce' as const }] },
  corn: { name: 'Buttered corn', minutes: 5, items: [{ name: 'Frozen corn', quantity: '1', unit: 'bag', category: 'Frozen' as const }] },
  rolls: { name: 'Dinner rolls', minutes: 5, items: [{ name: 'Dinner rolls', quantity: '1', unit: 'package', category: 'Bakery' as const }] },
  peas: { name: 'Buttered peas', minutes: 5, items: [{ name: 'Frozen peas', quantity: '1', unit: 'bag', category: 'Frozen' as const }] },
}

type SideDef = { name: string; minutes: number; items: Ingredient[] }

function text(m: Pick<Meal, 'name' | 'ingredients'>, side?: Side): string {
  return `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' | ')} ${side ? `${side.name} ${(side.items ?? []).map((i) => i.name).join(' | ')}` : ''}`.toLowerCase()
}

/** The family's hard no's for a side: allergies (each person's) and "-free" diets (Dairy-free → milk), by allergen. */
type Limits = { keys: Set<AllergenKey>; allergies: string[]; avoid: string[] }

function limitsFor(opts: { dietaryNeeds: string[]; avoid?: string[]; allergies?: string[] }): Limits {
  const allergies = Array.from(new Set([
    ...(opts.allergies ?? []),
    ...opts.dietaryNeeds.filter((d) => /-free$/i.test(d.trim())).map((d) => d.replace(/-free$/i, '').trim()),
  ].filter(Boolean)))
  const keys = new Set<AllergenKey>()
  for (const a of allergies) for (const k of allergyTargets(a).keys) keys.add(k)
  if (opts.dietaryNeeds.some((d) => /^vegan$/i.test(d.trim()))) { keys.add('milk'); keys.add('egg') }
  return { keys, allergies, avoid: opts.avoid ?? [] }
}

/** A side the family can eat: no allergen they avoid (by what the side really is, then by its items), no won't-eat in it. */
function sideOk(s: SideDef, lim: Limits): boolean {
  if ((SIDE_ALLERGENS[s.name] ?? []).some((k) => lim.keys.has(k))) return false
  if (lim.allergies.length && allergyConflicts(s.items, [{ name: '', allergies: lim.allergies }], s.name).length) return false
  const words = lim.avoid.map((w) => w.toLowerCase().replace(/s$/, '')).filter((w) => w.length > 2)
  return !words.some((w) => s.items.some((it) => it.name.toLowerCase().includes(w)) || s.name.toLowerCase().includes(w))
}

/** First option the family can eat, in order from `i`; a side nobody can eat is skipped (none fit → the first option). */
function pick(options: SideDef[], i: number, lim: Limits): SideDef {
  const ok = options.filter((o) => sideOk(o, lim))
  const list = ok.length ? ok : options
  return list[i % list.length]
}

function starchSide(m: Meal, i: number, lim: Limits): SideDef {
  const h = text(m)
  if (SOUP.test(h)) return pick([SIDES.crustyBread, extra.rolls, SIDES.rice], 0, lim)
  if (ASIAN.test(h) || MEX.test(h)) return pick([SIDES.rice, extra.roastPotatoes], 0, lim)
  if (PITA.test(h)) return pick([SIDES.pita, SIDES.rice, extra.roastPotatoes], 0, lim)
  if (ITALIAN.test(h)) return pick([SIDES.garlicBread, SIDES.crustyBread, extra.roastPotatoes, SIDES.rice], 0, lim)
  if (/\b(steaks?|pork chops?|meatloaf|roast|pot roast|chicken breasts?|chicken thighs|drumsticks|sausages?|kielbasa|salmon|cod|tilapia|fish|shrimp)\b/.test(h)) {
    return pick([SIDES.mash, extra.roastPotatoes, SIDES.rice, extra.rolls], i, lim)
  }
  return pick([SIDES.rice, extra.roastPotatoes, extra.rolls], i, lim)
}

function vegSide(m: Meal, i: number, lim: Limits): SideDef {
  const h = text(m)
  let options: SideDef[]
  if (ASIAN.test(h)) options = [SIDES.broccoli, extra.peas, SIDES.cucumber]
  else if (MEX.test(h)) options = [extra.corn, SIDES.slaw, SIDES.salad]
  else if (PITA.test(h) || ITALIAN.test(h) || /\b(pasta|spaghetti|lasagna|mac|macaroni|penne|rigatoni)\b/.test(h)) options = [SIDES.salad, SIDES.broccoli, SIDES.greenBeans]
  else if (/\b(bbq|barbecue|burgers?|sliders?|hot dogs?|pulled pork)\b/.test(h)) options = [SIDES.cornCob, SIDES.slaw, extra.carrots]
  else options = [SIDES.greenBeans, SIDES.broccoli, extra.carrots, SIDES.salad, extra.corn]
  return pick(options, i, lim)
}

/**
 * Give every dinner a starch and a vegetable. `avoid` = household dislikes and hard-no words; `allergies` = each
 * person's allergies (plus the household's "-free" diets, read from dietaryNeeds): a side carrying one is never
 * suggested (frozen garlic bread is dairy; rolls are wheat). Sides already on the dinner count (a health-need starch
 * side stays; a vegetable is added to it if missing).
 */
export function completePlates(meals: Meal[], opts: { dietaryNeeds: string[]; avoid?: string[]; allergies?: string[] }): Meal[] {
  const lowCarb = opts.dietaryNeeds.some((d) => LOW_CARB.test(d))
  const lim = limitsFor(opts)
  return meals.map((m, i) => {
    const main = text(m)
    const base = m.side && m.side.name ? m.side : null
    const sideText = base ? `${base.name} ${(base.items ?? []).map((x) => x.name).join(' | ')}`.toLowerCase() : ''
    const vegIn = (t: string) => (t.match(new RegExp(VEG.source, 'g')) ?? []).length
    const mainStarch = STARCH.test(main), sideStarch = !!base && STARCH.test(sideText)
    const mainVeg = vegIn(main), sideVeg = base ? vegIn(sideText) : 0
    const add: SideDef[] = []
    if (!mainVeg && !sideVeg) add.push(vegSide(m, i, lim))
    if (!mainStarch && !sideStarch) {
      if (!lowCarb) add.push(starchSide(m, i, lim))
      else if (mainVeg + sideVeg + add.length < 2) {   // low-carb: a second vegetable instead of the starch
        const second = vegSide(m, i + 1, lim)
        add.push(add.some((a) => a.name === second.name) ? vegSide(m, i + 2, lim) : second)
      }
    }
    // A suggested side that fills a gap in the main becomes part of the shop.
    const baseFills = !!base && ((!mainVeg && sideVeg > 0) || (!mainStarch && sideStarch))
    if (!add.length && !baseFills) return m
    if (!add.length && base) return { ...m, side: { ...base, onList: true } }
    const parts = [...(base ? [base] : []), ...add]
    const name = parts.map((p, k) => (k === 0 ? p.name : p.name.charAt(0).toLowerCase() + p.name.slice(1))).join(' and ')
    const side = {
      ...(base ?? {}),
      name: name.slice(0, 80),
      minutes: Math.max(...parts.map((p) => Number(p.minutes) || 10)),
      items: parts.flatMap((p) => p.items ?? []).slice(0, 5),
      onList: true,
    }
    return { ...m, side }
  })
}
