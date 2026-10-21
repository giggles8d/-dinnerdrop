import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildFirstPlan } from '@/lib/first-plan'
import { attachLibraryImages } from '@/lib/library-images'

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
    const r = await buildFirstPlan(admin, user.id)
    if (!r.ok) return NextResponse.json(r)
    const meals = await attachLibraryImages(admin, r.meals)
    return NextResponse.json({ ...r, meals })
  } catch (e) {
    console.error('[first-plan]', e)
    return NextResponse.json({ ok: false, reason: 'error' })
  }
}
