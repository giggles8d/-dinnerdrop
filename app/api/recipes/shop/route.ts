import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createInstacartLink } from '@/lib/instacart'
import { recipeToMeal, type RecipeRow } from '@/lib/recipe-library'
import type { GroceryItem } from '@/types'

export const dynamic = 'force-dynamic'

/** Things every kitchen has — left off a one-recipe Instacart list. */
const SKIP = /^(salt|kosher salt|sea salt|black pepper|pepper|salt and pepper|water|ice|cold water|warm water|hot water)$/i

/**
 * POST { slug, servings? } → { url }
 * "Shop ingredients" on a public recipe page (Oct 31 2026, eMeals review #1): one recipe's ingredients as an
 * Instacart shopping list, no DinnerDrop account needed. Links are cached per recipe + servings for 6 days
 * (Instacart's own advice: reuse a link until the recipe changes), and clicks are counted per recipe.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { slug?: unknown; servings?: unknown }
  const slug = typeof b.slug === 'string' ? b.slug.slice(0, 120) : ''
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: r } = await admin.from('recipes').select('*').eq('slug', slug).eq('is_public', true).maybeSingle()
  if (!r) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  const recipe = r as RecipeRow
  const stored = Number(recipe.servings) || 4
  const servings = Math.min(12, Math.max(1, Math.round(Number(b.servings) || stored)))

  // Count the click (best-effort) — the funnel view reads app_kv 'recipe_shop_clicks'.
  try {
    const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'recipe_shop_clicks').maybeSingle()
    const v = (kv?.value as { total?: number; bySlug?: Record<string, number> } | null) ?? {}
    const bySlug = { ...(v.bySlug ?? {}), [slug]: (v.bySlug?.[slug] ?? 0) + 1 }
    await admin.from('app_kv').upsert({ key: 'recipe_shop_clicks', value: { total: (v.total ?? 0) + 1, bySlug }, updated_at: new Date().toISOString() })
  } catch { /* never block the shopper on a counter */ }

  const cacheKey = `recipe_shop:${recipe.id}:${servings}`
  const { data: cached } = await admin.from('app_kv').select('value, updated_at').eq('key', cacheKey).maybeSingle()
  const fresh = cached?.updated_at && Date.now() - new Date(cached.updated_at).getTime() < 6 * 86400000
  const cachedUrl = (cached?.value as { url?: string } | null)?.url
  if (fresh && cachedUrl) return NextResponse.json({ url: cachedUrl })

  const meal = recipeToMeal(recipe, 'shop', servings)
  const items: GroceryItem[] = (meal.ingredients ?? [])
    .filter((i) => i.name && !SKIP.test(i.name.trim()))
    .map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, category: i.category, searchTerm: i.searchTerm || i.name }) as GroceryItem)
  if (!items.length) return NextResponse.json({ error: 'Nothing to shop for' }, { status: 400 })

  const { link, fallback } = await createInstacartLink(items, `${recipe.name} — ingredients`)
  if (!fallback) await admin.from('app_kv').upsert({ key: cacheKey, value: { url: link }, updated_at: new Date().toISOString() })
  return NextResponse.json({ url: link })
}
