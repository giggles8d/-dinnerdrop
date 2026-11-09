import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildFirstPlan } from '@/lib/first-plan'
import { attachLibraryImages } from '@/lib/library-images'
import { sendFirstPlanText, type SetupProfile } from '@/lib/texting-setup'

export const dynamic = 'force-dynamic'

/**
 * POST — a brand-new user's first week, instantly: library dinners, saved on the spot.
 * Returns { ok: false } when it can't (the dashboard then falls back to AI generation).
 */
export async function POST() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'signed out' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    // Setup finished (the walkthrough sets onboarding_complete) → a waiting starter week is rebuilt from the answers.
    const { data: prof } = await admin.from('profiles').select('onboarding_complete').eq('id', user.id).single()
    const r = await buildFirstPlan(admin, user.id, { afterSetup: !!prof?.onboarding_complete })
    if (!r.ok) return NextResponse.json(r)
    const meals = await attachLibraryImages(admin, r.meals)
    // First text for a family that gave us a number in setup: "your week is ready" + the list link.
    if (!r.existing) {
      const { data: p } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
      if (p) await sendFirstPlanText(admin, p as SetupProfile, meals).catch((e) => console.error('[first-plan] text', e))
    }
    return NextResponse.json({ ...r, meals })
  } catch (e) {
    console.error('[first-plan]', e)
    return NextResponse.json({ ok: false, reason: 'error' })
  }
}
