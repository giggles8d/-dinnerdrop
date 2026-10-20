import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

/**
 * POST { email } — emails a password-reset link that works in ANY browser.
 *
 * Supabase's built-in reset link uses PKCE: it only works in the same browser that asked
 * for it, so opening the email on a phone (or in Gmail's in-app browser) bounced people to
 * /login. Here we mint the recovery token server-side and link to
 * /reset-password?token_hash=…&type=recovery, which the page verifies with verifyOtp.
 * Always answers { sent: true } so it never reveals whether an email has an account.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string }
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const key = `reset:${email}`
  const { data: last } = await admin.from('app_kv').select('updated_at').eq('key', key).maybeSingle()
  if (last?.updated_at && Date.now() - new Date(last.updated_at).getTime() < 30_000) {
    return NextResponse.json({ error: 'A reset link was just sent. Check your inbox, or try again in 30 seconds.' }, { status: 429 })
  }
  await admin.from('app_kv').upsert({ key, value: {}, updated_at: new Date().toISOString() })

  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
  const hash = data?.properties?.hashed_token
  if (error || !hash) return NextResponse.json({ sent: true }) // unknown email: say nothing

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://www.dinnerdrop.app'
  const link = `${origin}/reset-password?token_hash=${encodeURIComponent(hash)}&type=recovery`
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email is not configured.' }, { status: 500 })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to: email,
    subject: 'Reset your DinnerDrop password',
    text: `Reset your DinnerDrop password:\n\n${link}\n\nThe link works once and expires in 1 hour. Didn't ask for this? You can ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden">
<div style="background:#1a5c38;padding:18px 28px"><span style="color:#e8a838;font-size:22px;font-weight:700">DinnerDrop</span></div>
<div style="padding:28px;text-align:center">
<p style="font-size:16px;color:#374151;margin:0 0 20px">Tap below to choose a new password.</p>
<a href="${link}" style="display:inline-block;background:#1a5c38;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">Reset my password</a>
<p style="font-size:13px;color:#6b7280;line-height:1.6;margin:20px 0 0">The link works once and expires in 1 hour.<br>Didn&rsquo;t ask for this? You can ignore this email.</p>
</div></div></body></html>`,
    tags: [{ name: 'type', value: 'password-reset' }],
  })
  if (sendErr) return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 500 })
  return NextResponse.json({ sent: true })
}
