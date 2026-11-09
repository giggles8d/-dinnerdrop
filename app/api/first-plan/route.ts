import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildFirstPlan, libraryWeek } from '@/lib/first-plan'
import type { Meal } from '@/types'
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
    // Nov 9 2026 (Sarah: "change it so they have 12 or more options to pick from"): alongside the saved week, offer
    // more dinners that fit the family so they pick their own week. Only while it's still their untouched first week.
    let options: Meal[] = []
    const { count: plans } = await admin.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    const { count: sends } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    if ((plans ?? 0) <= 1 && !(sends ?? 0)) {
      const pool: Meal[] = [...meals]
      for (let i = 0; i < 3 && pool.length < 15; i++) {
        const more = await libraryWeek(admin, user.id, pool.map((m) => m.name), { firstWeek: true }).catch(() => null)
        if (!more || !more.ok || !more.meals.length) break
        pool.push(...more.meals.filter((m) => !pool.some((x) => x.name === m.name)))
      }
      if (pool.length >= 12) options = await attachLibraryImages(admin, pool.slice(0, 15).map((m, i) => ({ ...m, day: `O${i + 1}` })))
    }
    return NextResponse.json({ ...r, meals, options, pickCount: meals.length })
  } catch (e) {
    console.error('[first-plan]', e)
    return NextResponse.json({ ok: false, reason: 'error' })
  }
}
