import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { readTapCode } from '@/lib/tap-vote'
import { attachLibraryImages } from '@/lib/library-images'
import { isSundayDinner } from '@/lib/settings'
import { timeLabel } from '@/lib/plan'
import { latestPlan, type VoteRound } from '@/lib/texting'
import type { Meal } from '@/types'
import TapVote from './TapVote'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pick your dinners · DinnerDrop', robots: { index: false, follow: false } }

const expired = (again?: boolean) => (
  <main className="min-h-screen flex items-center justify-center px-6 text-center"><p className="text-muted-foreground">This link has expired. Reply to the DinnerDrop text with the numbers {again ? 'to bring back' : 'you want'} instead.</p></main>
)

export default async function TapVotePage({ params }: { params: { code: string } }) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tc = await readTapCode(admin, params.code)
  if (!tc) return expired()
  const { data: m } = await admin.from('household_members').select('id, name').eq('id', tc.memberId).maybeSingle()
  if (!m) return expired(tc.mode === 'again')
  const first = String(m.name ?? '').trim().split(/\s+/)[0]
  const name = /^\d+$/.test(first) ? '' : first

  // ── "Which dinners should come back?" (mode 'again') ──
  if (tc.mode === 'again') {
    const plan = await latestPlan(admin, tc.ownerId!)
    const base: Meal[] = tc.meals!.map((n) => plan?.meals.find((x) => x.name === n) ?? ({ name: n } as Meal))
    const meals = await attachLibraryImages(admin, base)
    const { data: mine } = await admin.from('meal_votes').select('meal_name').eq('member_id', m.id).eq('week_start', tc.weekStart!).eq('vote', 'again')
    const chosen = new Set((mine ?? []).map((v) => v.meal_name))
    const { data: favRows } = await admin.from('favorites').select('meal_name').eq('user_id', tc.ownerId!).limit(500)
    const hearted = Array.from(new Set((favRows ?? []).map((f) => f.meal_name as string)))
    const dinners = meals.map((x, i) => ({ n: i + 1, name: x.name, image: x.imageUrl ?? null, time: x.cookTime ? timeLabel(x) : '', sunday: false, picked: !tc.test && chosen.has(x.name) }))
    return <TapVote mode="again" code={params.code} name={name} week="" dinners={dinners} favorites={[]} hearted={hearted} needed={0} closed={false} test={!!tc.test} />
  }

  // ── Weekly vote ──
  const { data: round } = await admin.from('vote_rounds').select('*').eq('id', tc.roundId!).maybeSingle()
  if (!round) return expired()
  const r = round as VoteRound
  const meals = await attachLibraryImages(admin, r.candidates)
  const { data: mine } = await admin.from('meal_votes').select('meal_name').eq('member_id', m.id).eq('week_start', r.week_start).eq('vote', 'keep')
  const chosen = new Set((mine ?? []).map((v) => v.meal_name))
  // The family's saved favorites, for "add a family favorite to this week's vote" and the ♥ on each card.
  const { data: favRows } = await admin.from('favorites').select('meal_name, meal_data').eq('user_id', r.user_id).order('created_at', { ascending: false }).limit(200)
  const inVote = new Set(r.candidates.map((c) => c.name))
  const favList = (favRows ?? []) as Array<{ meal_name: string; meal_data: { imageUrl?: string } | null }>
  const favorites = favList.filter((f) => !inVote.has(f.meal_name)).slice(0, 60).map((f) => ({ name: f.meal_name, image: f.meal_data?.imageUrl ?? null }))
  const hearted = Array.from(new Set(favList.map((f) => f.meal_name)))
  const dinners = meals.map((x, i) => ({ n: i + 1, name: x.name, image: x.imageUrl ?? null, time: x.cookTime ? timeLabel(x) : '', sunday: isSundayDinner(x), picked: chosen.has(x.name) }))
  return (
    <TapVote mode="vote" code={params.code} name={name} week={r.week_start.slice(5).replace('-', '/')}
      dinners={dinners} favorites={favorites} hearted={hearted} needed={Math.max(r.picks_needed, 1)} closed={r.status !== 'open' && !tc.test} test={!!tc.test} />
  )
}
