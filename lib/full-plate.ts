/**
 * Full plate (Sarah, Nov 7 2026): every dinner comes with a protein, a starch and a vegetable. When a recipe is
 * missing the starch or the vegetable, a simple side is added (rice, potatoes, bread; green beans, broccoli, salad)
 * and it goes on the grocery list. Low-carb / keto families get a second vegetable instead of the starch.
 * On by default; Settings → Food → "Full plate" turns it off. Client-safe, no AI.
 */
import type { Ingredient, Meal } from '@/types'
import { SIDES, SOUP, ASIAN, MEX, MED, type Side } from '@/lib/sides'
import { allergyConflicts } from '@/lib/allergens'

const STARCH = /\b(rice|pasta|spaghetti|penne|rigatoni|ziti|macaroni|orzo|noodles?|tortillas?|potato(es)?|fries|tots|hash ?browns?|bread|buns?|rolls?|biscuits?|cornbread|naan|pitas?|flatbreads?|couscous|quinoa|polenta|grits|gnocchi|lasagna|pizza|sandwich|wraps?|tacos?|burritos?|quesadillas?|tostadas?|enchiladas?|pierogi|dumplings?|stuffing|baguette|croutons|tater|sliders?|hoagie|sub rolls?|english muffins?|pancakes?|waffles?)\b/
const VEG = /\b(broccoli|broccolini|green beans|asparagus|brussels|zucchini|carrots?|(?:bell|sweet|red|green|yellow|orange|mini|poblano|banana) peppers?|peppers|squash|cauliflower|peas|snap peas|snow peas|corn(?! tortillas?| chips| ?starch| syrup| ?meal| ?bread| flakes)|spinach|kale|salad|greens|lettuce|romaine|arugula|slaw|cabbage|cucumbers?|bok choy|eggplant|mushrooms?|okra|beets?|edamame|vegetables?(?! oil| broth| stock| spray| shortening)|veggies?|celery|sweet potato(es)?|butternut)\b/
const LOW_CARB = /low[- ]?carb|keto|paleo|atkins/i
/** Diets that rule a side out the way an allergy would ("Gluten-free" → no garlic bread, "Dairy-free" → no buttered corn). */
const DIET_AS_ALLERGY: Array<[RegExp, string]> = [[/gluten[- ]?free|celiac/i, 'Gluten'], [/dairy[- ]?free/i, 'Dairy'], [/egg[- ]?free/i, 'Egg'], [/vegan/i, 'Dairy'], [/vegan/i, 'Egg']]

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

/** A side the family can't have: one of its items hits a household allergy (or a diet read as one), or a won't-eat word. */
function sideBlocked(s: SideDef, avoid: string[], allergies: string[]): boolean {
  // The side's name counts too ("Buttered corn" is butter even though only the corn is on the list).
  if (allergies.length && allergyConflicts([...s.items, { name: s.name.replace(/buttered/i, 'butter') }], [{ name: '', allergies }], s.name).length) return true
  return avoid.some((w) => w.length > 2 && s.items.some((it) => it.name.toLowerCase().includes(w.toLowerCase().replace(/s$/, ''))))
}

/** First side in `options` the family can have; `fallback` when none can (rice is safe for nearly everyone). */
function pickSide(options: SideDef[], i: number, avoid: string[], allergies: string[], fallback: SideDef = SIDES.rice): SideDef {
  const ok = options.filter((o) => !sideBlocked(o, avoid, allergies))
  if (!ok.length) return sideBlocked(fallback, avoid, allergies) ? options[i % options.length] : fallback
  return ok[i % ok.length]
}

