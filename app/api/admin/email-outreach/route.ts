import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/notify'

export const dynamic = 'force-dynamic'

const REPLY_TO = 'sarah@dinnerdrop.app'
// Never email these (Sarah's standing rule).
const BLOCKED = [/@camcomfginc\.com$/i]

/**
 * POST { email, subject, body } — one personal outreach email (a partner, a writer, a list owner) sent from
 * DinnerDrop's own address with replies to sarah@dinnerdrop.app. Unlike /api/admin/email-member it doesn't need
 * a DinnerDrop account, so it is one recipient per call and Sarah approves every message before it is sent.
 * Auth: x-admin-secret (SETUP_SECRET) or x-image-token.
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

  const b = await req.json().catch(() => ({})) as { email?: string; subject?: string; body?: string }
  const email = String(b.email ?? '').trim().toLowerCase()
  const subject = String(b.subject ?? '').trim().slice(0, 150)
  const body = String(b.body ?? '').trim().slice(0, 5000)
  if (!/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(email) || !subject || !body) return NextResponse.json({ error: 'one email, subject and body required' }, { status: 400 })
  if (BLOCKED.some((re) => re.test(email))) return NextResponse.json({ error: 'Blocked address' }, { status: 403 })

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<!doctype html><html><body style="margin:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24;font-size:15px;line-height:1.55"><div style="max-width:560px;padding:16px">${body.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div></body></html>`
  const sent = await sendEmail(email, subject, html, { replyTo: REPLY_TO, text: body })
  if (!sent.ok) return NextResponse.json({ error: sent.error ?? 'send failed' }, { status: 502 })
  try {
    const { data } = await admin.from('app_kv').select('value').eq('key', 'outreach_log').maybeSingle()
    const log = ((data?.value as { sends?: unknown[] } | null)?.sends ?? []).slice(-199)
    await admin.from('app_kv').upsert({ key: 'outreach_log', value: { sends: [...log, { to: email, subject, id: sent.id, at: new Date().toISOString() }] }, updated_at: new Date().toISOString() })
  } catch { /* log is best-effort */ }
  return NextResponse.json({ ok: true, id: sent.id, replyTo: REPLY_TO })
}
