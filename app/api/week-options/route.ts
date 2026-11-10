import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { weekOptions, shouldOfferOptions } from '@/lib/first-plan'
import { attachLibraryImages } from '@/lib/library-images'
import type { Meal } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET — for a family that has never ordered: this week's dinners plus more to choose from (12–15 in all), so the
 * dashboard opens as "pick your week" every week until they order (Sarah, Nov 9 2026). { options: [] } otherwise.
 */
export async function GET() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ options: [] }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { data: plan } = await admin.from('meal_plans').select('meals').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
    const current = (plan?.[0]?.meals ?? null) as Meal[] | null
    if (!(await shouldOfferOptions(admin, user.id, current))) return NextResponse.json({ options: [] })
    // First-week rules (familiar, no seafood unless asked) only for families who have never ordered.
    const { count: carts } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    const options = await attachLibraryImages(admin, await weekOptions(admin, user.id, current ?? [], { firstWeek: !carts }))
    return NextResponse.json({ options, pickCount: current?.length ?? 0, nights: (current ?? []).map((m) => m.day) })
  } catch (e) {
    console.error('[week-options]', e)
    return NextResponse.json({ options: [] })
  }
}
