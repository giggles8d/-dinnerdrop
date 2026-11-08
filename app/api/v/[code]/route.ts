import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readTapCode } from '@/lib/tap-vote'
import type { VoteRound } from '@/lib/texting'

export const dynamic = 'force-dynamic'

/** POST { picks: number[] } (1-based, like texted numbers) — a tap-to-vote submission (lib/tap-vote). */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tc = await readTapCode(admin, params.code)
  if (!tc) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as { picks?: unknown }
  const picks = Array.isArray(body.picks) ? Array.from(new Set(body.picks.map(Number).filter((n) => Number.isInteger(n) && n > 0))) : []
  const [{ data: round }, { data: m }] = await Promise.all([
    admin.from('vote_rounds').select('*').eq('id', tc.roundId).maybeSingle(),
    admin.from('household_members').select('id, household_id, name, can_vote').eq('id', tc.memberId).maybeSingle(),
  ])
  if (!round || !m) return NextResponse.json({ error: 'This link has expired.' }, { status: 404 })
  const r = round as VoteRound
  const names = picks.map((n) => r.candidates[n - 1]?.name).filter((x): x is string => !!x).slice(0, Math.max(r.picks_needed, 1))
  if (!names.length) return NextResponse.json({ error: 'Tap at least one dinner.' }, { status: 400 })
  if (tc.test) return NextResponse.json({ ok: true, test: true, names })
  if (r.status !== 'open') return NextResponse.json({ error: 'Voting for this week has closed.' }, { status: 409 })
  if (m.can_vote === false) return NextResponse.json({ error: 'Voting is turned off for you.' }, { status: 403 })
  await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', r.week_start).eq('vote', 'keep')
  await admin.from('meal_votes').insert(names.map((meal_name) => ({ household_id: m.household_id, member_id: m.id, week_start: r.week_start, meal_name, vote: 'keep' })))
  // Logged like a texted answer so the round closes the same way once everyone has voted.
  await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'in', from_number: null, body: `[tapped on the web] ${picks.join(', ')}`, intent: 'pick', twilio_sid: null })
  return NextResponse.json({ ok: true, names })
}
