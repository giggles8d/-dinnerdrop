import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isFamilyProfile } from '@/lib/access'
import { getAsk, askIsLive } from '@/lib/family-ask'
import { startFamilyAsk } from '@/lib/texting'

export const dynamic = 'force-dynamic'

/**
 * Ask the family something, or collect takeout orders, from the Texts screen.
 *  GET  → the current/last ask with answers
 *  POST { kind: 'question' | 'takeout', text }
 */
async function ctx() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('id, household_id, full_name, timezone, settings, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
  if (!profile?.household_id) return null
  return { admin, profile }
}

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ ask: null })
  const a = await getAsk(c.admin, c.profile.household_id)
  return NextResponse.json({ ask: a && Date.now() - new Date(a.at).getTime() < 24 * 3600000 ? { ...a, live: askIsLive(a) } : null })
}

export async function POST(req: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  if (!isFamilyProfile(c.profile)) return NextResponse.json({ error: 'Family texting is part of the Family plan.' }, { status: 403 })
  const b = await req.json().catch(() => ({})) as { kind?: string; text?: string }
  const kind = b.kind === 'takeout' ? 'takeout' : 'question'
  const text = String(b.text ?? '').trim().slice(0, 300)
  if (kind === 'question' && text.length < 3) return NextResponse.json({ error: 'Type your question first.' }, { status: 400 })
  const r = await startFamilyAsk(c.admin, c.profile, kind, text)
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true, sent: r.sent })
}
