import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { suggestSwaps, applySwap } from '@/lib/swap-to-save'

export const dynamic = 'force-dynamic'

/**
 * GET  /api/deals/swaps            → { suggestions, reason? } — "swap a dinner to save" ideas for this week
 * POST /api/deals/swaps {day, recipeId} → swaps that night's dinner for the library dinner built on sale items
 */
async function owner() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  return { admin, ownerId, userId: user.id }
}

export async function GET(req: NextRequest) {
  // Admin check (read-only): ?owner=<profile id> with the pipeline token, to preview suggestions for a family.
  const asOwner = req.nextUrl.searchParams.get('owner')
  if (asOwner) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const token = req.headers.get('x-image-token') ?? ''
    const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
    const want = typeof kv?.value === 'string' ? kv.value : (kv?.value as { token?: string } | null)?.token
    if (!want || token !== want) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json(await suggestSwaps(admin, asOwner, { max: 3 }))
  }
  const o = await owner()
  if (!o) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await suggestSwaps(o.admin, o.ownerId))
  } catch (e) {
    console.error('[deals/swaps] suggest failed', e)
    return NextResponse.json({ suggestions: [], reason: 'error' })
  }
}

export async function POST(req: NextRequest) {
  const o = await owner()
  if (!o) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { day?: string; recipeId?: string }
  if (!body.day || !body.recipeId) return NextResponse.json({ error: 'day and recipeId required' }, { status: 400 })
  const r = await applySwap(o.admin, o.ownerId, String(body.day), String(body.recipeId))
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 })
  try {
    await o.admin.from('activation_events').insert({ user_id: o.userId, step: 'swap_to_save', meta: { day: body.day, recipe_id: body.recipeId } })
  } catch { /* tracking only */ }
  return NextResponse.json({ ok: true, meal: r.meal })
}
