import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { readTapCode } from '@/lib/tap-vote'
import { attachLibraryImages } from '@/lib/library-images'
import { isSundayDinner } from '@/lib/settings'
import { timeLabel } from '@/lib/plan'
import type { VoteRound } from '@/lib/texting'
import TapVote from './TapVote'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pick your dinners · DinnerDrop', robots: { index: false, follow: false } }

export default async function TapVotePage({ params }: { params: { code: string } }) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tc = await readTapCode(admin, params.code)
  const [{ data: round }, { data: m }] = tc ? await Promise.all([
    admin.from('vote_rounds').select('*').eq('id', tc.roundId).maybeSingle(),
    admin.from('household_members').select('id, name').eq('id', tc.memberId).maybeSingle(),
  ]) : [{ data: null }, { data: null }]
  if (!tc || !round || !m) {
    return <main className="min-h-screen flex items-center justify-center px-6 text-center"><p className="text-muted-foreground">This link has expired. Reply to the DinnerDrop text with the numbers you want instead.</p></main>
  }
  const r = round as VoteRound
  const meals = await attachLibraryImages(admin, r.candidates)
  const { data: mine } = await admin.from('meal_votes').select('meal_name').eq('member_id', m.id).eq('week_start', r.week_start).eq('vote', 'keep')
  const chosen = new Set((mine ?? []).map((v) => v.meal_name))
  const dinners = meals.map((x, i) => ({ n: i + 1, name: x.name, image: x.imageUrl ?? null, time: x.cookTime ? timeLabel(x) : '', sunday: isSundayDinner(x), picked: chosen.has(x.name) }))
  const first = String(m.name ?? '').trim().split(/\s+/)[0]
  return (
    <TapVote code={params.code} name={/^\d+$/.test(first) ? '' : first} week={r.week_start.slice(5).replace('-', '/')}
      dinners={dinners} max={Math.max(r.picks_needed, 1)} closed={r.status !== 'open' && !tc.test} test={!!tc.test} />
  )
}
