/**
 * How to make each side, and how much to buy for the family (Sarah, Nov 12 2026: "if it adds a starch or veg are
 * they added to the instructions"). Every side in lib/sides, lib/full-plate and lib/member-needs is written for 4;
 * amounts scale with the dinner's servings, rounded to what a shopper can buy. Steps use ratios, not amounts, so
 * they stay right at any family size. Sides the planner names itself (no match here) show without steps.
 * Client-safe, no AI.
 */
import type { Ingredient } from '@/types'
import { parseQuantity, formatQuantity } from '@/lib/portions'

const STEPS: Record<string, string[]> = {
  'plain white rice': ['Rinse the rice. Bring twice as much water as rice to a boil with a pinch of salt, stir in the rice, cover and simmer on low for 18 minutes.', 'Take it off the heat, keep the lid on 5 minutes, then fluff with a fork.'],
  'steamed rice': ['Rinse the rice. Bring twice as much water as rice to a boil with a pinch of salt, stir in the rice, cover and simmer on low for 18 minutes.', 'Take it off the heat, keep the lid on 5 minutes, then fluff with a fork.'],
  'mashed potatoes': ['Peel and cut the potatoes into 2-inch chunks. Cover with cold salted water, bring to a boil and cook 15 minutes, until a fork slides in easily.', 'Drain, then mash with a pat of butter and a splash of milk. Season with salt and pepper.'],
  'roasted potatoes': ['Heat the oven to 425°F. Halve the potatoes, toss on a sheet pan with olive oil, salt and pepper.', 'Roast 25 to 30 minutes, turning once, until golden and tender.'],
  'roasted broccoli': ['Heat the oven to 425°F. Toss the broccoli on a sheet pan with olive oil, salt and pepper.', 'Roast 15 minutes, until the edges are browned.'],
  'roasted carrots': ['Heat the oven to 425°F. Toss the carrots on a sheet pan with olive oil, salt and pepper.', 'Roast 15 to 20 minutes, until tender.'],
  'garlicky green beans': ['Trim the green beans. Cook in a skillet with a splash of olive oil over medium-high heat, 6 to 8 minutes, until bright and just tender.', 'Stir in a minced garlic clove for the last minute and season with salt.'],
  'buttered corn': ['Microwave or simmer the frozen corn as the bag directs, about 5 minutes.', 'Drain and stir in a pat of butter, salt and pepper.'],
  'buttered peas': ['Microwave or simmer the frozen peas as the bag directs, about 4 minutes.', 'Drain and stir in a pat of butter and a pinch of salt.'],
  'corn on the cob': ['Bring a large pot of water to a boil. Add the shucked corn and cook 5 to 7 minutes.', 'Serve with butter and salt.'],
  'simple green salad': ['Put the greens in a bowl and toss with dressing just before serving.'],
  'quick slaw': ['Toss the coleslaw mix with the dressing. Let it sit a few minutes before serving.'],
  'cucumber salad': ['Thinly slice the cucumbers. Toss with a splash of rice vinegar, a pinch of sugar and a pinch of salt.'],
  'garlic bread': ['Bake the garlic bread as the package directs, about 10 minutes, until golden.'],
  'crusty bread': ['Warm the bread in a 350°F oven for 5 minutes, then slice.'],
  'dinner rolls': ['Warm the rolls in a 350°F oven for 5 minutes.'],
  'gluten-free dinner rolls': ['Warm the rolls in a 350°F oven for 5 minutes.'],
  'warm pita and hummus': ['Warm the pitas in a dry skillet or the oven for 1 to 2 minutes, cut into wedges and serve with the hummus.'],
  'chips and salsa': ['Put out the chips with a bowl of salsa.'],
  'fresh fruit': ['Wash and slice the fruit and put it on the table.'],
}

const NAMES = Object.keys(STEPS).sort((a, b) => b.length - a.length)

/** The sides inside a side's name, in order ("Garlicky green beans and steamed rice" → both), each with its steps. */
export function sideRecipes(side: { name?: string } | null | undefined): Array<{ name: string; steps: string[] }> {
  let rest = (side?.name ?? '').toLowerCase()
  const found: Array<{ at: number; name: string }> = []
  for (const n of NAMES) {
    const at = rest.indexOf(n)
    if (at >= 0) { found.push({ at, name: n }); rest = rest.slice(0, at) + ' '.repeat(n.length) + rest.slice(at + n.length) }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => ({ name: f.name.charAt(0).toUpperCase() + f.name.slice(1), steps: STEPS[f.name] }))
}

// Things you buy one of no matter the family size (a bottle of dressing, a jar of salsa).
const ONE_OF = /^(bottle|jar|container)s?$/i
// Whole packages: a bag of salad feeds about 4; buy another once the family is 6 or more.
const PACKS = /^(bag|package|pack|loaf|box)s?$/i

/**
 * Side amounts for this many servings, rounded to what you can buy. Only our own sides (written for 4) are scaled;
 * a side the planner wrote itself is left as written.
 */
export function scaleSideItems(side: { name?: string; items?: Ingredient[] } | null | undefined, servings: number | undefined): Ingredient[] {
  const items = side?.items
  if (!sideRecipes(side).length) return items ?? []
  const s = Number(servings) || 4
  const f = s / 4
  return (items ?? []).map((i) => {
    const q = parseQuantity(String(i.quantity ?? ''))
    if (q == null || f === 1) return i
    const u = i.unit || ''
    if (ONE_OF.test(u)) return { ...i, quantity: String(Math.max(q, s > 8 ? q * 2 : q)) }
    if (PACKS.test(u)) return { ...i, quantity: String(Math.max(1, Math.ceil(q * f - 0.34))) }
    if (!u || /^count$/i.test(u)) return { ...i, quantity: String(Math.max(1, Math.ceil(q * f))) }
    return { ...i, quantity: formatQuantity(q * f, u) }
  })
}
