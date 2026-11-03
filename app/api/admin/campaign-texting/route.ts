import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { runTexting, textingHtml, textingText, TEXTING_SUBJECT, TEXTING } from '@/lib/texting-campaign'
import { textingUrl } from '@/lib/followup'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST { test?: true } — run the texting invite now (still gated on app_kv campaign_texting approval) instead of
 * waiting for the 7 AM cron. test: sends one copy to Sarah's own account (her real link) and nothing else.
 * Auth: x-admin-secret (SETUP_SECRET) or x-image-token (pipeline token).
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
  const body = await req.json().catch(() => ({})) as { test?: boolean }
  if (body.test) {
    const { data: me } = await admin.from('profiles').select('id, email, full_name').eq('email', 'setzl1979@gmail.com').maybeSingle()
    if (!me || !process.env.RESEND_API_KEY) return NextResponse.json({ error: 'no test account or Resend key' }, { status: 400 })
    const link = textingUrl(me.id, `${TEXTING}-test`)
    const unsub = `https://www.dinnerdrop.app/unsubscribe?uid=${me.id}`
    const first = me.full_name ? String(me.full_name).split(' ')[0] : undefined
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'Sarah from DinnerDrop <sarah@dinnerdrop.app>', to: me.email, subject: `[Test] ${TEXTING_SUBJECT}`, html: textingHtml(first, link, unsub), text: textingText(first, link, unsub) })
    return NextResponse.json({ ok: !error, test: true, error: error?.message })
  }
  const report = await runTexting(admin, new Date(), { budgetMs: 270000 })
  return NextResponse.json({ ok: true, report })
}
