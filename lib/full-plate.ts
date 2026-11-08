/**
 * Full plate (Sarah, Nov 7 2026): every dinner comes with a protein, a starch and a vegetable. When a recipe is
 * missing the starch or the vegetable, a simple side is added (rice, potatoes, bread; green beans, broccoli, salad)
 * and it goes on the grocery list. Low-carb / keto families get a second vegetable instead of the starch.
 * On by default; Settings → Food → "Full plate" turns it off. Client-safe, no AI.
 */
import type { Ingredient, Meal } from '@/types'
import { SIDES, SOUP, ASIAN, MEX, MED, type Side } from '@/lib/sides'

const STARCH = /\b(rice|pasta|spaghetti|penne|rigatoni|ziti|macaroni|orzo|noodles?|tortillas?|potato(es)?|fries|tots|hash ?browns?|bread|buns?|rolls?|biscuits?|cornbread|naan|pitas?|flatbreads?|couscous|quinoa|polenta|grits|gnocchi|lasagna|pizza|sandwich|wraps?|tacos?|burritos?|quesadillas?|tostadas?|enchiladas?|pierogi|dumplings?|stuffing|baguette|croutons|tater|sliders?|hoagie|sub rolls?|english muffins?|pancakes?|waffles?)\b/
const VEG = /\b(broccoli|broccolini|green beans|asparagus|brussels|zucchini|carrots?|bell peppers?|peppers?|squash|cauliflower|peas|snap peas|snow peas|corn|spinach|kale|salad|greens|lettuce|romaine|arugula|slaw|cabbage|cucumbers?|bok choy|eggplant|mushrooms?|okra|beets?|edamame|vegetables?|veggies?|celery|sweet potato(es)?|butternut)\b/
const LOW_CARB = /low[- ]?carb|keto|paleo|atkins/i

const extra = {
  roastPotatoes: { name: 'Roasted potatoes', minutes: 25, items: [{ name: 'Baby potatoes', quantity: '1.5', unit: 'lb', category: 'Produce' as const }] },
  carrots: { name: 'Honey-glazed carrots', minutes: 15, items: [{ name: 'Baby carrots', quantity: '1', unit: 'lb', category: 'Produce' as const }] },
  corn: { name: 'Buttered corn', minutes: 5, items: [{ name: 'Frozen corn', quantity: '1', unit: 'bag', category: 'Frozen' as const }] },
  rolls: { name: 'Dinner rolls', minutes: 5, items: [{ name: 'Dinner rolls', quantity: '1', unit: 'package', category: 'Bakery' as const }] },
  peas: { name: 'Buttered peas', minutes: 5, items: [{ name: 'Frozen peas', quantity: '1', unit: 'bag', category: 'Frozen' as const }] },
}

type SideDef = { name: string; minutes: number; items: Ingredient[] }

function text(m: Pick<Meal, 'name' | 'ingredients'>, side?: Side): string {
  return `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' | ')} ${side ? `${side.name} ${(side.items ?? []).map((i) => i.name).join(' | ')}` : ''}`.toLowerCase()
}

function starchSide(m: Meal, i: number): SideDef {
  const h = text(m)
  if (SOUP.test(h)) return SIDES.crustyBread
  if (ASIAN.test(h) || MEX.test(h)) return SIDES.rice
  if (MED.test(h)) return /\b(greek|mediterranean|feta|tzatziki)\b/.test(h) ? SIDES.pita : SIDES.garlicBread
  if (/\b(steaks?|pork chops?|meatloaf|roast|pot roast|chicken breasts?|chicken thighs|drumsticks|sausages?|kielbasa|salmon|cod|tilapia|fish|shrimp)\b/.test(h)) {
    return [SIDES.mash, extra.roastPotatoes, SIDES.rice, extra.rolls][i % 4]
  }
  return [SIDES.rice, extra.roastPotatoes, extra.rolls][i % 3]
}

function vegSide(m: Meal, i: number, avoid: string[]): SideDef {
  const h = text(m)
  let options: SideDef[]
  if (ASIAN.test(h)) options = [SIDES.broccoli, extra.peas, SIDES.cucumber]
  else if (MEX.test(h)) options = [extra.corn, SIDES.slaw, SIDES.salad]
  else if (MED.test(h) || /\b(pasta|spaghetti|lasagna|italian)\b/.test(h)) options = [SIDES.salad, SIDES.broccoli, SIDES.greenBeans]
  else if (/\b(bbq|barbecue|burgers?|sliders?|hot dogs?|pulled pork)\b/.test(h)) options = [SIDES.cornCob, SIDES.slaw, extra.carrots]
  else options = [SIDES.greenBeans, SIDES.broccoli, extra.carrots, SIDES.salad, extra.corn]
  const ok = options.filter((o) => !avoid.some((w) => w.length > 2 && o.items.some((it) => it.name.toLowerCase().includes(w.toLowerCase().replace(/s$/, '')))))
  const list = ok.length ? ok : options
  return list[i % list.length]
}

/**
 * Give every dinner a starch and a vegetable. `avoid` = household dislikes/allergies (sides that use them are skipped).
 * Sides already on the dinner count (a health-need starch side stays; a vegetable is added to it if missing).
 */
export function completePlates(meals: Meal[], opts: { dietaryNeeds: string[]; avoid?: string[] }): Meal[] {
  const lowCarb = opts.dietaryNeeds.some((d) => LOW_CARB.test(d))
  const avoid = opts.avoid ?? []
  return meals.map((m, i) => {
    const main = text(m)
    const base = m.side && m.side.name ? m.side : null
    const sideText = base ? `${base.name} ${(base.items ?? []).map((x) => x.name).join(' | ')}`.toLowerCase() : ''
    const vegIn = (t: string) => (t.match(new RegExp(VEG.source, 'g')) ?? []).length
    const mainStarch = STARCH.test(main), sideStarch = !!base && STARCH.test(sideText)
    const mainVeg = vegIn(main), sideVeg = base ? vegIn(sideText) : 0
    const add: SideDef[] = []
    if (!mainVeg && !sideVeg) add.push(vegSide(m, i, avoid))
    if (!mainStarch && !sideStarch) {
      if (!lowCarb) add.push(starchSide(m, i))
      else if (mainVeg + sideVeg < 2 && !add.length) add.push(vegSide(m, i + 1, avoid))   // low-carb: a second vegetable instead
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
