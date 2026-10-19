/**
 * Pantry depletion — "use what's in the house first".
 *
 *  - pantryPromptBlock(): tells the planner what's on hand and what must be used up this week
 *  - stockStaplesFromList(): after a real grocery handoff, long-life staples on that list (oils,
 *    spices, condiments, flour, rice…) are added to the pantry so next week's list doesn't re-buy them
 *  - itemsToUseSoon(): the items flagged use_soon or expiring within 7 days
 * Server-only (Supabase admin client).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeItemName } from '@/lib/list'

export interface PantryRow { id: string; name: string; quantity: string | null; unit: string | null; use_soon: boolean; expires_on: string | null; source: string; last_seen: string; created_at: string }

export async function loadPantry(db: SupabaseClient, userId: string): Promise<PantryRow[]> {
  const { data } = await db.from('pantry_items').select('id, name, quantity, unit, use_soon, expires_on, source, last_seen, created_at').eq('user_id', userId).order('use_soon', { ascending: false }).order('expires_on', { ascending: true, nullsFirst: false })
  return (data as PantryRow[]) ?? []
}

export function itemsToUseSoon(rows: PantryRow[], days = 7): PantryRow[] {
  const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
  return rows.filter((r) => r.use_soon || (r.expires_on && r.expires_on <= cutoff))
}

/** Prompt block for generate-plan. Empty string when the pantry is empty. */
export function pantryPromptBlock(rows: PantryRow[], dinners: number): string {
  if (!rows.length) return ''
  const soon = itemsToUseSoon(rows)
  const have = rows.filter((r) => !soon.includes(r)).map((r) => r.name).slice(0, 40)
  const line = (r: PantryRow) => `${r.quantity && r.unit ? `${r.quantity} ${r.unit} ` : ''}${r.name}${r.expires_on ? ` (by ${r.expires_on.slice(5)})` : ''}`
  const min = Math.min(dinners, Math.max(1, Math.ceil(soon.length / 2)), 3)
  const parts: string[] = []
  if (soon.length) parts.push(`USE UP FIRST — these are in the house and must be used this week: ${soon.map(line).join('; ')}. Build at least ${min} of the dinners around them (a dinner may use more than one). For each dinner list the pantry items it uses in "usesPantry": ["chicken thighs", ...] (empty array if none). Do NOT put these on the shopping list — list them as ingredients with the pantry quantity, the app marks them as already owned.`)
  if (have.length) parts.push(`ALREADY IN THE PANTRY (don't buy again; prefer dinners that use them): ${have.join(', ')}.`)
  return `\n${parts.join('\n')}\n`
}

// Long-life staples: bought once, used for weeks. Matched against list item names.
const STAPLE = /\b(olive oil|vegetable oil|canola oil|sesame oil|coconut oil|cooking spray|vinegar|soy sauce|fish sauce|worcestershire|hot sauce|sriracha|ketchup|mustard|mayo|mayonnaise|bbq sauce|barbecue sauce|honey|maple syrup|peanut butter|jam|jelly|flour|sugar|brown sugar|cornstarch|baking powder|baking soda|vanilla|bread ?crumbs|panko|oats|rice|quinoa|dried pasta|salt|pepper|black pepper|garlic powder|onion powder|chili powder|cumin|paprika|oregano|basil|thyme|rosemary|cinnamon|italian seasoning|taco seasoning|red pepper flakes|curry powder|bay leaves|bouillon|stock cubes|chicken broth|beef broth|vegetable broth|coconut milk|canned tomatoes|tomato paste|diced tomatoes|crushed tomatoes|tomato sauce|salsa|canned beans|black beans|kidney beans|chickpeas|lentils|tuna|parmesan)\b/i
const SHELF_DAYS: Array<[RegExp, number]> = [[/broth|coconut milk|salsa|mayo|mayonnaise|parmesan/i, 30], [/tomato|beans|chickpeas|tuna|lentils/i, 365], [/./, 180]]

/**
 * After a real handoff: add long-life staples from this week's open list to the pantry (source 'order'),
 * or refresh last_seen if already there. Returns how many were added.
 */
export async function stockStaplesFromList(db: SupabaseClient, userId: string, weekStart: string | null): Promise<number> {
  const q = db.from('list_items').select('name, quantity, unit, category').eq('user_id', userId).eq('have', false)
  const { data: rows } = weekStart ? await q.eq('week_start', weekStart) : await q
  const staples = (rows ?? []).filter((r) => STAPLE.test(r.name))
  if (!staples.length) return 0
  const existing = await loadPantry(db, userId)
  const byName = new Map(existing.map((e) => [normalizeItemName(e.name), e]))
  let added = 0
  const today = Date.now()
  for (const s of staples) {
    const key = normalizeItemName(s.name)
    const days = SHELF_DAYS.find(([re]) => re.test(s.name))![1]
    const expires = new Date(today + days * 86400000).toISOString().slice(0, 10)
    const hit = byName.get(key)
    if (hit) { await db.from('pantry_items').update({ last_seen: new Date().toISOString(), expires_on: expires, use_soon: false }).eq('id', hit.id); continue }
    const { error } = await db.from('pantry_items').insert({ user_id: userId, name: s.name, quantity: s.quantity ?? null, unit: s.unit ?? null, source: 'order', expires_on: expires, last_seen: new Date().toISOString() })
    if (!error) { added++; byName.set(key, { id: '', name: s.name } as PantryRow) }
  }
  return added
}
