import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
const TO = 'sarah@dinnerdrop.app'

/** POST {message, email?} → emails Sarah; signed-in families' messages carry their account email and plan context. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const message = String(body.message ?? '').trim().slice(0, 4000)
  if (message.length < 5) return NextResponse.json({ error: 'Tell us a little more.' }, { status: 400 })
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  const email = (user?.email ?? String(body.email ?? '').trim()).toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Add an email so we can reply.' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // Light rate limit: 5 per hour per email.
  const since = new Date(Date.now() - 3600000).toISOString()
  const { count } = await admin.from('help_messages').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) return NextResponse.json({ error: 'Too many messages — we have yours, give us a bit.' }, { status: 429 })
  let context = ''
  if (user) {
    const [{ data: p }, { data: h }] = await Promise.all([
      admin.from('profiles').select('family_size, subscription_status, is_beta_member, family_until, dietary_needs, created_at').eq('id', user.id).maybeSingle(),
      admin.from('grocery_handoffs').select('created_at, store, feedback').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
    ])
    context = `Account: ${email}\nFamily of ${p?.family_size ?? '?'} · plan ${p?.subscription_status ?? '?'}${p?.is_beta_member ? ' · founding' : ''}${p?.family_until ? ` · Family until ${p.family_until}` : ''} · diets ${(p?.dietary_needs ?? []).join(', ') || 'none'} · joined ${String(p?.created_at ?? '').slice(0, 10)}\nRecent store sends: ${(h ?? []).map((x) => `${String(x.created_at).slice(0, 10)} ${x.store}${x.feedback ? ` (${x.feedback})` : ''}`).join('; ') || 'none'}\nPage: ${String(body.page ?? '')}`
  } else context = `Not signed in. Page: ${String(body.page ?? '')}`
  await admin.from('help_messages').insert({ user_id: user?.id ?? null, email, message, page: String(body.page ?? '').slice(0, 200) })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to: TO,
    reply_to: email,
    subject: `Help: ${message.slice(0, 60).replace(/\s+/g, ' ')}${message.length > 60 ? '…' : ''}`,
    html: `<p style="white-space:pre-wrap;font:15px/1.5 -apple-system,Segoe UI,sans-serif">${esc(message)}</p><hr><pre style="font:12px/1.5 monospace;color:#555">${esc(context)}</pre>`,
  })
  if (error) return NextResponse.json({ error: 'Could not send — email sarah@dinnerdrop.app directly.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
