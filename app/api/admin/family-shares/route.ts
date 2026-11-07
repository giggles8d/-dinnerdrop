import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizeName, slugify } from '@/lib/recipe-library'
import { mergeDiets } from '@/lib/diets'
import type { Meal } from '@/types'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * "From DinnerDrop families" (Sarah, Nov 7 2026): recipes families saved with "add to the recipe library" ticked
 * wait here for review, then go into the public library as their own pages — tagged family-favorite with the
 * family's star rating, never their name.
 *  GET  → the waiting recipes
 *  POST { favoriteId, action: 'approve' | 'reject', name? } — approve publishes it (optionally with a cleaned-up name)
 */
async function authorized(): Promise<boolean> {
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL
  } catch { return false }
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin.from('favorites').select('id, meal_name, meal_data, created_at')
    .eq('meal_data->>shareOk', 'true').is('meal_data->>libraryRecipeId', null).is('meal_data->>shareRejected', null)
    .order('created_at', { ascending: true }).limit(100)
  return NextResponse.json({ waiting: (data ?? []).map((f) => ({ id: f.id, name: f.meal_name, at: f.created_at, meal: f.meal_data })) })
}

export async function POST(req: NextRequest) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const b = await req.json().catch(() => ({})) as { favoriteId?: string; action?: string; name?: string }
  const { data: fav } = await admin.from('favorites').select('id, meal_data').eq('id', String(b.favoriteId ?? '')).maybeSingle()
  if (!fav) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const meal = fav.meal_data as Meal & { libraryRecipeId?: string; shareOk?: boolean }
  if (!meal.shareOk) return NextResponse.json({ error: 'the family did not share this one' }, { status: 400 })
  if (b.action === 'reject') {
    await admin.from('favorites').update({ meal_data: { ...meal, shareRejected: true } }).eq('id', fav.id)
    return NextResponse.json({ ok: true })
  }
  if (b.action !== 'approve') return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  if (meal.libraryRecipeId) return NextResponse.json({ ok: true, recipeId: meal.libraryRecipeId })
  const name = String(b.name || meal.name).trim().slice(0, 60)
  const rating = meal.familyRating && meal.familyRating >= 1 && meal.familyRating <= 5 ? meal.familyRating : null
  const { data: row, error } = await admin.from('recipes').insert({
    // Its own entry even when the library already has a dinner by that name: this is one family's version.
    normalized_name: `family-${fav.id.slice(0, 8)}-${normalizeName(name)}`,
    name,
    slug: `${slugify(name)}-family-${Math.random().toString(36).slice(2, 6)}`,
    cuisine: meal.cuisine ?? null,
    protein: meal.protein ?? null,
    cook_time: meal.cookTime, prep_time: meal.prepTime, servings: meal.servings,
    estimated_cost: meal.estimatedCost ?? 0,
    ingredients: meal.ingredients, steps: meal.steps,
    tags: ['family-favorite', ...(rating ? [`family-rating-${rating}`] : [])],
    dietary: mergeDiets([], { name, ingredients: meal.ingredients, nutrition: meal.nutrition }),
    image_url: meal.imageUrl ?? null,
    image_credit: meal.imageUrl ? 'DinnerDrop family' : null,
    source: 'user', created_by: null, is_public: true, times_planned: 0,
  }).select('id, slug').single()
  if (error || !row) return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
  await admin.from('favorites').update({ meal_data: { ...meal, libraryRecipeId: row.id } }).eq('id', fav.id)
  return NextResponse.json({ ok: true, recipeId: row.id, url: `https://www.dinnerdrop.app/recipes/${row.slug}` })
}
