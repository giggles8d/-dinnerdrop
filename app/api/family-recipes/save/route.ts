import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sanitizeMeal, saveFamilyRecipes } from '@/lib/family-recipes'

export const dynamic = 'force-dynamic'

/** POST { meals: Meal[] } — save the previewed family recipes (as approved / edited) to favorites. */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { meals?: unknown }
  const { data: profile } = await supabase.from('profiles').select('family_size').eq('id', user.id).single()
  const servings = Number(profile?.family_size) > 0 ? Number(profile?.family_size) : 4
  const meals = (Array.isArray(body.meals) ? body.meals : []).slice(0, 8).map((m) => sanitizeMeal(m, servings)).filter((m): m is NonNullable<typeof m> => !!m)
  if (!meals.length) return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })
  try {
    const r = await saveFamilyRecipes(supabase, user.id, meals)
    return NextResponse.json(r)
  } catch (e) {
    console.error('[family-recipes/save]', e)
    return NextResponse.json({ error: 'Could not save — please try again.' }, { status: 500 })
  }
}
