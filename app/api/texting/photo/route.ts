import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/texting/photo?id=<sms_messages.id>[&n=0] — a photo a family member texted in, for the person in charge
 * (Texts screen). Twilio media needs our account login, so it's fetched here and passed through.
 */
export async function GET(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('household_id').eq('id', user.id).single()
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const n = Math.max(0, Math.min(Number(req.nextUrl.searchParams.get('n')) || 0, 9))
  const { data: msg } = await admin.from('sms_messages').select('twilio_sid, household_id, direction').eq('id', id).maybeSingle()
  if (!msg || !profile?.household_id || msg.household_id !== profile.household_id || msg.direction !== 'in' || !String(msg.twilio_sid ?? '').startsWith('MM')) return new NextResponse('Not found', { status: 404 })
  const acct = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN
  if (!acct || !token) return new NextResponse('Not configured', { status: 503 })
  const authz = { Authorization: 'Basic ' + Buffer.from(`${acct}:${token}`).toString('base64') }
  const list = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${acct}/Messages/${msg.twilio_sid}/Media.json`, { headers: authz, cache: 'no-store' })
  if (!list.ok) return new NextResponse('Not found', { status: 404 })
  const media = ((await list.json()).media_list ?? []) as Array<{ uri: string; content_type: string }>
  const m = media[n]
  if (!m || !/^image\//i.test(m.content_type)) return new NextResponse('Not found', { status: 404 })
  const img = await fetch(`https://api.twilio.com${m.uri.replace(/\.json$/, '')}`, { headers: authz, redirect: 'follow', cache: 'no-store' })
  if (!img.ok) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(await img.arrayBuffer(), { headers: { 'Content-Type': m.content_type, 'Cache-Control': 'private, max-age=3600' } })
}
