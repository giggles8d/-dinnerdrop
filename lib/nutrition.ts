import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import type { Meal } from '@/types'
import { cleanNutrition, type Nutrition } from '@/lib/nutrition-shared'

export { cleanNutrition, macroSplit, hasFullNutrition, type Nutrition } from '@/lib/nutrition-shared'

type Dish = { key: string; name: string; servings: number; ingredients: Meal['ingredients']; steps?: string[] }

export function nutritionPrompt(dishes: Dish[]): string {
  return `Estimate nutrition PER SERVING for each dinner, from its ingredient amounts divided by its servings. Use standard USDA values for the raw/as-bought ingredients; count cooking oil, butter, cheese, sauces and starches. Ignore "(optional)" items and salt "to taste" (but count salty ingredients like soy sauce, broth, cheese, cured meat, canned beans, seasoning packets toward sodium).

${dishes.map((d) => `[${d.key}] ${d.name} — serves ${d.servings}
${d.ingredients.map((i) => `- ${[i.quantity, i.unit, i.name].filter(Boolean).join(' ')}`).join('\n')}`).join('\n\n')}

Return ONLY JSON, one entry per dinner, keyed by its [id]:
{"<id>":{"calories":520,"protein":34,"carbs":48,"fat":18,"satFat":6,"fiber":7,"sugar":9,"sodium":890}}
Units: calories kcal; protein, carbs, fat, satFat, fiber, sugar in grams; sodium in mg. Whole numbers.`
}

/** Estimate full nutrition for up to ~10 dishes in one call. Returns cleaned values by key (missing = couldn't estimate). */
export async function estimateNutrition(dishes: Dish[]): Promise<Record<string, Nutrition>> {
  if (!dishes.length) return {}
  const text = await generateWithClaude(nutritionPrompt(dishes), 1500)
  const raw = parseClaudeJSON<Record<string, unknown>>(text)
  const out: Record<string, Nutrition> = {}
  for (const d of dishes) { const n = cleanNutrition(raw[d.key]); if (n && n.carbs != null) out[d.key] = n }
  return out
}

/**
 * Fill full nutrition (carbs, fat, fiber, sugar, sodium…) for library recipes that only have calories + protein.
 * Time-boxed; batches of 10 recipes per model call, a few calls at a time.
 */
export async function fillRecipeNutrition(admin: SupabaseClient, opts: { budgetMs?: number; limit?: number; concurrency?: number } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 200000
  const { data, error } = await admin.from('recipes').select('id, name, servings, ingredients').filter('nutrition->>carbs', 'is', null).order('kept_count', { ascending: false }).order('times_planned', { ascending: false }).limit(opts.limit ?? 1000)
  if (error) return { error: error.message }
  const todo = (data ?? []) as Array<{ id: string; name: string; servings: number | null; ingredients: Meal['ingredients'] | null }>
  const batches: typeof todo[] = []
  for (let i = 0; i < todo.length; i += 10) batches.push(todo.slice(i, i + 10))
  let filled = 0, failed = 0, next = 0
  async function worker() {
    while (next < batches.length && Date.now() - started < budget) {
      const batch = batches[next++]
      try {
        const res = await estimateNutrition(batch.map((r, n) => ({ key: String(n + 1), name: r.name, servings: r.servings || 4, ingredients: r.ingredients ?? [] })))
        for (let n = 0; n < batch.length; n++) {
          const est = res[String(n + 1)]
          if (!est) { failed++; continue }
          const { error: e } = await admin.from('recipes').update({ nutrition: est }).eq('id', batch[n].id)
          if (e) failed++; else filled++
        }
      } catch { failed += batch.length }
    }
  }
  await Promise.all(Array.from({ length: opts.concurrency ?? 5 }, worker))
  return { candidates: todo.length, filled, failed, seconds: Math.round((Date.now() - started) / 1000) }
}
