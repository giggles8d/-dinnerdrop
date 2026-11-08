import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings } from '@/lib/settings'
import { rebuildWeek, type AutoPlanProfile } from '@/lib/autoplan'
import { isMexicanStyle } from '@/lib/variety'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * One-shot (Sarah, Nov 7 2026): rebuild the auto-planned weeks starting `weekStart` with the new variety and
 * full-plate rules, for every family that hasn't sent that week's cart. Sarah's own account and household are skipped.
 *  POST { weekStart, limit?, apply? } → without apply: who would be rebuilt. With apply: rebuilds up to `limit`
 *  (default 25) not yet done (app_kv rebuild:<weekStart>:<userId>), returns before/after names.
 * Auth: x-image-token (pipeline token in app_kv.recipe_image_token).
 */
const SARAH = 'setzl1979@gmail.com'

async function authorized(req: NextRequest, admin: SupabaseClient): Promise<boolean> {
  const token = req.headers.get('x-image-token') ?? ''
  if (token.length < 32) return false
  const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  return (data?.value as { token?: string } | null)?.token === token
}

export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (!(await authorized(req, admin))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { weekStart?: string; limit?: number; apply?: boolean; round?: string; onlyMexican?: boolean }
  // round: a second pass gets its own done-markers; onlyMexican: only weeks with 2+ Mexican-style dinners (Nov 8 2026).
  const tag = b.round ? `${weekStart}:${String(b.round).replace(/[^a-z0-9]/gi, '')}` : weekStart
  const weekStart = String(b.weekStart ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return NextResponse.json({ error: 'weekStart YYYY-MM-DD required' }, { status: 400 })

  const { data: sarah } = await admin.from('profiles').select('id, household_id').eq('email', SARAH).maybeSingle()
  const { data: plans } = await admin.from('meal_plans').select('id, user_id, created_at, meals').eq('week_start', weekStart).order('created_at', { ascending: false })
  const latest = new Map<string, { id: string; created_at: string; meals: { name: string; cuisine?: string }[] }>()
  for (const p of plans ?? []) if (!latest.has(p.user_id as string)) latest.set(p.user_id as string, p as never)
  const ids = Array.from(latest.keys())
  const { data: carts } = ids.length ? await admin.from('grocery_handoffs').select('user_id, created_at').in('user_id', ids) : { data: [] }
  const { data: profs } = ids.length ? await admin.from('profiles').select('id, household_id, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs, settings').in('id', ids) : { data: [] }
  const byId = new Map((profs ?? []).map((p) => [p.id as string, p]))
  const { data: done } = await admin.from('app_kv').select('key').like('key', `rebuild:${tag}:%`)
  const doneSet = new Set((done ?? []).map((d) => String(d.key).split(':').pop()!))

  const eligible = ids.filter((uid) => {
    const prof = byId.get(uid)
    if (!prof) return false
    if (uid === sarah?.id || (sarah?.household_id && prof.household_id === sarah.household_id)) return false
    const plan = latest.get(uid)!
    if (b.onlyMexican && (plan.meals ?? []).filter((m) => isMexicanStyle(m as { name: string; cuisine?: string })).length < 2) return false
    return !(carts ?? []).some((c) => c.user_id === uid && String(c.created_at) > plan.created_at)
  })
  const todo = eligible.filter((uid) => !doneSet.has(uid))
  if (!b.apply) return NextResponse.json({ weekStart, plans: ids.length, eligible: eligible.length, alreadyDone: eligible.length - todo.length, todo: todo.length })

  const out: Array<{ user: string; before: string[]; after?: string[]; error?: string }> = []
  const started = Date.now()
  for (const uid of todo.slice(0, Math.min(Math.max(Number(b.limit) || 25, 1), 60))) {
    if (Date.now() - started > 250000) break
    const prof = byId.get(uid)!
    const before = (latest.get(uid)!.meals ?? []).map((m) => m.name)
    try {
      const meals = await rebuildWeek(admin, prof as unknown as AutoPlanProfile, mergeSettings(prof.settings), weekStart)
      await admin.from('app_kv').insert({ key: `rebuild:${tag}:${uid}`, value: { at: new Date().toISOString(), before, after: meals?.map((m) => m.name) ?? null }, updated_at: new Date().toISOString() })
      out.push({ user: uid, before, after: meals?.map((m) => m.name) })
    } catch (e) {
      out.push({ user: uid, before, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return NextResponse.json({ weekStart, rebuilt: out.filter((o) => o.after).length, left: todo.length - out.length, results: out })
}
