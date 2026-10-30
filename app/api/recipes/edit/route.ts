import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizeName, slugify } from '@/lib/recipe-library'
import { mergeDiets } from '@/lib/diets'
import { CATEGORY_ORDER } from '@/lib/list'
import type { GroceryCategory } from '@/types'

export const dynamic = 'force-dynamic'

/** POST: a family edits a recipe they added (source 'user', created_by = them). Fields are cleaned; diet tags re-derived. */
export async function POST(request: NextRequest) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: r } = await admin.from('recipes').select('id, name, source, created_by, dietary').eq('id', id).maybeSingle()
  if (!r || r.source !== 'user' || r.created_by !== user.id) return NextResponse.json({ error: 'You can only edit recipes you added.' }, { status: 403 })

  const name = String(body.name ?? '').trim().slice(0, 120)
  if (name.length < 3) return NextResponse.json({ error: 'Give it a name.' }, { status: 400 })
  const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d }
  const ingredients = (Array.isArray(body.ingredients) ? body.ingredients : [])
    .map((i: Record<string, unknown>) => ({
      name: String(i.name ?? '').trim().slice(0, 80),
      quantity: String(i.quantity ?? '').trim().slice(0, 20),
      unit: String(i.unit ?? '').trim().slice(0, 20),
      category: (CATEGORY_ORDER.includes(i.category as GroceryCategory) ? i.category : 'Pantry & Dry Goods') as GroceryCategory,
      searchTerm: String(i.searchTerm ?? i.name ?? '').trim().slice(0, 80) || String(i.name ?? '').trim().slice(0, 80),
    }))
    .filter((i: { name: string }) => i.name)
  const steps = (Array.isArray(body.steps) ? body.steps : []).map((s: unknown) => String(s ?? '').trim().slice(0, 600)).filter(Boolean)
  if (!ingredients.length || !steps.length) return NextResponse.json({ error: 'Add at least one ingredient and one step.' }, { status: 400 })

  const patch: Record<string, unknown> = {
    name, normalized_name: normalizeName(name),
    cook_time: num(body.cookTime, 1, 720, 30), prep_time: num(body.prepTime, 0, 240, 10), servings: num(body.servings, 1, 16, 4),
    ingredients, steps,
    dietary: mergeDiets(r.dietary, { name, ingredients }),
  }
  if (name !== r.name) patch.slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`
  const { data: saved, error } = await admin.from('recipes').update(patch).eq('id', id).select('slug').single()
  if (error) return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })
  // Favorites store a copy of the dinner; keep it in step.
  await admin.from('favorites').update({ meal_name: name, meal_data: { day: 'Saved', name, cookTime: patch.cook_time, prepTime: patch.prep_time, servings: patch.servings, estimatedCost: 0, ingredients, steps, recipeId: id, fromLibrary: true } })
    .eq('user_id', user.id).eq('meal_name', r.name)
  return NextResponse.json({ ok: true, slug: saved.slug })
}
