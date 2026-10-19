import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

/**
 * POST { email, create? } — emails a 6-digit sign-in code.
 *
 * Used by the iPhone/Android app: a magic link opens in the phone's browser, so the
 * session lands in Safari instead of the app. With a code, the person types it in the
 * app and the session is created right there (supabase.auth.verifyOtp on the client).
 * The code comes from admin.generateLink (same one-time token as the magic link).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; create?: boolean }
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Throttle: one code per email every 30 seconds.
  const key = `otp:${email}`
  const { data: last } = await admin.from('app_kv').select('updated_at').eq('key', key).maybeSingle()
  if (last?.updated_at && Date.now() - new Date(last.updated_at).getTime() < 30_000) {
    return NextResponse.json({ error: 'A code was just sent — check your inbox, or try again in 30 seconds.' }, { status: 429 })
  }
  await admin.from('app_kv').upsert({ key, value: {}, updated_at: new Date().toISOString() })

  const { data: prof } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (!prof) {
    if (!body.create) return NextResponse.json({ error: 'No DinnerDrop account uses that email yet — tap "Sign up" below to create one (free).' }, { status: 404 })
    const { error: cErr } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (cErr && !/already|registered|exists/i.test(cErr.message)) return NextResponse.json({ error: cErr.message }, { status: 500 })
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const code = data?.properties?.email_otp
  if (error || !code) return NextResponse.json({ error: error?.message || 'Could not create a code. Try again.' }, { status: 500 })

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email is not configured.' }, { status: 500 })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const spaced = code.split('').join(' ')
  const { error: sendErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to: email,
    subject: `${code} is your DinnerDrop sign-in code`,
    text: `Your DinnerDrop sign-in code is ${code}\n\nType it in the DinnerDrop app to sign in. It works once and expires in 1 hour.\n\nDidn't ask for this? You can ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden">
<div style="background:#1a5c38;padding:18px 28px"><span style="color:#e8a838;font-size:22px;font-weight:700">DinnerDrop</span></div>
<div style="padding:28px;text-align:center">
<p style="font-size:16px;color:#374151;margin:0 0 14px">Your sign-in code</p>
<p style="font-size:36px;letter-spacing:6px;font-weight:700;color:#1a5c38;margin:0 0 18px">${spaced}</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0">Type it in the DinnerDrop app to sign in. It works once and expires in 1 hour.<br>Didn&rsquo;t ask for this? You can ignore this email.</p>
</div></div></body></html>`,
    tags: [{ name: 'type', value: 'signin-code' }],
  })
  if (sendErr) return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 500 })
  return NextResponse.json({ sent: true })
}
