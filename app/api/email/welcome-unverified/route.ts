import React from 'react'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import WelcomeUnverified from '@/emails/WelcomeUnverified'

/**
 * Fire a branded "thanks for signing up — check your email" message immediately after
 * Supabase Auth signup. Called from app/(auth)/signup/page.tsx after supabase.auth.signUp
 * returns successfully but BEFORE the user has verified their email.
 *
 * Purpose: the Supabase verification email comes from a generic noreply@mail.app.supabase.io
 * address that often lands in spam. A first-touch branded email from info@dinnerdrop.app
 * primes the user to look for the Supabase email AND check spam.
 *
 * No auth gate — anyone can fire this for any email (intentionally — the user just signed
 * up so they own that email by definition; abuse risk is rate-limited via Resend's caps).
 */
export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured' }, { status: 200 })
  }

  let body: { email?: string; userId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, userId } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const unsubscribeUrl = userId
    ? `https://dinnerdrop.app/unsubscribe?uid=${userId}`
    : 'https://dinnerdrop.app/unsubscribe'

  const html = await render(React.createElement(WelcomeUnverified, { unsubscribeUrl }))

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>'

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Thanks for signing up — check your email to finish',
      html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }
    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
