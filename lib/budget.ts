/**
 * Every week stays inside the family's budget (Sarah, Nov 10 2026: "we should hold to the budget and if it is a
 * problem then they can change their budget"). The budget is what they pay at checkout, so a week fits when its
 * dinner estimate × whole-package ratio × store factor (lib/budget-math) is within it. When it doesn't, the priciest dinners are swapped for cheaper library dinners,
 * keeping each night, and the swapped-in dinners are tagged `budgetPick` so the family sees why (and that raising
 * the budget in Settings brings back more choice).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Settings } from '@/lib/settings'
import { dinnerBudget, listRatio, storeFactor } from '@/lib/budget-math'
import type { Meal } from '@/types'
import { varietyLimits, varietyOk } from '@/lib/variety'
import { proteinGroup } from '@/lib/protein-mix'

export type BudgetMeal = Meal & { budgetPick?: boolean; suggestedNight?: string }

export { budgetNumber, LIST_RATIO, PLANNING_DELIVERY_FACTOR, checkoutTotal, dinnersCovered } from '@/lib/budget-math'

/** The factor between dinner estimates and checkout (whole packages × store prices) — lib/budget-math. */
export function planningFactor(stores: Pick<Settings, 'stores'>['stores']): number {
  return listRatio(stores) * storeFactor(stores)
}

/** The dinner-estimate total a week may reach for the cart to stay within the family's budget. */
export function shelfBudget(weeklyBudget: string | null | undefined, settings: Pick<Settings, 'stores'>): number {
  return dinnerBudget(weeklyBudget, settings.stores)
}

const cost = (m: Meal) => Number(m.estimatedCost) || 0

/** Swap the priciest dinners for cheaper ones until the week fits; swapped-in dinners carry budgetPick. */
export async function keepInBudget(admin: SupabaseClient, userId: string, meals: Meal[], weeklyBudget: string | null | undefined, settings: Pick<Settings, 'stores'>, opts: { prefer?: Meal[] } = {}): Promise<Meal[]> {
  const cap = shelfBudget(weeklyBudget, settings)
  let total = meals.reduce((s, m) => s + cost(m), 0)
  if (!cap || total <= cap) return meals
  const { libraryWeek } = await import('@/lib/first-plan')
  // Other dinners the family already liked (e.g. the next vote winners) first, then the library.
  const spares: Meal[] = (opts.prefer ?? []).filter((m) => cost(m) > 0 && !meals.some((x) => x.name === m.name))
  for (let i = 0; i < 2 && spares.length < 12; i++) {
    const more = await libraryWeek(admin, userId, [...meals, ...spares].map((m) => m.name)).catch(() => null)
    if (more && more.ok) spares.push(...more.meals.filter((m) => cost(m) > 0))
  }
  // Dinners the family voted for come before library ones, in vote order; cost only breaks ties among the rest
  // (Nov 21 2026: a 0-vote dinner replaced a voted one because it was a few dollars cheaper).
  const rank = new Map((opts.prefer ?? []).map((m, i) => [m.name, i]))
  const pr = (m: Meal) => rank.get(m.name) ?? Number.MAX_SAFE_INTEGER
  spares.sort((a, b) => pr(a) - pr(b) || cost(a) - cost(b))
  const out: BudgetMeal[] = [...meals]
  // Swaps keep the week varied and the family's proteins (Nov 10 2026: a family of 5 at $75 got four meatless
  // dinners and three taco nights). Prefer a cheaper dinner of the same protein that passes the variety rules, then
  // any cheaper one that passes them; only if none does, the cheapest one.
  const lim = varietyLimits(out.length)
  const group = (m: Meal) => proteinGroup(m.protein, m.name)
  while (total > cap && spares.length) {
    const i = out.reduce((best, m, idx) => (cost(m) > cost(out[best]) ? idx : best), 0)
    const rest = out.filter((_, j) => j !== i)
    const cheaper = spares.filter((s) => cost(s) < cost(out[i]))
    if (!cheaper.length) break
    const varied = cheaper.filter((s) => varietyOk(s, rest, lim))
    // Never break the variety rules to save money (Nov 11 2026: four soups in one week); a little over budget is better.
    const voted = varied.filter((s) => rank.has(s.name))
    const swap = voted[0] ?? varied.find((s) => group(s) === group(out[i])) ?? varied[0]
    if (!swap) break
    spares.splice(spares.indexOf(swap), 1)
    total += cost(swap) - cost(out[i])
    out[i] = { ...swap, day: out[i].day, suggestedNight: out[i].suggestedNight, budgetPick: true }
  }
  return out
}
