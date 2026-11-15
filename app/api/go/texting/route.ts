import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyFollowup } from '@/lib/followup'
import { setupFamilyTexting, sendFirstPlanText, type SetupProfile } from '@/lib/texting-setup'
import type { Meal } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * POST { u, s, ownerPhone?, members: [{ name, phone }] } — the "add your family's numbers" page reached from an
 * email (signed link, no sign-in). Same setup as the dashboard card: saves numbers, turns texting on, sends the
 * YES opt-in texts. Logs activation step 'texting_setup' {via:'email'}.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { u?: string; s?: string; ownerPhone?: string; members?: Array<{ name?: string; phone?: string }> }
  const u = String(body.u ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(u) || !verifyFollowup(u, 'texting', String(body.s ?? ''))) {
    return NextResponse.json({ error: 'This link has expired. Sign in and open Settings → Texting instead.' }, { status: 401 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', u).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'We couldn’t find your account.' }, { status: 404 })
  const members = (body.members ?? []).slice(0, 6)
  const r = await setupFamilyTexting(admin, profile as SetupProfile, { ownerPhone: body.ownerPhone, members })
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  try { await admin.from('activation_events').insert({ user_id: u, step: 'texting_setup', meta: { via: 'email', saved: r.saved, sent: r.sent ?? 0 } }) } catch { /* tracking only */ }
  // "Text me my week" (Nov 15 2026): their own number → this week's dinners right away (once per household).
  let firstText = false
  if (body.ownerPhone) {
    const { data: fresh } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', u).single()
    const { data: plan } = await admin.from('meal_plans').select('meals').eq('user_id', u).order('created_at', { ascending: false }).limit(1)
    if (fresh && plan?.[0]?.meals) firstText = await sendFirstPlanText(admin, fresh as SetupProfile, plan[0].meals as Meal[]).catch(() => false)
  }
  return NextResponse.json({ ...r, firstText })
}
