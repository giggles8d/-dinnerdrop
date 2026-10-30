import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings } from '@/lib/settings'
import { styleByKey } from '@/lib/styles'

/** Apply a food style to a family's profile: diets, budget, cook time and the settings the style presets. Keeps everything else. */
export async function applyStyle(supabase: SupabaseClient, userId: string, key: string | null): Promise<void> {
  const { data: p } = await supabase.from('profiles').select('settings, dietary_needs, weekly_budget, max_cook_time').eq('id', userId).single()
  const settings = mergeSettings(p?.settings)
  const prev = styleByKey(settings.food.style)
  const next = styleByKey(key)
  // Drop the previous style's presets, then add the new one's.
  let diets = ((p?.dietary_needs as string[] | null) ?? []).filter((d) => !(prev?.diets ?? []).includes(d))
  if (next?.diets) diets = Array.from(new Set([...diets, ...next.diets]))
  const food = { ...settings.food, style: next?.key ?? null, ...(next?.food ?? {}) }
  if (prev?.maxCalories && !next?.maxCalories) food.maxCalories = 0
  if (next?.maxCalories) food.maxCalories = next.maxCalories
  if (next?.cuisines) food.cuisines = next.cuisines
  else if (prev?.cuisines) food.cuisines = []
  const plan = { ...settings.plan, ...(next?.plan ?? {}) }
  if (prev?.plan?.maxLongCookNights != null && next?.plan?.maxLongCookNights == null) plan.maxLongCookNights = settings.plan.maxLongCookNights === prev.plan.maxLongCookNights ? -1 : settings.plan.maxLongCookNights
  const patch: Record<string, unknown> = { settings: { ...settings, food, plan }, dietary_needs: diets }
  if (next?.maxCookTime) patch.max_cook_time = next.maxCookTime
  if (next?.weeklyBudget) patch.weekly_budget = next.weeklyBudget
  await supabase.from('profiles').update(patch).eq('id', userId)
}
