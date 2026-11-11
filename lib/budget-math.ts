/**
 * Client-safe budget math (Sarah, Nov 10 2026, after a family's $225 Instacart cart for a week we'd shown as ~$100).
 *
 * Two gaps between "dinner cost" and what a family pays:
 * 1. Whole packages. A dinner's estimatedCost counts the share of each package the recipe uses; the grocery list
 *    buys whole packages (a 3 lb roast, a full bottle of oil). Across 76 family weeks the list cost a median 1.83× the
 *    dinner estimates, mostly pantry staples (~$55/week); without them it was 1.11×. We plan at 1.5× — common staples
 *    assumed on hand (the list's pantry check keeps them off the cart) plus package rounding.
 * 2. The store. Instacart prices + fees vs shelf prices: the family's learned factor, else 1.35 for delivery
 *    (measured orders: 1.34×, 1.44×), 1.05 in store. Store-brand savings are not counted toward the budget.
 */
export const LIST_RATIO = 1.5
export const PLANNING_DELIVERY_FACTOR = 1.35

type Stores = { priceFactor?: number; mode?: string; listRatio?: number } | null | undefined

/** What the family pays at checkout per $1 of shelf-priced grocery list (learned, else a cautious default). */
export function storeFactor(stores: Stores): number {
  const learned = Number(stores?.priceFactor)
  if (learned > 0 && learned !== 1) return learned
  return stores?.mode === 'instore' ? 1.05 : PLANNING_DELIVERY_FACTOR
}

/** Grocery list cost per $1 of dinner estimate (the family's own once learned). */
export function listRatio(stores: Stores): number {
  const r = Number(stores?.listRatio)
  return r >= 1 && r <= 4 ? r : LIST_RATIO
}

/** Dinner estimate → what the cart will likely come to at checkout. */
export function checkoutTotal(dinnerEstimate: number, stores: Stores): number {
  return dinnerEstimate * listRatio(stores) * storeFactor(stores)
}

export function budgetNumber(weeklyBudget: string | null | undefined): number {
  return Number(String(weeklyBudget ?? '').replace(/[^0-9.]/g, '')) || 0
}

/** The dinner-estimate total a week may reach so the cart stays within the budget. */
export function dinnerBudget(weeklyBudget: string | null | undefined, stores: Stores): number {
  const b = budgetNumber(weeklyBudget)
  return b > 0 ? b / (listRatio(stores) * storeFactor(stores)) : 0
}

/** About how many dinners the budget really covers: the library's budget dinners run ~$9 for 4 at shelf prices. */
export function dinnersCovered(weeklyBudget: string | null | undefined, stores: Stores, familySize: number): number {
  const per = 9 * Math.max(1, familySize || 4) / 4
  const b = dinnerBudget(weeklyBudget, stores)
  return b > 0 ? Math.floor(b / per) : 0
}

/**
 * The weekly budget choices for a family (Sarah, Nov 10 2026: "the budget drop down populates based on the number of
 * people. So a family of 5 never gets that low of an option"). A family of 5 had picked $75 and got four meatless
 * dinners and three taco nights, the only week that fit. Her next note: the first try ($125 for 5) was still too low.
 *
 * Built from real weeks (meal_plans, last 30 days, 789 weeks), at checkout prices (× 1.5 whole packages × 1.35
 * Instacart delivery):
 *   people          1    2    3    4    5    6
 *   cheaper week   $41  $85 $126 $146 $172 $196   (25th percentile)  → lowest choice
 *   typical week   $47  $97 $136 $158 $207 $237   (median)           → preselected
 * Rounded to $25. Over 6 people, +$25 a person. Other than 5 dinners: scaled by nights, rounded up to $25.
 */
const LOWEST_FOR_5: Record<number, number> = { 1: 50, 2: 100, 3: 125, 4: 150, 5: 175, 6: 200 }
const TYPICAL_FOR_5: Record<number, number> = { 1: 50, 2: 100, 3: 150, 4: 175, 5: 225, 6: 250 }
const per5 = (table: Record<number, number>, fs: number) => {
  const n = Math.max(1, Math.round(fs || 4))
  return n <= 6 ? table[n] : table[6] + 25 * (n - 6)
}
const scale = (v: number, dinners: number) => Math.max(25, Math.ceil((v * Math.max(1, dinners || 5)) / 5 / 25) * 25)

export function minWeeklyBudget(familySize: number, dinners = 5): number {
  return scale(per5(LOWEST_FOR_5, familySize), dinners)
}

export function budgetOptions(familySize: number, dinners = 5): string[] {
  const b = minWeeklyBudget(familySize, dinners)
  return [`$${b}`, `$${b + 25}`, `$${b + 50}`, `$${b + 75}`, `$${b + 125}+`]
}

/** The choice preselected for a new family: what a typical week for them costs, or the nearest choice above it. */
export function defaultBudget(familySize: number, dinners = 5): string {
  const opts = budgetOptions(familySize, dinners)
  const typical = scale(per5(TYPICAL_FOR_5, familySize), dinners)
  return opts.find((o) => budgetNumber(o) >= typical) ?? opts[opts.length - 1]
}
