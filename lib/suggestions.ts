// Family dinner ideas texted in ("how about tacos") → real candidates in the next vote.
// An idea is matched to a library recipe first; the AI writes one only when nothing fits.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'
import { allergyConflicts } from '@/lib/allergens'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { ensurePortions } from '@/lib/portions'
import { mergeSettings } from '@/lib/settings'
import { normalizeName, recipeToMeal, upsertRecipes, type RecipeRow } from '@/lib/recipe-library'

export interface Suggestion { name: string; by: string; at: string; usedAt?: string }

interface OwnerLite {
  id: string
  household_id: string | null
  settings: unknown
  family_size?: number | null
  weekly_budget?: string | null
  max_cook_time?: number | null
  cuisine_preference?: string | null
  dietary_needs?: string[] | null
}

/** Ideas waiting for a vote (not yet used), oldest first. */
export function pendingSuggestions(settings: unknown): Suggestion[] {
  const all = (((settings as Record<string, unknown> | null)?.suggestions) as Suggestion[] | undefined) ?? []
  return all.filter((s) => s && typeof s.name === 'string' && !s.usedAt).sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
}

/** Mark ideas as used (they stay on the list, greyed, for a while). */
export async function markSuggestionsUsed(admin: SupabaseClient, owner: OwnerLite, names: string[]): Promise<void> {
  const all = (((owner.settings as Record<string, unknown> | null)?.suggestions) as Suggestion[] | undefined) ?? []
  const now = new Date().toISOString()
  const set = new Set(names.map(normalizeName))
  const next = all.map((s) => (set.has(normalizeName(s.name)) && !s.usedAt ? { ...s, usedAt: now } : s))
    // keep the list short: drop used ideas older than 30 days
    .filter((s) => !s.usedAt || Date.now() - new Date(s.usedAt).getTime() < 30 * 86400000)
  await admin.from('profiles').update({ settings: { ...((owner.settings as object) ?? {}), suggestions: next } }).eq('id', owner.id)
}

async function householdRules(admin: SupabaseClient, owner: OwnerLite) {
  const settings = mergeSettings(owner.settings)
  const hard = [...settings.food.neverIngredients, ...settings.food.avoidProteins]
  const people: Array<{ name: string; allergies: string[] }> = []
  const freeDiets = ((owner.dietary_needs ?? []) as string[]).filter((d) => /-free$/i.test(d.trim())).map((d) => d.replace(/-free$/i, '').trim())
  if (freeDiets.length) people.push({ name: '', allergies: freeDiets })
  let memberLines = ''
  if (owner.household_id) {
    const { data: members } = await admin.from('household_members').select('name, role, likes, dislikes, allergies, safe_foods').eq('household_id', owner.household_id)
    for (const m of members ?? []) {
      hard.push(...(m.allergies ?? []))
      if (m.allergies?.length) people.push({ name: m.name, allergies: m.allergies })
      const bits: string[] = []
      if (m.dislikes?.length) bits.push(`won't eat ${m.dislikes.join(', ')}`)
      if (bits.length) memberLines += `- ${m.name}: ${bits.join('; ')}\n`
    }
  }
  const unsafe = (m: Meal | undefined) => !m || allergyConflicts(m.ingredients ?? [], people, m.name).length > 0
    || hard.some((w) => w && `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase().includes(w.toLowerCase()))
  return { settings, hard: Array.from(new Set(hard)), memberLines, unsafe }
}

/** Library recipes whose name contains the idea's key words, best-liked first. */
async function libraryMatches(admin: SupabaseClient, idea: string, maxCookTime: number): Promise<RecipeRow[]> {
  const words = normalizeName(idea).split(' ').filter((w) => w.length > 2 && !/^(night|dinner|some|the|and|with|for|a|an)$/.test(w))
  if (!words.length) return []
  const { data } = await admin.from('recipes').select('*').eq('is_public', true).lte('cook_time', Math.max(maxCookTime, 30))
    .ilike('name', `%${words[0].replace(/s$/, '')}%`).order('kept_count', { ascending: false }).limit(40)
  const rows = ((data ?? []) as RecipeRow[]).filter((r) => words.every((w) => r.normalized_name.includes(w.replace(/s$/, ''))))
  return rows.length ? rows : ((data ?? []) as RecipeRow[]).slice(0, 10)
}

/**
 * Turn one idea into a Meal for the vote: a library match if there is one the family can eat,
 * otherwise a fresh recipe written around the idea (and stored in the library). Null if nothing safe fits.
 */
export async function resolveSuggestion(admin: SupabaseClient, owner: OwnerLite, s: Suggestion, excludeNames: string[]): Promise<Meal | null> {
  const { settings, hard, memberLines, unsafe } = await householdRules(admin, owner)
  const maxCook = Number(owner.max_cook_time) || 45
  const exclude = new Set(excludeNames.map(normalizeName))
  const tag = (m: Meal): Meal => ({ ...m, ideaBy: s.by, fromLibrary: m.fromLibrary ?? false })
  try {
    for (const r of await libraryMatches(admin, s.name, maxCook)) {
      if (exclude.has(r.normalized_name)) continue
      const m = recipeToMeal(r, '', Number(owner.family_size) || 4)
      if (!unsafe(m)) return tag({ ...m, fromLibrary: true, recipeId: r.id })
    }
  } catch { /* fall through to AI */ }
  const prompt = `You are DinnerDrop's meal planner. A family member suggested a dinner idea for the week: "${s.name}". Write ONE weeknight dinner recipe that delivers that idea.

Family:
- ${Number(owner.family_size) || 4} people, weekly grocery budget ${owner.weekly_budget || '$150'}, max ${maxCook} minutes
- Cuisine preference: ${owner.cuisine_preference || 'mixed'}; dietary needs: ${(owner.dietary_needs ?? []).join(', ') || 'none'}
${hard.length ? `- NEVER use: ${hard.join(', ')}` : ''}
- Spice: ${settings.food.spice}
${memberLines ? `Who's eating:\n${memberLines}` : ''}
Rules: maximum 10 ingredients with shoppable quantities and a searchTerm matching a grocery product name; a tired parent can cook it on a weeknight; the name should make the idea obvious (e.g. "Taco Night: Ground Beef Tacos with Fixings").

Return ONLY JSON, no markdown:
{"meal":{"day":"","name":"string","cookTime":25,"prepTime":10,"servings":${Number(owner.family_size) || 4},"estimatedCost":18.5,"ingredients":[{"name":"string","quantity":"1","unit":"lb","category":"Meat & Seafood","searchTerm":"ground beef"}],"steps":["Step 1","Step 2"]}}`
  try {
    let data = parseClaudeJSON<{ meal: Meal }>(await generateWithClaude(prompt, 1800))
    if (unsafe(data.meal)) data = parseClaudeJSON<{ meal: Meal }>(await generateWithClaude(`${prompt}\n\nIMPORTANT: your last answer broke the family's allergy or never-use rules. Use none of those ingredients or anything containing them.`, 1800))
    if (unsafe(data.meal)) return null
    const meal = ensurePortions({ ...data.meal, servings: Number(data.meal.servings) || Number(owner.family_size) || 4 })
    try {
      const [stored] = await upsertRecipes(admin, [meal], { userId: owner.id, dietary: owner.dietary_needs ?? [] })
      if (stored) return tag({ ...meal, recipeId: stored.recipeId ?? meal.recipeId, imageUrl: stored.imageUrl ?? meal.imageUrl })
    } catch { /* unstored is fine */ }
    return tag(meal)
  } catch { return null }
}
