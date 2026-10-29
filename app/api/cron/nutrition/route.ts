import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fillRecipeNutrition } from '@/lib/nutrition'
import { retagLibraryDiets } from '@/lib/diets'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Started by the daily cron (its own function and time budget): fills carbs, fat, fiber, sugar and sodium
// for library recipes that only have calories + protein. A no-op once the library is filled, apart from new recipes.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const report = await fillRecipeNutrition(admin, { budgetMs: 240000 })
  // Diet tags (Pescatarian, Low-carb, Paleo, Nut-free, Kosher-style, Low-sodium) follow from ingredients + nutrition.
  let diets: unknown
  try { diets = await retagLibraryDiets(admin) } catch (e) { diets = { error: String(e) } }
  await admin.from('app_kv').upsert({ key: 'nutrition_fill_last', value: { at: new Date().toISOString(), ...report, diets }, updated_at: new Date().toISOString() })
  return NextResponse.json({ ...report, diets })
}
