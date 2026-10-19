import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeName, slugify, honestTags } from '@/lib/recipe-library'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CUISINES = ['American', 'Mexican', 'Asian', 'Mediterranean', 'Italian']
const CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages']
const DIETARY = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Keto', 'Halal']

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** Same pipeline token the photo task uses (app_kv.recipe_image_token), or SETUP_SECRET. */
async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const token = request.headers.get('x-image-token')
  if (!token || token.length < 32) return false
  const { data } = await admin().from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  return !!data?.value && (data.value as { token?: string }).token === token
}

type In = Record<string, unknown>

function clean(r: In): { row?: Record<string, unknown>; error?: string } {
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  if (!name) return { error: 'name required' }
  const cuisine = String(r.cuisine ?? '')
  if (!CUISINES.includes(cuisine)) return { error: `${name}: bad cuisine` }
  const int = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null)
  const cook = int(r.cook_time), prep = int(r.prep_time), servings = int(r.servings) ?? 4
  if (!cook || !prep) return { error: `${name}: cook_time/prep_time required` }
  const ingredients = Array.isArray(r.ingredients) ? (r.ingredients as In[]) : []
  if (ingredients.length < 3 || ingredients.some((i) => !i?.name || typeof i.quantity !== 'string' || !i.unit || !CATEGORIES.includes(String(i.category))))
    return { error: `${name}: bad ingredients` }
  const steps = Array.isArray(r.steps) ? (r.steps as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : []
  if (steps.length < 3) return { error: `${name}: steps required` }
  const tags = Array.isArray(r.tags) ? (r.tags as unknown[]).map(String) : []
  const dietary = Array.isArray(r.dietary) ? (r.dietary as unknown[]).map(String).filter((d) => DIETARY.includes(d)) : []
  const norm = normalizeName(name)
  return {
    row: {
      normalized_name: norm,
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
      cuisine,
      protein: typeof r.protein === 'string' ? r.protein : null,
      cook_time: cook,
      prep_time: prep,
      servings,
      estimated_cost: Number(r.estimated_cost) || null,
      ingredients: ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, category: i.category, searchTerm: i.searchTerm ?? i.name })),
      steps,
      tags: honestTags(tags, cook + prep),
      dietary,
      nutrition: r.nutrition && typeof r.nutrition === 'object' ? r.nutrition : null,
      source: 'generated',
      is_public: r.is_public === false ? false : true,
      times_planned: 0,
    },
  }
}

/**
 * POST { recipes: [...] } — bulk-add curated library recipes (max 200 per call).
 * Skips names already in the library. Used by the Cowork recipe-library pipeline;
 * photos are added afterwards by the image pipeline (/api/admin/recipe-image).
 */
export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const input = Array.isArray(body.recipes) ? (body.recipes as In[]) : []
  if (!input.length || input.length > 200) return NextResponse.json({ error: '1-200 recipes required' }, { status: 400 })

  const errors: string[] = []
  const byNorm = new Map<string, Record<string, unknown>>()
  for (const r of input) {
    const { row, error } = clean(r)
    if (error) errors.push(error)
    else if (row && !byNorm.has(row.normalized_name as string)) byNorm.set(row.normalized_name as string, row)
  }
  const sb = admin()
  const { data: existing } = await sb.from('recipes').select('normalized_name').in('normalized_name', Array.from(byNorm.keys()))
  const skipped = (existing ?? []).map((e) => e.normalized_name as string)
  for (const n of skipped) byNorm.delete(n)

  let inserted: string[] = []
  if (byNorm.size) {
    const { data, error } = await sb.from('recipes').insert(Array.from(byNorm.values())).select('name')
    if (error) return NextResponse.json({ error: error.message, errors }, { status: 500 })
    inserted = (data ?? []).map((d) => d.name as string)
  }
  return NextResponse.json({ ok: true, inserted: inserted.length, skipped: skipped.length, errors })
}

/** GET — library size, for progress checks. */
export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { count } = await admin().from('recipes').select('id', { count: 'exact', head: true }).eq('is_public', true)
  return NextResponse.json({ publicRecipes: count ?? 0 })
}
