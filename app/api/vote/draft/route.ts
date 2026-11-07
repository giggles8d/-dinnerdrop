import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getDraft } from '@/lib/family-ask'
import { editDraftRound, openRound, startVoteCycle } from '@/lib/texting'
import type { Meal } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The person in charge reviews the vote before the family gets it (Settings → "Let me check the vote first").
 *  GET  → { draft: { candidates, picksNeeded, sendAt } | null, favorites: [{ name, meal }] }
 *  POST { action: 'drop' | 'swap' | 'add' | 'send', n?, dish?, favorite? }
 */
async function ctx() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('id, household_id').eq('id', user.id).single()
  if (!profile?.household_id) return null
  const draft = await getDraft(admin, profile.household_id)
  const round = draft ? await openRound(admin, profile.household_id) : null
  return { admin, profile, draft: draft && round && round.id === draft.roundId ? draft : null, round: draft && round && round.id === draft.roundId ? round : null }
}

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ draft: null, favorites: [] })
  const { data: favs } = await c.admin.from('favorites').select('meal_name, meal_data').eq('user_id', c.profile.id).order('created_at', { ascending: false }).limit(60)
  return NextResponse.json({
    draft: c.round ? { candidates: c.round.candidates, picksNeeded: c.round.picks_needed, sendAt: c.draft!.sendAt, weekStart: c.round.week_start } : null,
    favorites: (favs ?? []).map((f) => ({ name: f.meal_name as string, meal: f.meal_data as Meal })),
  })
}

export async function POST(req: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  if (!c.round) return NextResponse.json({ error: 'There\'s no vote waiting for review. It may have already gone out.' }, { status: 400 })
  const b = await req.json().catch(() => ({})) as { action?: string; n?: number; dish?: string; favorite?: string }
  if (b.action === 'send') {
    const r = await startVoteCycle(c.admin, c.profile.id, { sendDraft: true })
    return NextResponse.json({ ok: true, sent: r.voteTextsSent })
  }
  let meal: Meal | undefined
  if (b.favorite) {
    const { data: f } = await c.admin.from('favorites').select('meal_data').eq('user_id', c.profile.id).eq('meal_name', b.favorite).limit(1)
    meal = f?.[0]?.meal_data as Meal | undefined
    if (!meal) return NextResponse.json({ error: 'That favorite wasn\'t found.' }, { status: 404 })
  }
  const dish = String(b.dish ?? '').trim().slice(0, 80) || undefined
  const n = Number(b.n) || 0
  const r = b.action === 'drop' ? await editDraftRound(c.admin, c.profile.id, c.round, { kind: 'drop', n })
    : b.action === 'swap' ? await editDraftRound(c.admin, c.profile.id, c.round, { kind: 'swap', n, dish, meal })
    : b.action === 'add' ? await editDraftRound(c.admin, c.profile.id, c.round, { kind: 'add', dish, meal })
    : { error: 'Unknown action' }
  if (r.error || !r.round) return NextResponse.json({ error: r.error ?? 'That didn\'t work.' }, { status: 400 })
  return NextResponse.json({ ok: true, candidates: r.round.candidates, name: r.name })
}
