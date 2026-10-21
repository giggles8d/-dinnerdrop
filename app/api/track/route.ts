import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ACTIVATION_STEPS, trackStep, type ActivationStep } from '@/lib/activation'

export const dynamic = 'force-dynamic'

/** POST { step } — record a first-visit funnel step for the signed-in user. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const step = body?.step as ActivationStep
  if (!ACTIVATION_STEPS.includes(step)) return NextResponse.json({ ok: false }, { status: 400 })
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await trackStep(admin, user.id, step)
  return NextResponse.json({ ok: true })
}
