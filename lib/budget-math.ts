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
 * dinners and three taco nights, the only week that fit.
 *
 * The lowest choice is the smallest budget that really covers the week through Instacart delivery: the library's budget
 * dinners (~$9 for 4 at shelf prices) × whole packages × delivery prices, rounded up to $25. Then four steps up.
 *   1 person $25 · 2 $50 · 3 $75 · 4 $100 · 5 $125 · 6 $150 (5 dinners)
 */
export function minWeeklyBudget(familySize: number, dinners = 5): number {
  const perDinner = (9 * Math.max(1, familySize || 4)) / 4
  const cart = perDinner * Math.max(1, dinners || 5) * LIST_RATIO * PLANNING_DELIVERY_FACTOR
  return Math.max(25, Math.ceil(cart / 25) * 25)
}

export function budgetOptions(familySize: number, dinners = 5): string[] {
  const b = minWeeklyBudget(familySize, dinners)
  return [`$${b}`, `$${b + 25}`, `$${b + 50}`, `$${b + 100}`, `$${b + 150}+`]
}

/** The choice preselected for a new family: the middle one. */
export function defaultBudget(familySize: number, dinners = 5): string {
  return budgetOptions(familySize, dinners)[2]
}
