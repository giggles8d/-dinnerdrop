import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { finalizeRound, openRound, type VoteRound } from '@/lib/texting'

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
  const [{ data: asked }, { data: answered }, { data: votes }, { data: members }] = await Promise.all([
    c.admin.from('sms_messages').select('member_id').eq('intent', `vote_request:${round.id}`),
    c.admin.from('sms_messages').select('member_id').eq('household_id', round.household_id).eq('direction', 'in').gte('created_at', round.created_at).in('intent', ['allgood', 'skip', 'none', 'pick']),
    c.admin.from('meal_votes').select('meal_name, member_id').eq('household_id', round.household_id).eq('week_start', round.week_start).eq('vote', 'keep').gte('created_at', round.created_at),
    c.admin.from('household_members').select('id, name, phone, phone_opt_in_at, phone_opted_out, can_vote').eq('household_id', round.household_id),
  ])
  const askedIds = new Set((asked ?? []).map((a) => a.member_id))
  const answeredIds = new Set((answered ?? []).map((a) => a.member_id))
  const byId = new Map((members ?? []).map((m) => [m.id, m]))
  const tally: Record<string, { votes: number; by: string[] }> = {}
  for (const cnd of round.candidates) tally[cnd.name] = { votes: 0, by: [] }
  for (const v of votes ?? []) {
    const t = tally[v.meal_name]; if (!t) continue
    t.votes++; const nm = byId.get(v.member_id)?.name; if (nm && !t.by.includes(nm)) t.by.push(nm)
  }
  const people = (members ?? []).filter((m) => m.phone).map((m) => ({
    name: m.name,
    status: m.phone_opted_out ? 'opted out' : !m.phone_opt_in_at ? 'waiting for YES' : answeredIds.has(m.id) ? 'answered' : askedIds.has(m.id) ? 'sent, waiting' : m.can_vote ? 'not sent yet' : 'no vote',
  }))
  return NextResponse.json({ round: { id: round.id, week_start: round.week_start, picks_needed: round.picks_needed, created_at: round.created_at, candidates: round.candidates.map((cnd) => ({ name: cnd.name, cookTime: cnd.cookTime, ...tally[cnd.name] })) }, people })
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
