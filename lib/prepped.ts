/**
 * Pre-cut shortcuts (Sarah, Nov 13 2026): "if the recipe calls for you to dice onions it will look for diced onions
 * not one onion, or if it calls for you to shred chicken breasts it will find shredded rotisserie chicken."
 *
 * When a family turns on settings.food.prepped, each dinner's ingredients are checked against its own steps (and the
 * ingredient's wording). Where the cook would chop, shred, grate, spiralize or cook something that stores sell ready
 * to use, the list asks for the ready version instead, in an amount you can buy. Costs more; the setting says so.
 * Client-safe, no AI. Used by /api/generate-list (the shopping list) and the recipe page (the "already done" note).
 */
import type { Ingredient } from '@/types'
import { parseQuantity } from '@/lib/portions'

type Swap = {
  key: string
  item: RegExp                  // the ingredient (by name)
  not?: RegExp                  // names this must not touch (already prepped, other products)
  verbs: RegExp                 // what the cook would do to it (in the ingredient name or a step)
  stepTest?: RegExp             // a stricter step check, used instead of "verb near the name"
  skipIf?: RegExp               // whole-recipe text that means the swap would change the dish
  to: (name: string) => string  // what to buy
  oz?: number                   // weight of one whole item (count units) → buy by weight
  perLb?: number                // ready weight per pound bought whole (trim loss)
  unit?: 'oz' | 'count' | 'tsp' | 'keep'
  count?: (lb: number) => number // whole items to buy for this many pounds (rotisserie chickens)
  category?: Ingredient['category']
  savesMin: number              // rough hands-on minutes saved, for the recipe note
}

const CUT = /\b(dic(e|ed|ing)|chop(ped|ping)?|mince(d)?|cub(e|ed|es))\b/

