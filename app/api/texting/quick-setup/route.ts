import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFamilyProfile } from '@/lib/access'
import { mergeSettings } from '@/lib/settings'
import { setupFamilyTexting, sendFirstPlanText, APP_URL, type SetupProfile } from '@/lib/texting-setup'
import type { Meal } from '@/types'

/**
 * Family texting in one step from the dashboard card (no Settings trip):
 *  GET  → whether to show the card (has a plan, nobody has a phone yet, texting off)
 *  POST { ownerPhone?, members: [{ name, phone }] } → saves numbers, switches texting on,
 *        sends the opt-in texts (Family) or says a Family trial is needed (free).
 */
async function ctx() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until, referral_code').eq('id', user.id).single()
  if (!profile) return null
  return { user, admin, profile: profile as SetupProfile & { referral_code?: string | null } }
}

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ show: false })
  const { admin, profile } = c
  const settings = mergeSettings(profile.settings)
  const [{ count: plans }, { count: phones }] = await Promise.all([
    admin.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
    // Family numbers only: the planner's own row (profile_id = them) doesn't count.
    profile.household_id ? admin.from('household_members').select('id', { count: 'exact', head: true }).eq('household_id', profile.household_id).not('phone', 'is', null).or(`profile_id.is.null,profile_id.neq.${profile.id}`) : Promise.resolve({ count: 0 }),
  ])
  // Nov 7 2026: also shown to planners who gave us their own number but no family yet (most of them) —
  // until then the card only showed when nobody had a number, so they never got asked.
  const show = (plans ?? 0) > 0 && (phones ?? 0) === 0
  return NextResponse.json({
    show, family: isFamilyProfile(profile), hasOwnerPhone: !!settings.texting.ownerPhone,
    // Nov 9 2026: family members join themselves from a shared link instead of the planner typing their numbers.
    joinUrl: profile.referral_code ? `${APP_URL}/go/family/${profile.referral_code}` : null,
  })
}

export async function POST(request: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { ownerPhone?: string; members?: Array<{ name?: string; phone?: string }> }
  const r = await setupFamilyTexting(c.admin, c.profile, body)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  // "Text me my list": a planner who just gave their own number gets this week's dinners right away (once per household).
  let firstText = false
  if (body.ownerPhone) {
    const { data: fresh } = await c.admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', c.profile.id).single()
    const { data: plan } = await c.admin.from('meal_plans').select('meals').eq('user_id', c.profile.id).order('created_at', { ascending: false }).limit(1)
    if (fresh && plan?.[0]?.meals) firstText = await sendFirstPlanText(c.admin, fresh as SetupProfile, plan[0].meals as Meal[]).catch(() => false)
  }
  return NextResponse.json({ ...r, firstText })
}
