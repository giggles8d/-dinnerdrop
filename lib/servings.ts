import type { SupabaseClient } from '@supabase/supabase-js'
import { scaleMeal } from '@/lib/portions'
import type { Meal } from '@/types'

export const MIN_SERVINGS = 1
export const MAX_SERVINGS = 16

/** This dinner made for `servings` people. Always scales from the dinner as planned, so going 4 → 6 → 4 lands back exactly. */
export function withServings(meal: Meal, servings: number): Meal {
  const n = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(servings)))
  const base = meal.base ?? { servings: meal.servings || 4, ingredients: meal.ingredients, estimatedCost: meal.estimatedCost }
  if (n === base.servings) {
    const { base: _drop, ...rest } = meal // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, servings: n, ingredients: base.ingredients, estimatedCost: base.estimatedCost }
  }
  const scaled = scaleMeal({ ...meal, servings: base.servings, ingredients: base.ingredients, estimatedCost: base.estimatedCost }, n / base.servings)
  return { ...scaled, servings: n, base }
}

/**
 * Save a changed dinner into the family's latest plan (matched by night + name) and clear the cached grocery list
 * so it rebuilds with the new amounts. Returns false if the dinner isn't in the latest plan.
 */
export async function saveDinnerServings(supabase: SupabaseClient, userId: string, updated: Meal, original: Meal): Promise<boolean> {
  const { data: plan } = await supabase.from('meal_plans').select('id, meals').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!plan) return false
  const meals = (plan.meals as Meal[]) ?? []
  const i = meals.findIndex((m) => m.day === original.day && m.name === original.name)
  if (i < 0) return false
  const next = meals.map((m, k) => (k === i ? updated : m))
  const total = Math.round(next.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0) * 100) / 100
  const { error } = await supabase.from('meal_plans').update({ meals: next, total_estimated_cost: total, grocery_list: {} }).eq('id', plan.id)
  if (error) return false
  try { localStorage.setItem('current-meals', JSON.stringify(next)) } catch { /* ignore */ }
  return true
}
