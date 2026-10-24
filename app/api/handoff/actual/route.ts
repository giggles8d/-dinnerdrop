import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { recordActualTotal } from '@/lib/handoff-actual'

/**
 * POST { total: number } — what the store actually charged for the most recent handoff.
 * Stores it on the handoff and updates settings.stores.priceFactor so future estimates
 * (and the planner's budget target) reflect this family's real store + fees.
 */
export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { total, store } = await req.json().catch(() => ({})) as { total?: number; store?: string }
  const actual = Number(total)
  if (!Number.isFinite(actual) || actual <= 0) return NextResponse.json({ error: 'total required' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  const { handoffId, factor } = await recordActualTotal(admin, ownerId, actual, store)
  if (!handoffId) return NextResponse.json({ error: 'No recent order to attach this to.' }, { status: 404 })
  return NextResponse.json({ ok: true, factor })
}
