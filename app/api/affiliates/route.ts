import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailShell } from '@/lib/notify'

/** POST — creator / partner affiliate application. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().slice(0, 200)
  const platform = String(body.platform ?? '').trim().slice(0, 80)
  const audience = String(body.audience ?? '').trim().slice(0, 80)
  const url = String(body.url ?? '').trim().slice(0, 300)
  const notes = String(body.notes ?? '').trim().slice(0, 2000)
  if (body.website) return NextResponse.json({ ok: true }) // honeypot
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Name and a valid email are required.' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.from('affiliate_applications').insert({ name, email, platform, audience, url, notes })
  if (error) return NextResponse.json({ error: 'Could not save your application. Email affiliates@dinnerdrop.app instead.' }, { status: 500 })

  await sendEmail('setzl1979@gmail.com', `[DinnerDrop] Affiliate application — ${name}`, emailShell(
    'New affiliate application',
    `<p><strong>${name}</strong> &lt;${email}&gt;</p><p>Platform: ${platform || '—'}<br/>Audience: ${audience || '—'}<br/>Link: ${url ? `<a href="${url}">${url}</a>` : '—'}</p><p>${notes.replace(/\n/g, '<br/>') || ''}</p>`
  )).catch(() => {})
  await sendEmail(email, 'Got your DinnerDrop affiliate application', emailShell(
    `Thanks, ${name.split(' ')[0]}`,
    `<p>We read every application and reply within a few days with your link and the program details: 30% of the first year of every Family subscription you send, paid monthly, 60-day cookie.</p><p>In the meantime, DinnerDrop is free to try — a week of dinners and a one-tap cart, so you can see what you'd be recommending.</p>`,
    { label: 'Try DinnerDrop free', href: 'https://www.dinnerdrop.app/start' }
  )).catch(() => {})
  return NextResponse.json({ ok: true })
}