const SWAPS: Swap[] = [
  { key: 'onion', item: /\b(yellow|white|sweet|vidalia|red)?\s*onions?\b/, not: /\b(green|spring|pearl|powder|soup|french[- ]fried|crispy|fried|flakes|dried|minced dried|rings?|salt)\b/, verbs: CUT, to: (n) => /\bred\b/.test(n) ? 'diced red onion' : 'diced onion', oz: 5, unit: 'oz', savesMin: 4 },
  { key: 'pepper', item: /\b(bell|red|green|yellow|orange)\s+peppers?\b|\bbell peppers?\b/, not: /\b(flakes|roasted|jar|chili|jalape|poblano|black|ground|banana|cherry|pepperoncin)/, verbs: /\b(dic(e|ed|ing)|chop(ped|ping)?|slic(e|ed|ing)|strips?|cub(e|ed))\b/, to: () => 'pre-cut bell peppers', oz: 5, unit: 'oz', savesMin: 3 },
  { key: 'garlic', item: /\bgarlic( cloves?)?\b|\bcloves? (of )?garlic\b/, not: /\b(powder|salt|bread|granulated|jarred|minced garlic in|paste|roasted garlic hummus|butter)\b/, verbs: /\b(minc(e|ed|ing)|chop(ped|ping)?|grat(e|ed)|crush(ed)?|dic(e|ed))\b/, to: () => 'jarred minced garlic', unit: 'tsp', category: 'Pantry & Dry Goods', savesMin: 2 },
  { key: 'ginger', item: /\b(fresh )?ginger( root)?\b/, not: /\b(ground|ale|powder|paste|candied|pickled|snap)\b/, verbs: /\b(grat(e|ed|ing)|minc(e|ed)|chop(ped)?)\b/, to: () => 'ginger paste', unit: 'keep', savesMin: 2 },
  { key: 'carrot-shred', item: /\bcarrots?\b/, not: /\b(baby|shredded|matchstick|juice|cake)\b/, verbs: /\b(shred(ded|ding)?|grat(e|ed|ing)|matchstick|julienne)\b/, to: () => 'shredded carrots', oz: 3, unit: 'oz', savesMin: 4 },
  { key: 'carrot-cut', item: /\bcarrots?\b/, not: /\b(baby|shredded|matchstick|juice|cake|diced)\b/, verbs: CUT, to: () => 'diced carrots', oz: 3, unit: 'oz', savesMin: 3 },
  { key: 'celery', item: /\bcelery( stalks?| ribs?)?\b/, not: /\b(salt|seed|soup)\b/, verbs: CUT, to: () => 'diced celery', oz: 1.5, unit: 'oz', savesMin: 2 },
  { key: 'cabbage', item: /\b(green |red |napa |savoy )?cabbage\b/, not: /\b(coleslaw|slaw mix|shredded)\b/, verbs: /\b(shred(ded|ding)?|thinly slic(e|ed)|slic(e|ed)|chop(ped)?)\b/, to: (n) => /\bred\b/.test(n) ? 'shredded red cabbage' : 'coleslaw mix (shredded cabbage)', oz: 28, unit: 'oz', savesMin: 5 },
  { key: 'broccoli', item: /\bbroccoli( crowns?| heads?)?\b/, not: /\b(florets|slaw|rabe|frozen|broccolini)\b/, verbs: /\b(florets?|cut|chop(ped)?)\b/, to: () => 'broccoli florets', oz: 12, unit: 'oz', savesMin: 3 },
  { key: 'cauli-rice', item: /\bcauliflower\b/, not: /\b(riced|frozen|rice\b.*\bbag)/, verbs: /\b(rice(d)?|pulse|grat(e|ed))\b/, to: () => 'riced cauliflower', oz: 24, unit: 'oz', savesMin: 6 },
  { key: 'cauliflower', item: /\bcauliflower( head)?\b/, not: /\b(florets|riced|frozen)\b/, verbs: /\b(florets?|cut|chop(ped)?)\b/, to: () => 'cauliflower florets', oz: 24, unit: 'oz', savesMin: 4 },
  { key: 'squash', item: /\bbutternut squash\b/, not: /\b(cubed|frozen|soup|puree)\b/, verbs: /\b(cub(e|ed|es)|dic(e|ed)|peel(ed)?|chop(ped)?)\b/, to: () => 'cubed butternut squash', oz: 24, unit: 'oz', savesMin: 8 },
  { key: 'sweet-potato', item: /\bsweet potato(es)?\b/, not: /\b(fries|frozen|mash|cubed)\b/, verbs: CUT, to: () => 'diced sweet potatoes', oz: 8, unit: 'oz', savesMin: 4 },
  { key: 'potato', item: /\b(russet|yukon gold|gold|red|white)?\s*potato(es)?\b/, not: /\b(sweet|baby|fingerling|tots?|fries|hash ?browns?|chips|mashed|instant|flakes|frozen|diced)\b/, verbs: CUT, skipIf: /\bmash/, to: () => 'diced potatoes (refrigerated)', oz: 8, unit: 'oz', savesMin: 5 },
  { key: 'mushroom', item: /\b(white|cremini|baby bella|button)?\s*mushrooms?\b/, not: /\b(sliced|soup|dried|portobello caps?|canned)\b/, verbs: /\b(slic(e|ed|ing)|chop(ped)?|quarter(ed)?)\b/, to: () => 'sliced mushrooms', unit: 'keep', savesMin: 3 },
  { key: 'zoodles', item: /\bzucchini\b/, not: /\b(noodles|spiralized)\b/, verbs: /\b(spiraliz(e|ed|er)|noodles?|zoodles?)\b/, to: () => 'zucchini noodles', oz: 7, unit: 'oz', savesMin: 5 },
  { key: 'romaine', item: /\b(romaine|lettuce|iceberg)( hearts?| heads?| lettuce)?\b/, not: /\b(chopped|bagged|salad kit|shredded|leaves for wraps|cups?)\b/, verbs: /\b(chop(ped)?|shred(ded)?|slic(e|ed))\b/, to: (n) => /iceberg|shred/.test(n) ? 'shredded lettuce (bag)' : 'chopped romaine (bag)', oz: 10, unit: 'oz', savesMin: 3 },
  { key: 'pineapple', item: /\b(fresh )?pineapple\b/, not: /\b(canned|chunks|tidbits|crushed|juice|rings|frozen|can)\b/, verbs: /\b(cub(e|ed)|chunks?|dic(e|ed)|chop(ped)?|core(d)?|slic(e|ed))\b/, to: () => 'fresh pineapple chunks', oz: 32, unit: 'oz', category: 'Produce', savesMin: 6 },
  { key: 'mango', item: /\b(fresh )?mangos?(es)?\b/, not: /\b(frozen|chunks|chutney|juice|dried|salsa|nectar)\b/, verbs: /\b(dic(e|ed)|cub(e|ed)|chop(ped)?|slic(e|ed)|peel(ed)?)\b/, to: () => 'fresh mango chunks', oz: 8, unit: 'oz', savesMin: 4 },
  { key: 'green-beans', item: /\bgreen beans\b/, not: /\b(frozen|canned|can|trimmed|steam)\b/, verbs: /\btrim(med|ming)?\b|\bends?\b/, to: () => 'trimmed green beans (bag)', unit: 'keep', savesMin: 4 },
  { key: 'rotisserie', item: /\bchicken( breasts?| thighs?)?\b/, not: /\b(broth|stock|bouillon|soup|cream of|sausage|wings?|drumsticks?|tenders?|nuggets|rotisserie|ground|canned|legs?|whole|bouillon)\b/, verbs: /\b(shredded|cooked) chicken\b/, stepTest: /\bshred(ded)? (the )?(cooked )?chicken\b|\bchicken[^.;]{0,30}\bshred (it|them|with|into)\b/, skipIf: /\b(slow cooker|crock ?pot|instant pot|pressure cook|braise|simmer (the )?chicken|poach)/, to: () => 'rotisserie chicken', unit: 'count', count: (lb) => Math.max(1, Math.ceil(lb / 1.4 - 0.15)), category: 'Meat & Seafood', savesMin: 20 },
  { key: 'cheese', item: /\b(cheddar|mozzarella|monterey jack|pepper jack|colby|swiss|parmesan|gruyere|fontina|provolone)( cheese)?\b/, not: /\b(shredded|grated|sliced|slices|string|fresh mozzarella|pearls|balls?|cubes?|crumbles?|shaved)\b/, verbs: /\b(shred(ded|ding)?|grat(e|ed|ing))\b/, to: (n) => /parmesan/.test(n) ? 'grated parmesan cheese' : `shredded ${n.replace(/\b(block|blocks|of|cheese|sharp|mild|aged|wedge|chunk|\d+\s*oz|\(.*?\))\b/g, '').replace(/\s+/g, ' ').trim()} cheese`, unit: 'keep', category: 'Dairy & Eggs', savesMin: 3 },
]

