import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { closeLastCall, lastCallStatus, startLastCall } from '@/lib/last-call'

export const dynamic = 'force-dynamic'

async function ctx() {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  return { admin, ownerId }
}

/** GET — eligibility, defaults, and the current/last call with what came in. */
export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await lastCallStatus(c.admin, c.ownerId))
}

/** POST { action: 'start', store?, minutes?, message? } | { action: 'close' } */
export async function POST(request: NextRequest) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { action?: string; store?: string; minutes?: number; message?: string }
  if (body.action === 'close') {
    await closeLastCall(c.admin, c.ownerId, 'manual')
    return NextResponse.json(await lastCallStatus(c.admin, c.ownerId))
  }
  if (body.action === 'start') {
    const r = await startLastCall(c.admin, c.ownerId, { store: body.store, minutes: body.minutes, message: body.message })
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json({ ...(await lastCallStatus(c.admin, c.ownerId)), sentTo: r.sentTo, skipped: r.skipped })
  }
  return NextResponse.json({ error: 'action required' }, { status: 400 })
}
