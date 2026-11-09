import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readTapCode } from '@/lib/tap-vote'
import { latestPlan, type VoteRound } from '@/lib/texting'

export const dynamic = 'force-dynamic'

/**
 * POST { picks: number[], favorites?: string[] } — a tap-to-vote submission (lib/tap-vote). picks are 1-based like texted
 * numbers, as many as they like (Rich, Nov 8). favorites = family-favorite dinners they want in this week's vote: each is
 * added to the round's ideas (at the end, so nobody's numbers change) and counts as their pick.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tc = await readTapCode(admin, params.code)
  if (!tc) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as { picks?: unknown; favorites?: unknown }
  const favNames = Array.isArray(body.favorites) ? Array.from(new Set(body.favorites.map((x) => String(x).slice(0, 120)))).slice(0, 10) : []
  const picks = Array.isArray(body.picks) ? Array.from(new Set(body.picks.map(Number).filter((n) => Number.isInteger(n) && n > 0))) : []

  // "Which dinners should come back?" (Thursday text, mode 'again'): taps = 'again' votes, exactly like "again 1 3". None = NONE.
  if (tc.mode === 'again') {
    const { data: am } = await admin.from('household_members').select('id, household_id, can_vote').eq('id', tc.memberId).maybeSingle()
    if (!am) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })
    const againNames = picks.map((n) => tc.meals![n - 1]).filter((x): x is string => !!x)
    if (tc.test) return NextResponse.json({ ok: true, test: true, names: againNames })
    if (am.can_vote === false) return NextResponse.json({ error: 'Voting is turned off for you.' }, { status: 403 })
    const weekStart = (await latestPlan(admin, tc.ownerId!))?.week_start ?? tc.weekStart!
    await admin.from('meal_votes').delete().eq('member_id', am.id).eq('week_start', weekStart).eq('vote', 'again')
    if (againNames.length) await admin.from('meal_votes').insert(againNames.map((meal_name) => ({ household_id: am.household_id, member_id: am.id, week_start: weekStart, meal_name, vote: 'again' })))
    await admin.from('sms_messages').insert({ household_id: am.household_id, member_id: am.id, direction: 'in', from_number: null, body: `[tapped on the web] ${againNames.length ? `again ${picks.join(' ')}` : 'none to bring back'}`, intent: 'again', twilio_sid: null })
    return NextResponse.json({ ok: true, names: againNames })
  }
  const [{ data: round }, { data: m }] = await Promise.all([
    admin.from('vote_rounds').select('*').eq('id', tc.roundId!).maybeSingle(),
    admin.from('household_members').select('id, household_id, name, can_vote').eq('id', tc.memberId).maybeSingle(),
  ])
  if (!round || !m) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })
  const r = round as VoteRound
  const names = picks.map((n) => r.candidates[n - 1]?.name).filter((x): x is string => !!x)
  // Family favorites they added: only the planner's saved favorites count.
  let added: Array<{ meal_name: string; meal_data: Record<string, unknown> | null }> = []
  if (favNames.length) {
    const { data: favs } = await admin.from('favorites').select('meal_name, meal_data').eq('user_id', r.user_id).in('meal_name', favNames)
    added = (favs ?? []) as typeof added
  }
  for (const f of added) if (!names.includes(f.meal_name)) names.push(f.meal_name)
  if (!names.length) return NextResponse.json({ error: 'Tap at least one dinner.' }, { status: 400 })
  if (tc.test) return NextResponse.json({ ok: true, test: true, names })
  if (r.status !== 'open') return NextResponse.json({ error: 'Voting for this week has closed.' }, { status: 409 })
  if (m.can_vote === false) return NextResponse.json({ error: 'Voting is turned off for you.' }, { status: 403 })
  const newIdeas = added.filter((f) => !r.candidates.some((c) => c.name === f.meal_name))
  if (newIdeas.length) {
    const candidates = [...r.candidates, ...newIdeas.map((f) => ({ ...(f.meal_data ?? {}), name: f.meal_name, familyRecipe: true, ideaBy: m.name || undefined }))]
    await admin.from('vote_rounds').update({ candidates }).eq('id', r.id)
  }
  await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', r.week_start).eq('vote', 'keep')
  await admin.from('meal_votes').insert(names.map((meal_name) => ({ household_id: m.household_id, member_id: m.id, week_start: r.week_start, meal_name, vote: 'keep' })))
  // Logged like a texted answer so the round closes the same way once everyone has voted.
  await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'in', from_number: null, body: `[tapped on the web] ${picks.join(', ')}${added.length ? ` + favorites: ${added.map((f) => f.meal_name).join(', ')}` : ''}`, intent: 'pick', twilio_sid: null })
  return NextResponse.json({ ok: true, names })
}
