import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { readFridgePhoto, parseTypedFridge, matchLibrary, writeFromFridge, type TonightMeal } from '@/lib/fridge'
import { loadPantry } from '@/lib/pantry'
import { mergeSettings } from '@/lib/settings'
import { guessCategory, normalizeItemName } from '@/lib/list'
import { mondayOf } from '@/lib/plan'
import type { ClaudeImage } from '@/lib/claude'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * POST { imageBase64?, mediaType?, text?, usePantry? } → { items, meals }
 *   "What can I make tonight?": reads the fridge photo (or typed list), adds what's in the family's
 *   pantry if asked, and returns library dinners they can make with mostly what's there.
 * POST { action: 'add', items: string[] } → adds the missing items to this week's grocery list.
 */
export async function POST(req: Request) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await req.json().catch(() => ({}))
  const { ownerId, householdId } = await resolvePlanOwner(admin, user.id)

  if (body.action === 'add') {
    const names: string[] = (Array.isArray(body.items) ? body.items : []).filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 1).slice(0, 15)
    if (!names.length) return NextResponse.json({ added: 0 })
    const { data: plan } = await admin.from('meal_plans').select('week_start').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const weekStart = plan?.week_start ?? mondayOf(new Date())
    const { data: existing } = await admin.from('list_items').select('name').eq('user_id', ownerId).eq('week_start', weekStart).is('ordered_at', null)
    const have = new Set((existing ?? []).map((e) => normalizeItemName(e.name)))
    const rows = names.filter((n) => !have.has(normalizeItemName(n))).map((n) => ({
      user_id: ownerId, household_id: householdId, week_start: weekStart, name: n, quantity: '1', unit: null,
      category: guessCategory(n), search_term: n, source: 'manual', added_by: 'Tonight',
    }))
    if (rows.length) {
      const { error } = await admin.from('list_items').insert(rows)
      if (error) return NextResponse.json({ error: 'Could not add to the list' }, { status: 500 })
    }
    return NextResponse.json({ added: rows.length })
  }

  // ---------- what's on hand ----------
  let items: string[] = []
  try {
    if (typeof body.imageBase64 === 'string' && body.imageBase64.length > 100) {
      if (!MEDIA.includes(body.mediaType)) return NextResponse.json({ error: 'Use a JPEG or PNG photo' }, { status: 400 })
      if (body.imageBase64.length > 6_000_000) return NextResponse.json({ error: 'That photo is too large' }, { status: 413 })
      items = await readFridgePhoto({ base64: body.imageBase64, mediaType: body.mediaType as ClaudeImage['mediaType'] })
    }
  } catch (e) {
    console.error('[tonight] photo read failed', e)
    return NextResponse.json({ error: "Couldn't read that photo — try again, or type what you have." }, { status: 502 })
  }
  if (typeof body.text === 'string' && body.text.trim()) items.push(...parseTypedFridge(body.text))
  if (body.usePantry) {
    const pantry = await loadPantry(admin, ownerId).catch(() => [])
    items.push(...pantry.map((p) => p.name))
  }
  items = Array.from(new Map(items.map((i) => [normalizeItemName(i), i])).values())
  if (!items.length) return NextResponse.json({ items: [], meals: [], note: "I couldn't find any food in that. Try a closer photo, or type a few things you have." })

  // ---------- the family's rules ----------
  const { data: p } = await admin.from('profiles').select('family_size, dietary_needs, max_cook_time, settings, household_id').eq('id', ownerId).single()
  const settings = mergeSettings(p?.settings)
  let allergies: string[] = []
  let dislikes: string[] = []
  if (p?.household_id) {
    const { data: members } = await admin.from('household_members').select('allergies, dislikes').eq('household_id', p.household_id)
    allergies = Array.from(new Set((members ?? []).flatMap((m) => m.allergies ?? [])))
    dislikes = Array.from(new Set((members ?? []).flatMap((m) => m.dislikes ?? [])))
  }
  const dietary: string[] = p?.dietary_needs ?? []
  const freeDiets = dietary.filter((d) => /-free$/i.test(d)).map((d) => d.replace(/-free$/i, '').trim())
  const household = {
    familySize: p?.family_size || 4,
    dietary,
    never: [...settings.food.neverIngredients, ...settings.food.avoidProteins, ...dislikes],
    allergies: [...allergies, ...freeDiets],
    maxCookTime: p?.max_cook_time || 30,
  }

  let meals: TonightMeal[] = await matchLibrary(admin, items, household, 5)
  // Nothing close in the library: write two from what's there.
  if (meals.length < 2) {
    try { meals = [...meals, ...(await writeFromFridge(items, household, 2))] } catch (e) { console.error('[tonight] AI fallback failed', e) }
  }
  return NextResponse.json({ items, meals })
}
