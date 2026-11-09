import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readTapCode } from '@/lib/tap-vote'
import { latestPlan, type VoteRound } from '@/lib/texting'
import { attachLibraryImages } from '@/lib/library-images'
import type { Meal } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * POST { name, on } — ♥ on a tap-to-vote page (lib/tap-vote). Any family member can save a dinner to the family
 * favorites (the planner's favorites list, marked "♥ added by <name>"); the planner can remove it (Sarah, Nov 8 2026).
 * Un-hearting from the tap page only removes a favorite this same member added — never the planner's own.
 * Only dinners on that member's page can be hearted.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tc = await readTapCode(admin, params.code)
  if (!tc) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; on?: unknown }
  const name = String(body.name ?? '').slice(0, 160)
  const on = body.on !== false
  const { data: m } = await admin.from('household_members').select('id, name').eq('id', tc.memberId).maybeSingle()
  if (!m || !name) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })

  // The dinner must be on this page: the round's ideas, or the dinners in the "bring back?" text.
  let ownerId: string
  let meal: Meal | undefined
  if (tc.mode === 'again') {
    ownerId = tc.ownerId!
    if (!tc.meals!.includes(name)) return NextResponse.json({ error: 'That dinner isn’t on this page.' }, { status: 400 })
    meal = (await latestPlan(admin, ownerId))?.meals.find((x) => x.name === name) ?? ({ name } as Meal)
  } else {
    const { data: round } = await admin.from('vote_rounds').select('user_id, candidates').eq('id', tc.roundId!).maybeSingle()
    if (!round) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })
    ownerId = (round as VoteRound).user_id
    meal = (round as VoteRound).candidates.find((c) => c.name === name)
    if (!meal) return NextResponse.json({ error: 'That dinner isn’t on this page.' }, { status: 400 })
  }
  if (tc.test) return NextResponse.json({ ok: true, test: true, message: 'Test link: nothing was saved.' })

  const who = String(m.name ?? '').trim().split(/\s+/)[0] || 'Family'
  const { data: existing } = await admin.from('favorites').select('id, meal_data').eq('user_id', ownerId).eq('meal_name', name)
  if (on) {
    if (existing?.length) return NextResponse.json({ ok: true, message: `${name} is already a family favorite.` })
    const [withImage] = await attachLibraryImages(admin, [meal])
    await admin.from('favorites').insert({ user_id: ownerId, meal_name: name, meal_data: { ...withImage, name, heartedBy: who, heartedById: m.id } })
    return NextResponse.json({ ok: true })
  }
  const mine = (existing ?? []).filter((f) => (f.meal_data as { heartedById?: string } | null)?.heartedById === m.id)
  if (!mine.length) return NextResponse.json({ error: 'Only the planner can remove that one.' }, { status: 403 })
  await admin.from('favorites').delete().in('id', mine.map((f) => f.id))
  return NextResponse.json({ ok: true })
}
