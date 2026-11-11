/**
 * Variety rules for a week (Sarah, Nov 7 2026): half of all weeks had 3+ taco-style dinners and the same few
 * recipes were going to almost every family. A week now gets at most one taco-style dinner, no more than two of
 * any other dish type or cuisine, and dinners already handed to lots of families this week are pushed down.
 * Client-safe except recentUsage (server: reads meal_plans).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

// Same as lib/recipe-library normalizeName (kept here so this file stays client-safe).
const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')

type Lite = Pick<Meal, 'name'> & { cuisine?: string | null; tags?: string[] | null }

const TYPES: Array<[string, RegExp]> = [
  ['taco', /\b(tacos?|tostadas?|fajitas?|quesadillas?|burritos?|nachos|enchiladas?|chimichangas?|flautas?|taquitos?|tortas?|tamales?|carnitas|al pastor|gorditas?|sopes?|chalupas?|tinga)\b/],
  ['pasta', /\b(pasta|spaghetti|penne|rigatoni|ziti|lasagna|fettuccine|linguine|alfredo|mac|mac and cheese|macaroni|tortellini|ravioli|gnocchi|noodle bake|carbonara|orzo)\b/],
  ['soup', /\b(soup|chili|stew|chowder|pozole|gumbo)\b/],
  ['salad', /\b(salad)\b/],
  // Burgers have their own type with the taco limit: one burger night a week (Nov 11 2026: a burger-loving family got
  // turkey burgers and black bean burgers in the same week).
  ['burger', /\b(burgers?|sliders?|sloppy joes?|patty melts?)\b/],
  ['sandwich', /\b(sandwich(es)?|melts?|wraps?|pitas?|flatbreads?|subs?|hoagies?|paninis?)\b/],
  ['bowl', /\b(bowls?|stir[- ]?fry|fried rice|lo mein)\b/],
  ['bake', /\b(casserole|bake|hotdish)\b/],
  ['pizza', /\b(pizza|calzone|stromboli)\b/],
  ['curry', /\b(curry|tikka|masala|korma)\b/],
  ['sheetpan', /\b(sheet[- ]?pan)\b/],
]

/** What kind of dish this is ("taco", "pasta", …), or null for a plain main (chicken and potatoes, pork chops). */
export function dishType(m: Lite): string | null {
  const n = m.name.toLowerCase()
  for (const [k, re] of TYPES) if (re.test(n)) return k
  return null
}

/** Cuisine, grouped so "Mexican" and "Tex-Mex" count as one. */
export function cuisineGroup(m: Lite): string | null {
  const c = (m.cuisine ?? '').toLowerCase().trim()
  if (!c || c === 'mixed' || c === 'american') return null   // everyday American dinners are the default; no cap
  if (/mex|latin|southwest/.test(c)) return 'mexican'
  if (/ital/.test(c)) return 'italian'
  if (/chin|japan|korea|thai|viet|asian/.test(c)) return 'asian'
  if (/greek|mediterr|middle east|leban|turk/.test(c)) return 'mediterranean'
  if (/ind/.test(c)) return 'indian'
  return c
}

/** Mexican-style even when the cuisine field says American: chipotle, salsa, street corn, cilantro-lime… (Nov 8 2026). */
const MEXICAN_WORDS = /\b(chipotle|salsa|street corn|elote|cilantro[- ]lime|chili[- ]lime|southwest(ern)?|tex[- ]mex|mexican|pozole|mole|adobo|ancho|jalape[nñ]o|pico de gallo|guacamole|queso|refried|enchilada|taco)\b/
export function isMexicanStyle(m: Lite): boolean {
  return dishType(m) === 'taco' || cuisineGroup(m) === 'mexican' || MEXICAN_WORDS.test(m.name.toLowerCase())
}

export interface VarietyLimits { taco: number; perType: number; perCuisine: number; mexican: number }

/** Limits scaled to how many dinners are on offer (a 10-dinner vote may carry two taco nights; a 5-dinner week one). */
export function varietyLimits(count: number): VarietyLimits {
  // Sarah, Nov 8 2026: a 5-dinner week still read as "all Mexican" with 2 Mexican-style dinners; one is the limit.
  return count > 7 ? { taco: 2, perType: 3, perCuisine: 3, mexican: 2 } : { taco: 1, perType: 2, perCuisine: 2, mexican: 1 }
}

/** Would adding `m` to `chosen` break the variety rules? */
export function varietyOk(m: Lite, chosen: Lite[], lim: VarietyLimits): boolean {
  const name = normalizeName(m.name)
  if (chosen.some((c) => normalizeName(c.name) === name)) return false
  const t = dishType(m)
  if (t) {
    const same = chosen.filter((c) => dishType(c) === t).length
    if (same >= (t === 'taco' || t === 'burger' ? lim.taco : lim.perType)) return false
  }
  const g = cuisineGroup(m)
  if (g && chosen.filter((c) => cuisineGroup(c) === g).length >= lim.perCuisine) return false
  // Mexican-style (taco-type, Mexican cuisine, or chipotle/salsa/street-corn names) has its own, tighter cap.
  if (isMexicanStyle(m) && chosen.filter(isMexicanStyle).length >= lim.mexican) return false
  return true
}

/** Pick `n` from `pool` (already in preference order) keeping to the rules; relaxes only if the pool runs dry. */
export function pickVaried<T extends Lite>(pool: T[], n: number, seed: Lite[], lim: VarietyLimits): T[] {
  const out: T[] = []
  for (const m of pool) {
    if (out.length >= n) break
    if (varietyOk(m, [...seed, ...out], lim)) out.push(m)
  }
  for (const m of pool) {
    if (out.length >= n) break
    if (!out.includes(m) && !seed.some((s) => normalizeName(s.name) === normalizeName(m.name))) out.push(m)
  }
  return out
}

// ---------- "everyone gets the same dinners": how often each recipe went out this week ----------
let usageCache: { at: number; counts: Map<string, number> } | null = null

/** normalized recipe name → number of weeks (all families) built in the last 7 days that included it. Cached 90 s. */
export async function recentUsage(supabase: SupabaseClient): Promise<Map<string, number>> {
  if (usageCache && Date.now() - usageCache.at < 90000) return usageCache.counts
  const counts = new Map<string, number>()
  try {
    const cols = Array.from({ length: 7 }, (_, i) => `n${i}:meals->${i}->>name`).join(',')
    const { data } = await supabase.from('meal_plans').select(cols).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).limit(2000)
    for (const row of (data ?? []) as unknown as Array<Record<string, string | null>>) {
      for (let i = 0; i < 7; i++) {
        const n = row[`n${i}`]
        if (n) { const k = normalizeName(n); counts.set(k, (counts.get(k) ?? 0) + 1) }
      }
    }
  } catch (e) {
    console.error('[variety] usage count failed', e)
  }
  usageCache = { at: Date.now(), counts }
  return counts
}

/** Score penalty for a recipe many families already got this week (0 … 0.9: enough to rotate, not enough to let poor fits win). */
export function overusePenalty(counts: Map<string, number>, name: string): number {
  const c = counts.get(normalizeName(name)) ?? 0
  return c <= 3 ? 0 : Math.min((c - 3) * 0.06, 0.9)
}
