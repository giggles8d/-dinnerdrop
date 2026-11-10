/**
 * Every week stays inside the family's budget (Sarah, Nov 10 2026: "we should hold to the budget and if it is a
 * problem then they can change their budget"). The budget is what they pay at checkout, so a week fits when its
 * shelf-price estimate × their price factor (Instacart prices and fees or a learned store factor, store brands —
 * lib/price-factor) is within it. When it doesn't, the priciest dinners are swapped for cheaper library dinners,
 * keeping each night, and the swapped-in dinners are tagged `budgetPick` so the family sees why (and that raising
 * the budget in Settings brings back more choice).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Settings } from '@/lib/settings'
import type { Meal } from '@/types'

export type BudgetMeal = Meal & { budgetPick?: boolean; suggestedNight?: string }

export function budgetNumber(weeklyBudget: string | null | undefined): number {
  return Number(String(weeklyBudget ?? '').replace(/[^0-9.]/g, '')) || 0
}

/**
 * The factor planning uses — on purpose more cautious than the one shown on the list (Sarah, Nov 10 2026: "we can't
 * promise something and then fail a second time"). Prices aren't pulled live from each family's store, so until a
 * family's real order total teaches us their factor, plan for Instacart at 1.35× shelf prices (our one measured order
 * ran 1.34× with fees) and don't count store-brand savings toward the budget — those are a bonus.
 */
export const PLANNING_DELIVERY_FACTOR = 1.35
export function planningFactor(stores: Pick<Settings, 'stores'>['stores']): number {
  const learned = Number(stores?.priceFactor)
  if (learned > 0 && learned !== 1) return learned
  return stores?.mode === 'instore' ? 1.05 : PLANNING_DELIVERY_FACTOR
}

/** The shelf-price total a week may reach for this family to pay no more than their budget. */
export function shelfBudget(weeklyBudget: string | null | undefined, settings: Pick<Settings, 'stores'>): number {
  const b = budgetNumber(weeklyBudget)
  return b > 0 ? b / planningFactor(settings.stores) : 0
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
  spares.sort((a, b) => cost(a) - cost(b))
  const out: BudgetMeal[] = [...meals]
  while (total > cap && spares.length) {
    const i = out.reduce((best, m, idx) => (cost(m) > cost(out[best]) ? idx : best), 0)
    if (cost(spares[0]) >= cost(out[i])) break
    const swap = spares.shift()!
    total += cost(swap) - cost(out[i])
    out[i] = { ...swap, day: out[i].day, suggestedNight: out[i].suggestedNight, budgetPick: true }
  }
  return out
}
