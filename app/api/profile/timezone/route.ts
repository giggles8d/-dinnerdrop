import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST { tz } — the family's real time zone, read from their phone or browser when they open the dashboard
 * (Nov 10 2026: 454 of 465 profiles were Eastern only by default, so texts reached West Coast families at 4–5 AM).
 * A time zone the family picked themselves in Settings (settings.tzManual) is never overwritten.
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const { tz } = (await req.json().catch(() => ({}))) as { tz?: unknown }
  const zone = typeof tz === 'string' ? tz.slice(0, 60) : ''
  try { new Intl.DateTimeFormat('en-US', { timeZone: zone }) } catch { return NextResponse.json({ error: 'bad time zone' }, { status: 400 }) }
  if (!/^(America|Pacific|US|Europe|Asia|Australia|Africa|Atlantic|Indian)\/[A-Za-z_\-/]+$/.test(zone)) return NextResponse.json({ error: 'bad time zone' }, { status: 400 })
  const { data: p } = await supabase.from('profiles').select('timezone, settings').eq('id', user.id).maybeSingle()
  if (!p) return NextResponse.json({ ok: false })
  const settings = (p.settings ?? {}) as Record<string, unknown>
  if (settings.tzManual) return NextResponse.json({ ok: true, kept: p.timezone })
  if (p.timezone === zone && settings.tzKnown) return NextResponse.json({ ok: true, unchanged: true })
  await supabase.from('profiles').update({ timezone: zone, settings: { ...settings, tzKnown: true } }).eq('id', user.id)
  return NextResponse.json({ ok: true, timezone: zone })
}
