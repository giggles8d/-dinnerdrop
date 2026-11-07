import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sanitizeMeal } from '@/lib/family-recipes'

export const dynamic = 'force-dynamic'

/** POST { id, meal } — save the family's edits to one of their favorites (any part of the recipe). */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { id?: string; meal?: unknown }
  const { data: row } = await supabase.from('favorites').select('id, meal_data').eq('id', String(b.id ?? '')).eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'That favorite wasn\'t found.' }, { status: 404 })
  const prev = (row.meal_data ?? {}) as Record<string, unknown>
  const clean = sanitizeMeal({ ...(b.meal as object), original: prev.original, addedBy: prev.addedBy }, 4)
  if (!clean) return NextResponse.json({ error: 'A recipe needs a name, at least one ingredient and one step.' }, { status: 400 })
  // Keep what the editor doesn't touch (photo, library link, how it was added).
  const meal = { ...prev, ...clean, familyRecipe: prev.familyRecipe ?? clean.familyRecipe, tags: (prev.tags as string[] | undefined) ?? clean.tags, imageUrl: (prev.imageUrl as string | undefined) ?? clean.imageUrl, recipeId: prev.recipeId, fromLibrary: prev.fromLibrary, estimatedCost: clean.estimatedCost || (prev.estimatedCost as number) || 0 }
  const { error } = await supabase.from('favorites').update({ meal_name: meal.name, meal_data: meal }).eq('id', row.id)
  if (error) return NextResponse.json({ error: 'Could not save — please try again.' }, { status: 500 })
  return NextResponse.json({ ok: true, meal })
}
