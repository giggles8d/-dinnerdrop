import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings } from '@/lib/settings'
import { selectedStyles, styleByKey, type FoodStyle } from '@/lib/styles'

/**
 * Apply a family's food styles (several can be on at once, e.g. Keto + Slow cooker): diets, budget, cook time and
 * the settings each style presets. The previous styles' presets are removed first; everything else is kept.
 * When styles overlap, the stricter value wins (lowest calorie cap and cook time, every diet, every equipment).
 */
export async function applyStyles(supabase: SupabaseClient, userId: string, keys: string[]): Promise<void> {
  const { data: p } = await supabase.from('profiles').select('settings, dietary_needs, weekly_budget, max_cook_time').eq('id', userId).single()
  const settings = mergeSettings(p?.settings)
  const prev = selectedStyles(settings.food)
  const next = Array.from(new Set(keys)).map((k) => styleByKey(k)).filter((s): s is FoodStyle => !!s)
  const prevDiets = new Set(prev.flatMap((s) => s.diets ?? []))
  let diets = ((p?.dietary_needs as string[] | null) ?? []).filter((d) => !prevDiets.has(d))
  diets = Array.from(new Set([...diets, ...next.flatMap((s) => s.diets ?? [])]))

  const food = { ...settings.food, style: next[0]?.key ?? null, styles: next.map((s) => s.key) }
  for (const st of next) {
    const f = st.food ?? {}
    if (f.equipment) food.equipment = Array.from(new Set([...food.equipment, ...f.equipment]))
    if (f.kidFriendly) food.kidFriendly = true
  }
  const cals = next.map((s) => s.maxCalories).filter((n): n is number => !!n)
  if (cals.length) food.maxCalories = Math.min(...cals)
  else if (prev.some((s) => s.maxCalories)) food.maxCalories = 0
  const cuisines = next.flatMap((s) => s.cuisines ?? [])
  if (cuisines.length) food.cuisines = Array.from(new Set(cuisines))
  else if (prev.some((s) => s.cuisines?.length)) food.cuisines = []

  const plan = { ...settings.plan }
  const longs = next.map((s) => s.plan?.maxLongCookNights).filter((n): n is number => n != null)
  const prevLong = prev.map((s) => s.plan?.maxLongCookNights).find((n) => n != null)
  if (longs.length) plan.maxLongCookNights = Math.max(...longs)
  else if (prevLong != null && plan.maxLongCookNights === prevLong) plan.maxLongCookNights = -1

  const patch: Record<string, unknown> = { settings: { ...settings, food, plan }, dietary_needs: diets }
  const times = next.map((s) => s.maxCookTime).filter((n): n is number => !!n)
  if (times.length) patch.max_cook_time = Math.min(...times)
  const budget = next.find((s) => s.weeklyBudget)?.weeklyBudget
  if (budget) patch.weekly_budget = budget
  await supabase.from('profiles').update(patch).eq('id', userId)
}

/** One style (onboarding's single pick), or none. */
export async function applyStyle(supabase: SupabaseClient, userId: string, key: string | null): Promise<void> {
  return applyStyles(supabase, userId, key ? [key] : [])
}