const WORD = (s: string) => s.toLowerCase()

/** Does the cook do `verbs` to this ingredient? Looks at the ingredient's own wording, then at the steps near its name. */
function wouldPrep(name: string, steps: string[], s: Swap, core: string): boolean {
  if (s.verbs.test(name)) return true
  if (s.stepTest) return steps.some((st) => s.stepTest!.test(st))
  const k = core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const near = new RegExp(`(${s.verbs.source})[^.;]{0,40}\\b${k}|\\b${k}[^.;]{0,25}(${s.verbs.source})`)
  return steps.some((st) => near.test(WORD(st)))
}

// The word to look for in the steps ("onion", "bell pepper", "chicken").
const CORE: Record<string, string> = {
  onion: 'onion', pepper: 'pepper', garlic: 'garlic', ginger: 'ginger', 'carrot-shred': 'carrot', 'carrot-cut': 'carrot', celery: 'celery',
  cabbage: 'cabbage', broccoli: 'broccoli', 'cauli-rice': 'cauliflower', cauliflower: 'cauliflower', squash: 'squash', 'sweet-potato': 'sweet potato',
  potato: 'potato', mushroom: 'mushroom', zoodles: 'zucchini', romaine: 'lettuce|romaine', pineapple: 'pineapple', mango: 'mango',
  'green-beans': 'green beans', rotisserie: 'chicken', cheese: 'cheese|cheddar|mozzarella|parmesan|jack|swiss|provolone|gruyere|fontina|colby',
}

export interface PreppedSwap { from: string; to: string; savesMin: number }

