/**
 * Store-bought shortcut versions of a dinner (Sarah, Nov 15 2026): "for the chicken parm to make it fast and easy
 * a switch is to use frozen chicken tenders". Unlike pre-cut swaps (lib/prepped), a shortcut changes the steps too.
 *
 * A dinner uses its shortcut when the family tapped "Make it faster" on it (meal.quick = true), or when Pre-cut
 * shortcuts is on in settings and they didn't switch it back (meal.quick = false). Client-safe, no AI.
 * Used by the recipe page and /api/generate-list.
 */
import type { Ingredient, Meal } from '@/types'
import { parseQuantity } from '@/lib/portions'

export interface Shortcut { key: string; label: string; detail: string; savesMin: number }

const RAW_CHICKEN = /\bchicken\b.*\b(breasts?|cutlets?|tenderloins?|thighs?)\b|\b(breasts?|cutlets?|tenderloins?)\b.*\bchicken\b/i
const NOT_RAW = /\b(rotisserie|cooked|shredded|frozen|breaded|nuggets?|tenders?|canned|broth|stock)\b/i
const CRUMBS = /\b(bread ?crumbs?|panko|cracker crumbs|cornflake)/i
const BREADING_STEP = /\b(dredge|coat|bread(ed|ing)? the|shallow (bowls?|dishes)|three (bowls?|dishes)|pound|flatten|butterfly|slice[^.]*horizontally|fry|pan-fry|sear|until golden)\b/i
const KEEP_STEP = /\b(marinara|sauce|mozzarella|cheese|pasta|spaghetti|noodles|salad|serve|toss)\b/i

function frozenTenders(meal: Meal): boolean {
  const ings = meal.ingredients ?? []
  const chicken = ings.some((i) => RAW_CHICKEN.test(i.name) && !NOT_RAW.test(i.name))
  const crumbs = ings.some((i) => CRUMBS.test(i.name))
  const breaded = (meal.steps ?? []).some((s) => /\b(dredge|coat|bread)/i.test(s) && /\b(crumbs?|panko|egg)/i.test(s))
  return chicken && crumbs && breaded
}

/** The shortcut this dinner has, if any. */
export function shortcutFor(meal: Meal): Shortcut | null {
  if (frozenTenders(meal)) return { key: 'frozen-tenders', label: 'Frozen breaded chicken tenders', detail: 'No pounding, breading or frying: bake frozen breaded chicken tenders, then finish the dinner as usual.', savesMin: 15 }
  return null
}

/** Is the shortcut in use for this dinner? `auto` = the family's Pre-cut shortcuts setting. */
export function usesShortcut(meal: Meal, auto: boolean): boolean {
  if (!shortcutFor(meal)) return false
  return meal.quick ?? auto
}

function onlyInBreading(word: RegExp, meal: Meal): boolean {
  return !(meal.steps ?? []).some((s) => word.test(s) && !BREADING_STEP.test(s) && !/\b(bowls?|dishes)\b/i.test(s))
}

/** The dinner as cooked with its shortcut (ingredients, steps and time). Unchanged when it has none or it's off. */
export function withShortcut(meal: Meal, auto: boolean): Meal {
  if (!usesShortcut(meal, auto)) return meal
  const ings = meal.ingredients ?? []
  const chicken = ings.find((i) => RAW_CHICKEN.test(i.name) && !NOT_RAW.test(i.name))!
  const lb = (() => {
    const q = parseQuantity(String(chicken.quantity ?? '')) || 1
    const u = (chicken.unit || '').toLowerCase()
    if (/^oz|ounce/.test(u)) return q / 16
    if (/^(lb|lbs|pound)/.test(u)) return q
    return q * 0.5 // count of breasts
  })()
  const flourOnly = onlyInBreading(/\bflour\b/i, meal)
  const eggOnly = onlyInBreading(/\beggs?\b/i, meal)
  const oilOnly = onlyInBreading(/\boil\b/i, meal)
  const tenders: Ingredient = { name: 'frozen breaded chicken tenders', quantity: String(Math.max(16, Math.round(lb * 16 / 4) * 4)), unit: 'oz', category: 'Frozen', searchTerm: 'frozen breaded chicken tenders' } as Ingredient
  const ingredients: Ingredient[] = []
  for (const i of ings) {
    if (i === chicken) { ingredients.push(tenders); continue }
    if (CRUMBS.test(i.name)) continue
    if (flourOnly && /\bflour\b/i.test(i.name)) continue
    if (eggOnly && /^(large )?eggs?$/i.test(i.name.trim())) continue
    if (oilOnly && /\boil\b/i.test(i.name) && !/\b(spray)\b/i.test(i.name)) continue
    ingredients.push(i)
  }
  const steps: string[] = []
  let added = false
  for (const s of meal.steps ?? []) {
    const breading = BREADING_STEP.test(s) || (/\b(flour|egg|crumbs?|panko)\b/i.test(s) && /\bchicken\b/i.test(s))
    if (breading && !KEEP_STEP.test(s)) {
      if (!added) { steps.push('Heat the oven to 400°F. Spread the frozen breaded chicken tenders on a sheet pan and bake as the package says, about 15–18 minutes, until hot and crispy.'); added = true }
      continue
    }
    steps.push(s)
  }
  if (!added) steps.unshift('Heat the oven to 400°F. Spread the frozen breaded chicken tenders on a sheet pan and bake as the package says, about 15–18 minutes, until hot and crispy.')
  return { ...meal, ingredients, steps, prepTime: Math.max(5, (meal.prepTime || 15) - 15) }
}
