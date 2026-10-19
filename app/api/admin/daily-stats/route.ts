import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'setzl1979@gmail.com'
const CAMPAIGN = 'founding-relaunch-oct26'
export const dynamic = 'force-dynamic'

async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const tok = request.headers.get('x-image-token')
  if (tok && tok.length >= 32) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
    if (data?.value && (data.value as { token?: string }).token === tok) return true
  }
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL
  } catch { return false }
}

/** GET — the numbers Sarah's daily signup check needs, in one call (no DB console required). */
export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const now = Date.now()
  const d1 = new Date(now - 86400000).toISOString(), d7 = new Date(now - 7 * 86400000).toISOString(), d14 = new Date(now - 14 * 86400000).toISOString()

  const [{ data: profiles }, { data: plans }, { data: handoffs }, { data: users }] = await Promise.all([
    db.from('profiles').select('id, email, created_at, is_beta_member, onboarding_complete, subscription_status, trial_starts_at, settings').gte('created_at', d14),
    db.from('meal_plans').select('user_id, created_at').gte('created_at', d7),
    db.from('grocery_handoffs').select('user_id, store, item_count, est_total, actual_total, created_at').gte('created_at', d7),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const { count: totalProfiles } = await db.from('profiles').select('id', { count: 'exact', head: true })
  const { count: trialsActive } = await db.from('profiles').select('id', { count: 'exact', head: true }).in('subscription_status', ['trialing', 'active'])

  const et = (iso: string) => new Date(new Date(iso).getTime() - 4 * 3600000).toISOString().slice(0, 10)   // ET date (EDT)
  const byDay: Record<string, number> = {}
  for (const p of profiles ?? []) byDay[et(p.created_at)] = (byDay[et(p.created_at)] ?? 0) + 1
  const newest = (profiles ?? []).filter((p) => p.created_at >= d1).map((p) => ({ email: p.email, at: p.created_at, onboarded: !!p.onboarding_complete }))

  const planned24 = new Set((plans ?? []).filter((p) => p.created_at >= d1).map((p) => p.user_id))
  const planned7 = new Set((plans ?? []).map((p) => p.user_id))
  const handoffs24 = (handoffs ?? []).filter((h) => h.created_at >= d1)
  const signedIn24 = (users?.users ?? []).filter((u) => u.last_sign_in_at && u.last_sign_in_at >= d1).length

  // Founding-relaunch campaign (sent Oct 18): who has done what since
  const { data: targeted } = await db.from('profiles').select('id, email, settings').not('settings->campaigns', 'is', null)
  const sent = (targeted ?? []).filter((p) => (p.settings as { campaigns?: Record<string, string> })?.campaigns?.[CAMPAIGN])
  const sentIds = new Set(sent.map((p) => p.id))
  const sentAt = sent.map((p) => (p.settings as { campaigns: Record<string, string> }).campaigns[CAMPAIGN]).sort()[0] ?? d1
  const campSignedIn = (users?.users ?? []).filter((u) => sentIds.has(u.id) && u.last_sign_in_at && u.last_sign_in_at >= sentAt).length
  const campPlanned = new Set((plans ?? []).filter((p) => sentIds.has(p.user_id) && p.created_at >= sentAt).map((p) => p.user_id)).size
  const campHandoff = new Set((handoffs ?? []).filter((h) => sentIds.has(h.user_id) && h.created_at >= sentAt).map((h) => h.user_id)).size

  return NextResponse.json({
    asOf: new Date().toISOString(),
    totals: { profiles: totalProfiles ?? 0, trialsOrActive: trialsActive ?? 0 },
    last24h: { signups: newest.length, newest, signedIn: signedIn24, plannedAWeek: planned24.size, listsSentToStore: handoffs24.length, handoffs: handoffs24.map((h) => ({ store: h.store, items: h.item_count, est: h.est_total, actual: h.actual_total })) },
    last7d: { signups: (profiles ?? []).filter((p) => p.created_at >= d7).length, plannedAWeek: planned7.size, listsSentToStore: (handoffs ?? []).length },
    signupsByDay: Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a)),
    foundingRelaunch: { sent: sent.length, sentAt, signedIn: campSignedIn, plannedAWeek: campPlanned, sentListToStore: campHandoff },
  })
}
