import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getClientCredentialsToken, findLocations } from '@/lib/kroger'

export const dynamic = 'force-dynamic'

/** GET ?zip=14845 → nearby Kroger-family stores. POST {locationId, name} saves the family's pick on their profile settings. */
export async function GET(request: NextRequest) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const zip = (request.nextUrl.searchParams.get('zip') ?? '').replace(/\D/g, '').slice(0, 5)
  if (zip.length !== 5) return NextResponse.json({ error: 'ZIP code needed' }, { status: 400 })
  const token = await getClientCredentialsToken()
  return NextResponse.json({ locations: await findLocations(zip, token) })
}

export async function POST(request: NextRequest) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { locationId, name } = await request.json()
  if (typeof locationId !== 'string' || !/^\d{8}$/.test(locationId)) return NextResponse.json({ error: 'Bad store' }, { status: 400 })
  const { data: p } = await sb.from('profiles').select('settings').eq('id', user.id).single()
  const settings = (p?.settings as Record<string, unknown> | null) ?? {}
  const stores = (settings.stores as Record<string, unknown> | undefined) ?? {}
  const { error } = await sb.from('profiles').update({ settings: { ...settings, stores: { ...stores, krogerLocationId: locationId, krogerLocationName: String(name ?? '').slice(0, 80) } } }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