function amountFor(i: Ingredient, s: Swap): { quantity: string; unit: string } {
  const q = parseQuantity(String(i.quantity ?? ''))
  const u = (i.unit || '').toLowerCase().trim()
  if (s.key === 'ginger' && !/^(tbsp|tsp|tablespoons?|teaspoons?)$/.test(u)) return { quantity: '1', unit: 'tube' }
  if (s.unit === 'keep' || q == null) return { quantity: String(i.quantity ?? ''), unit: i.unit }
  if (s.key === 'rotisserie') {
    const lb = /^(lb|lbs|pound|pounds)$/.test(u) ? q : /^(oz|ounces?)$/.test(u) ? q / 16 : /^cups?$/.test(u) ? q / 3 : q * 0.5 // count = breasts, ~8 oz each
    return { quantity: String(s.count!(lb)), unit: 'count' }
  }
  if (s.unit === 'tsp') {
    const cloves = /^(tbsp|tablespoons?)$/.test(u) ? q * 3 : /^(tsp|teaspoons?)$/.test(u) ? q * 2 : /^heads?$/.test(u) ? q * 10 : q
    return { quantity: String(Math.max(0.5, Math.round(cloves) / 2)), unit: 'tsp' }
  }
  // Whole things become a weight you can buy (a container of diced onion is 7 to 10 oz).
  let oz: number | null = null
  if (/^(lb|lbs|pounds?)$/.test(u)) oz = q * 16
  else if (/^(oz|ounces?)$/.test(u)) oz = q
  else if (/^cups?$/.test(u)) oz = q * 5
  else if (/^(heads?|count|whole|each|large|medium|small|stalks?|ribs?|crowns?|)$/.test(u) && s.oz) oz = q * (s.key === 'romaine' && /heart/i.test(i.name) ? 6 : s.oz)
  if (oz == null) return { quantity: String(i.quantity ?? ''), unit: i.unit }
  return { quantity: String(Math.max(4, Math.ceil(oz))), unit: 'oz' }
}

/**
 * One dinner's ingredients with pre-cut swaps applied. `swaps` lists what changed, for the recipe note.
 * Only ingredients the recipe actually preps are touched; a whole onion that's served in rings stays an onion.
 */
export function preppedIngredients(meal: { ingredients?: Ingredient[]; steps?: string[]; tags?: string[]; name?: string }): { ingredients: Ingredient[]; swaps: PreppedSwap[] } {
  const steps = (meal.steps ?? []).map(WORD)
  const whole = [WORD(meal.name ?? ''), ...(meal.tags ?? []).map(WORD), ...steps].join(' ')
  const swaps: PreppedSwap[] = []
  const ingredients = (meal.ingredients ?? []).map((i) => {
    const n = WORD(i.name || '')
    // Already bought prepped ("2 cups shredded cheddar", "6 slices cheddar"): leave it.
    if (/\b(shredded|grated|sliced|slices?|diced|chopped|minced|riced|spiralized)\b/.test(WORD(i.unit || ''))) return i
    for (const s of SWAPS) {
      if (!s.item.test(n) || (s.not && s.not.test(n))) continue
      if (s.skipIf && s.skipIf.test(whole)) continue
      const core = CORE[s.key]
      if (!core.split('|').some((c) => wouldPrep(n, steps, s, c))) continue
      const to = s.to(n)
      const amt = amountFor(i, s)
      swaps.push({ from: i.name, to, savesMin: s.savesMin })
      return { ...i, name: to, quantity: amt.quantity, unit: amt.unit, category: s.category ?? i.category, searchTerm: to.replace(/\s*\(.*?\)/g, '') }
    }
    return i
  })
  return { ingredients, swaps }
}

/** The note on the recipe: what's already done and roughly how much chopping it saves. */
export function preppedNote(swaps: PreppedSwap[]): string | null {
  if (!swaps.length) return null
  const mins = swaps.reduce((t, s) => t + s.savesMin, 0)
  const names = Array.from(new Set(swaps.map((s) => s.to.replace(/\s*\(.*?\)/g, ''))))
  const bird = names.includes('rotisserie chicken')
  const rest = names.filter((n) => n !== 'rotisserie chicken')
  const parts: string[] = []
  if (rest.length) parts.push(`Your list has ${rest.join(', ')}, so skip that chopping.`)
  if (bird) parts.push('Your list has a rotisserie chicken instead of raw chicken: skip cooking the chicken, shred the rotisserie meat and add it where the recipe adds the shredded chicken.')
  if (mins >= 5) parts.push(`Saves about ${mins} minutes.`)
  return parts.join(' ')
}

export const PREPPED_COST_NOTE = 'Pre-cut and ready-to-use items cost more than whole ones, usually $1 to $4 more each, often $8 to $15 more a week. They can also come in bigger packages than the recipe needs.'