// Nov 17 2026: a gluten-allergy family got "Garlic bread" with their pork chops and a diabetic-friendly family got bread
// three nights running; starch sides now skip anything the household's allergies/diets rule out, bread-first options
// fall back to rice or potatoes.
function starchSide(m: Meal, i: number, avoid: string[], allergies: string[]): SideDef {
  const h = text(m)
  const pick = (options: SideDef[]) => pickSide(options, i, avoid, allergies)
  if (SOUP.test(h)) return pick([SIDES.crustyBread, SIDES.rice])
  if (ASIAN.test(h) || MEX.test(h)) return pick([SIDES.rice, extra.roastPotatoes])
  if (MED.test(h)) return pick([/\b(greek|mediterranean|feta|tzatziki)\b/.test(h) ? SIDES.pita : SIDES.garlicBread, SIDES.rice, extra.roastPotatoes])
  if (/\b(steaks?|pork chops?|meatloaf|roast|pot roast|chicken breasts?|chicken thighs|drumsticks|sausages?|kielbasa|salmon|cod|tilapia|fish|shrimp)\b/.test(h)) {
    return pick([SIDES.mash, extra.roastPotatoes, SIDES.rice, extra.rolls])
  }
  return pick([SIDES.rice, extra.roastPotatoes, extra.rolls])
}

function vegSide(m: Meal, i: number, avoid: string[], allergies: string[] = []): SideDef {
  const h = text(m)
  let options: SideDef[]
  if (ASIAN.test(h)) options = [SIDES.broccoli, extra.peas, SIDES.cucumber]
  else if (MEX.test(h)) options = [extra.corn, SIDES.slaw, SIDES.salad]
  else if (MED.test(h) || /\b(pasta|spaghetti|lasagna|italian|mac|macaroni|penne|rigatoni)\b/.test(h)) options = [SIDES.salad, SIDES.broccoli, SIDES.greenBeans]
  else if (/\b(bbq|barbecue|burgers?|sliders?|hot dogs?|pulled pork)\b/.test(h)) options = [SIDES.cornCob, SIDES.slaw, extra.carrots]
  else options = [SIDES.greenBeans, SIDES.broccoli, extra.carrots, SIDES.salad, extra.corn]
  return pickSide(options, i, avoid, allergies, SIDES.greenBeans)
}

/**
 * Give every dinner a starch and a vegetable. `avoid` = household won't-eats (sides that use them are skipped);
 * `allergies` = household allergies as typed in setup ("Gluten", "Dairy", "Tree nuts"); diets such as Gluten-free and
 * Dairy-free count as allergies here, so no bread side lands on a gluten-free week.
 * Sides already on the dinner count (a health-need starch side stays; a vegetable is added to it if missing).
 */
export function completePlates(meals: Meal[], opts: { dietaryNeeds: string[]; avoid?: string[]; allergies?: string[] }): Meal[] {
  const lowCarb = opts.dietaryNeeds.some((d) => LOW_CARB.test(d))
  const avoid = opts.avoid ?? []
  const allergies = Array.from(new Set([
    ...(opts.allergies ?? []),
    ...opts.dietaryNeeds.flatMap((d) => DIET_AS_ALLERGY.filter(([re]) => re.test(d)).map(([, a]) => a)),
    // Allergies typed into the won't-eat list by earlier callers still count.
    ...avoid.filter((w) => /gluten|wheat|dairy|milk|egg|peanut|tree ?nut|sesame|soy|shellfish|fish/i.test(w)),
  ]))
  return meals.map((m, i) => {
    const main = text(m)
    const base = m.side && m.side.name ? m.side : null
    const sideText = base ? `${base.name} ${(base.items ?? []).map((x) => x.name).join(' | ')}`.toLowerCase() : ''
    const vegIn = (t: string) => (t.match(new RegExp(VEG.source, 'g')) ?? []).length
    const mainStarch = STARCH.test(main), sideStarch = !!base && STARCH.test(sideText)
    const mainVeg = vegIn(main), sideVeg = base ? vegIn(sideText) : 0
    const add: SideDef[] = []
    if (!mainVeg && !sideVeg) add.push(vegSide(m, i, avoid, allergies))
    if (!mainStarch && !sideStarch) {
      if (!lowCarb) add.push(starchSide(m, i, avoid, allergies))
      else if (mainVeg + sideVeg + add.length < 2) {   // low-carb: a second vegetable instead of the starch
        const second = vegSide(m, i + 1, avoid, allergies)
        add.push(add.some((a) => a.name === second.name) ? vegSide(m, i + 2, avoid, allergies) : second)
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
