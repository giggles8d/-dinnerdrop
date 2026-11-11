import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings } from '@/lib/settings'
import { selectedStyles, styleByKey, type FoodStyle } from '@/lib/styles'

/**
 * Apply a family's food styles (several can be on at once, e.g. Keto + Slow cooker): diets, budget, cook time and
 * the settings each style presets. The previous styles' presets are removed first; everything else is kept.
 * When styles overlap, the stricter value wins (lowest calorie cap and cook time, every diet, every equipment).
 */
/**
 * Which styles win when they clash (Sarah, Nov 9 2026). Families pick up to 3, most important first.
 * 1. Health needs always apply: Diabetic-friendly, Heart-healthy, Gluten-free.
 * 2. Then the family's own order.
 * 3. Only one eating pattern is enforced (Keto, Low-carb, Paleo, Plant-based clash): the highest-ranked one.
 * 4. A cuisine style (Mediterranean) only limits the cuisine when it is their #1 pick.
 * 5. Time / budget / equipment styles combine; the strictest time and budget win (below).
 */
export const MAX_STYLES = 3
const HEALTH = ['diabetic', 'heart', 'glutenfree']
const PATTERNS = ['keto', 'lowcarb', 'paleo', 'plant']
export function rankStyles(keys: string[]): string[] {
  const uniq = Array.from(new Set(keys)).filter((k) => !!styleByKey(k))
  const health = uniq.filter((k) => HEALTH.includes(k))
  const rest = uniq.filter((k) => !HEALTH.includes(k))
  return [...health, ...rest].slice(0, Math.max(MAX_STYLES, health.length))
}
/** The diets a ranked style list turns on: every health need, plus only the first eating pattern. */
export function styleDiets(ranked: FoodStyle[]): string[] {
  const pattern = ranked.find((s) => PATTERNS.includes(s.key))
  return Array.from(new Set(ranked.filter((s) => HEALTH.includes(s.key) || s === pattern).flatMap((s) => s.diets ?? [])))
}

export async function applyStyles(supabase: SupabaseClient, userId: string, keys: string[]): Promise<void> {
  const { data: p } = await supabase.from('profiles').select('settings, dietary_needs, weekly_budget, max_cook_time').eq('id', userId).single()
  const settings = mergeSettings(p?.settings)
  const prev = selectedStyles(settings.food)
  const next = rankStyles(keys).map((k) => styleByKey(k)).filter((s): s is FoodStyle => !!s)
  const prevDiets = new Set(prev.flatMap((s) => s.diets ?? []))
  let diets = ((p?.dietary_needs as string[] | null) ?? []).filter((d) => !prevDiets.has(d))
  diets = Array.from(new Set([...diets, ...styleDiets(next)]))

  const food = { ...settings.food, style: next[0]?.key ?? null, styles: next.map((s) => s.key) }
  for (const st of next) {
    const f = st.food ?? {}
    if (f.equipment) food.equipment = Array.from(new Set([...food.equipment, ...f.equipment]))
    if (f.kidFriendly) food.kidFriendly = true
  }
  const cals = next.map((s) => s.maxCalories).filter((n): n is number => !!n)
  if (cals.length) food.maxCalories = Math.min(...cals)
  else if (prev.some((s) => s.maxCalories)) food.maxCalories = 0
  // A cuisine only limits the week when it's their top pick (after any health needs).
  const top = next.find((s) => !HEALTH.includes(s.key))
  const cuisines = top?.cuisines ?? []
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
  // The Budget style shapes the dinners (cheap proteins, under $3 a serving); it never changes the budget the family
  // picked (Nov 11 2026: it set $75 after setup saved $325 for a family of 6 cooking 8 nights).
  await supabase.from('profiles').update(patch).eq('id', userId)
}

/** One style (onboarding's single pick), or none. */
export async function applyStyle(supabase: SupabaseClient, userId: string, key: string | null): Promise<void> {
  return applyStyles(supabase, userId, key ? [key] : [])
}
