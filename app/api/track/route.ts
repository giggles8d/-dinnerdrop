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
  // Small, flat meta only (page, id, seconds, scroll %, short message).
  const raw = body?.meta && typeof body.meta === 'object' ? body.meta as Record<string, unknown> : {}
  const meta: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw).slice(0, 8)) {
    if (!/^[a-z_]{1,16}$/.test(k)) continue
    if (typeof v === 'number' && Number.isFinite(v)) meta[k] = Math.round(v * 100) / 100
    else if (typeof v === 'boolean') meta[k] = v
    else if (typeof v === 'string') meta[k] = v.slice(0, 160)
  }
  await trackStep(admin, user.id, step, meta)
  return NextResponse.json({ ok: true })
}
