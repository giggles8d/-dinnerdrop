import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import type { Meal } from '@/types'
import { createClient } from '@supabase/supabase-js'
import { matchToLibrary } from '@/lib/import-match'

/**
 * "Bring your favorites" (2026-10-18): the user types or pastes the names of
 * dinners they already love (from Mealime, a notebook, anywhere). Claude rebuilds
 * each one as a full DinnerDrop recipe for their family size and saves it to
 * favorites, so the planner can rotate them in. Max 15 names per call.
 * Library first (Sarah, Nov 15 2026): names that match a DinnerDrop recipe (core dinners preferred) come in as
 * that recipe; only the rest are written by Claude.
 */

export const maxDuration = 60

const MAX_NAMES = 15

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const rawNames: unknown = body?.names
    const names = (Array.isArray(rawNames) ? rawNames : String(rawNames ?? '').split(/\r?\n|,|;/))
      .map((n) => String(n).replace(/^[\s\-•\d.)]+/, '').trim())
      .filter((n) => n.length > 1 && n.length < 120)
      .slice(0, MAX_NAMES)
    if (names.length === 0) return NextResponse.json({ error: 'No recipe names given' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_size, dietary_needs, max_cook_time')
      .eq('id', user.id)
      .single()
    const familySize = Number(profile?.family_size) > 0 ? Number(profile?.family_size) : 4
    const dietary: string[] = Array.isArray(profile?.dietary_needs) ? profile!.dietary_needs : []

    // Skip names already in favorites (case-insensitive).
    const { data: existing } = await supabase.from('favorites').select('meal_name').eq('user_id', user.id)
    const have = new Set((existing || []).map((f) => String(f.meal_name).toLowerCase()))
    const todo = names.filter((n) => !have.has(n.toLowerCase()))
    if (todo.length === 0) return NextResponse.json({ imported: 0, skipped: names.length, meals: [] })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const lib = await matchToLibrary(admin, todo, familySize).catch((e) => { console.error('[import-favorites] match', e); return { matched: [], unmatched: todo } })
    const libRows = lib.matched.filter((m) => !have.has(m.meal.name.toLowerCase())).map((m) => ({ user_id: user.id, meal_name: m.meal.name, meal_data: m.meal }))
    if (libRows.length) {
      const { error } = await supabase.from('favorites').insert(libRows)
      if (error) return NextResponse.json({ error: 'Could not save favorites', detail: error.message }, { status: 500 })
    }
    const fromLibrary = lib.matched.map((m) => ({ asked: m.asked, name: m.meal.name }))
    if (lib.unmatched.length === 0) {
      return NextResponse.json({ imported: libRows.length, skipped: names.length - todo.length, meals: libRows.map((r) => r.meal_name), fromLibrary })
    }
    const rebuild = lib.unmatched

    const prompt = `You are a recipe writer for DinnerDrop, a weeknight family dinner planner.
A family wants these dinners in their rotation. Write each one as a complete, practical weeknight recipe for ${familySize} people.
${dietary.length ? `STRICT dietary requirements for every recipe: ${dietary.join(', ')}.` : ''}

Dinners to write (keep each name as given, fix only obvious typos):
${rebuild.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Rules:
- Realistic prep and cook times for a home kitchen; total under 45 minutes where the dish allows
- Shoppable quantities: whole counts for produce ("2 lemons"), fractions no finer than 1/4 for weights ("1 1/2 lb"), singular units ("lb", "cup", "clove")
- 5-10 ingredients, 3-6 clear steps
- estimatedCost in US dollars for the whole recipe at typical grocery prices
- category must be one of: Produce, Meat & Seafood, Dairy & Eggs, Pantry & Dry Goods, Frozen, Bakery, Beverages

Return ONLY valid JSON, no markdown:
{
  "meals": [
    {
      "day": "1",
      "name": "string",
      "cuisine": "Italian",
      "protein": "chicken",
      "cookTime": 25,
      "prepTime": 10,
      "servings": ${familySize},
      "estimatedCost": 18.50,
      "ingredients": [
        { "name": "string", "quantity": "1 1/2", "unit": "lb", "category": "Meat & Seafood", "searchTerm": "chicken breast" }
      ],
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}`

    const text = await generateWithClaude(prompt, 8000)
    const parsed = parseClaudeJSON<{ meals: Meal[] }>(text)
    const meals = (parsed.meals || []).filter((m) => m && m.name && Array.isArray(m.ingredients) && Array.isArray(m.steps))

    const rows = meals.map((m) => ({ user_id: user.id, meal_name: m.name, meal_data: m }))
    if (rows.length) {
      const { error } = await supabase.from('favorites').insert(rows)
      if (error) return NextResponse.json({ error: 'Could not save favorites', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ imported: libRows.length + rows.length, skipped: names.length - todo.length, meals: [...libRows.map((r) => r.meal_name), ...meals.map((m) => m.name)], fromLibrary })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[import-favorites]', message)
    return NextResponse.json({ error: 'Import failed', detail: message }, { status: 500 })
  }
}
