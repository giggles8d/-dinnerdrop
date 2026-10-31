import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { mergeSettings } from '@/lib/settings'
import { computeTastes, summarize, tasteLabel } from '@/lib/tastes'

export const dynamic = 'force-dynamic'

async function ctx() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId, householdId } = await resolvePlanOwner(admin, user.id)
  if (!householdId) return null
  const { data: owner } = await admin.from('profiles').select('settings').eq('id', ownerId).single()
  return { admin, ownerId, householdId, settings: mergeSettings(owner?.settings), rawSettings: (owner?.settings ?? {}) as Record<string, unknown> }
}

/** GET — what DinnerDrop has learned about each person from their votes. */
export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ members: [] })
  const tastes = await computeTastes(c.admin, c.householdId, c.settings.tastes.hidden)
  return NextResponse.json({
    members: tastes.map((t) => {
      const s = summarize(t)
      return {
        id: t.memberId, name: t.name, votes: t.votes,
        likes: s.likes.map((key) => ({ key, label: tasteLabel(key) })),
        skips: s.skips.map((key) => ({ key, label: tasteLabel(key) })),
      }
    }),
  })
}

/** POST { memberId, key } — stop using one learned taste for that person (the ✕ in Settings). */
export async function POST(req: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const { memberId, key } = await req.json().catch(() => ({}))
  if (typeof memberId !== 'string' || typeof key !== 'string' || !/^(protein|cuisine|dish|carb):[\w &-]{1,40}$/.test(key)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const { data: m } = await c.admin.from('household_members').select('id').eq('id', memberId).eq('household_id', c.householdId).maybeSingle()
  if (!m) return NextResponse.json({ error: 'Not in your household' }, { status: 404 })
  const hidden = { ...c.settings.tastes.hidden, [memberId]: Array.from(new Set([...(c.settings.tastes.hidden[memberId] ?? []), key])) }
  const next = { ...c.rawSettings, tastes: { ...((c.rawSettings.tastes as object) ?? {}), hidden } }
  const { error } = await c.admin.from('profiles').update({ settings: next }).eq('id', c.ownerId)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
