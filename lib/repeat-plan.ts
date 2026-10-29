/**
 * "Repeat last week" (Sarah, Oct 29 2026 — the competitor review's #1 retention idea): re-plan a
 * week the family already liked in one tap. Saves a new plan for this week with the same dinners
 * (cooked marks cleared); the grocery list rebuilds from it on the list page as usual. Client-side,
 * under the family's own RLS.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

export function mondayISO(d = new Date()): string {
  const m = new Date(d)
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return m.toISOString().split('T')[0]
}

export async function repeatPlan(supabase: SupabaseClient, userId: string, meals: Meal[]): Promise<{ meals: Meal[]; total: number } | null> {
  const fresh = meals.map(({ cookedAt: _cooked, ...m }) => m as Meal) // eslint-disable-line @typescript-eslint/no-unused-vars
  const total = fresh.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  const { error } = await supabase.from('meal_plans').insert({ user_id: userId, week_start: mondayISO(), meals: fresh, grocery_list: {}, total_estimated_cost: total })
  if (error) return null
  return { meals: fresh, total }
}

/** The most recent plan from before this week (what "last week" means on the dashboard). */
export async function lastWeekPlan(supabase: SupabaseClient, userId: string): Promise<{ week_start: string; meals: Meal[] } | null> {
  const { data } = await supabase.from('meal_plans').select('week_start, meals').eq('user_id', userId)
    .lt('week_start', mondayISO()).order('week_start', { ascending: false }).order('created_at', { ascending: false }).limit(1)
  const p = data?.[0] as { week_start: string; meals: Meal[] } | undefined
  return p && Array.isArray(p.meals) && p.meals.length ? p : null
}
