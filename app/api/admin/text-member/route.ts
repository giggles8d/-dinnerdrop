import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { textMember, type MemberRow } from '@/lib/texting'
import { smsConfigured } from '@/lib/notify'

export const dynamic = 'force-dynamic'

/**
 * POST { memberId, message } — DinnerDrop texts one household member (Sarah-approved outreach, e.g. confirming a
 * health need they texted). Auth: x-admin-secret (SETUP_SECRET) or x-image-token (pipeline token). Opted-in only;
 * logged in sms_messages like every other text so replies route normally.
 */
export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const secret = req.headers.get('x-admin-secret')
  let ok = !!secret && !!process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET
  if (!ok) {
    const token = req.headers.get('x-image-token') ?? ''
    if (token.length >= 32) {
      const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
      ok = (data?.value as { token?: string } | null)?.token === token
    }
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { memberId, message } = await req.json().catch(() => ({})) as { memberId?: string; message?: string }
  const text = (message ?? '').trim().slice(0, 640)
  if (!memberId || !text) return NextResponse.json({ error: 'memberId and message required' }, { status: 400 })
  if (!smsConfigured()) return NextResponse.json({ error: 'Texting is not configured' }, { status: 503 })
  const { data: m } = await admin.from('household_members').select('*').eq('id', memberId).maybeSingle()
  if (!m) return NextResponse.json({ error: 'No such member' }, { status: 404 })
  const sent = await textMember(admin, m as MemberRow, text, 'admin_message')
  return NextResponse.json({ ok: sent, member: (m as MemberRow).name, reason: sent ? undefined : 'not opted in or send failed' })
}
