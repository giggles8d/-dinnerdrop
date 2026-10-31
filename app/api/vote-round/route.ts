import { timeLabel } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { finalizeRound, openRound, roundStandings, type Suggestion, type VoteRound } from '@/lib/texting'

export const dynamic = 'force-dynamic'

async function ctx() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: p } = await admin.from('profiles').select('id, household_id').eq('id', user.id).single()
  if (!p?.household_id) return null
  return { admin, userId: user.id, householdId: p.household_id as string }
}

/** GET — the household's open vote round with tallies and who has answered. */
export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ round: null })
  const round = await openRound(c.admin, c.householdId)
  if (!round) return NextResponse.json({ round: null })
  const st = await roundStandings(c.admin, round)
  const { data: owner } = await c.admin.from('profiles').select('settings').eq('id', round.user_id).maybeSingle()
  const suggestions = ((((owner?.settings as Record<string, unknown> | null)?.suggestions) as Suggestion[] | undefined) ?? []).slice(0, 8)
  const byName = new Map(st.candidates.map((x) => [x.name, x]))
  return NextResponse.json({
    round: { id: round.id, week_start: round.week_start, picks_needed: round.picks_needed, created_at: round.created_at, candidates: round.candidates.map((cnd) => { const t = byName.get(cnd.name); return { name: cnd.name, cookTime: cnd.cookTime, time: cnd.cookTime ? timeLabel(cnd) : undefined, carbs: cnd.nutrition?.carbs ?? null, inWeek: !!t?.inWeek, votes: t?.votes ?? 0, by: t?.by ?? [], skippedBy: t?.skippedBy ?? [] } }) },
    people: st.people.map((p) => ({ name: p.name, status: p.status })),
    suggestions,
  })
}

/** POST { action: 'close' } — finalize now with the votes so far. */
export async function POST(req: NextRequest) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const round = await openRound(c.admin, c.householdId)
  if (!round) return NextResponse.json({ error: 'No open vote' }, { status: 404 })
  if (body.action === 'close') {
    const { data: asked } = await c.admin.from('sms_messages').select('member_id').eq('intent', `vote_request:${round.id}`)
    const askedIds = Array.from(new Set((asked ?? []).map((a) => a.member_id).filter(Boolean))) as string[]
    await finalizeRound(c.admin, round as VoteRound, { everyone: false, askedIds })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
