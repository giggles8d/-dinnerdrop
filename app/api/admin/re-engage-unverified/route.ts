import React from 'react'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import ReEngageUnverified from '@/emails/ReEngageUnverified'

/**
 * One-shot admin endpoint to re-engage users who signed up but never verified their email.
 *
 * Sends a branded Resend email pointing back to /subscribe?coupon=BETA100 so they can finish signup.
 * Auth-gated by SETUP_SECRET in the x-admin-secret header. Idempotent on Resend side (the same
 * recipient may receive multiple if hit repeatedly — caller's responsibility not to spam).
 *
 * Usage (from any machine with the secret):
 *   curl -X POST https://dinnerdrop.app/api/admin/re-engage-unverified \
 *     -H "x-admin-secret: $SETUP_SECRET" \
 *     -H "Content-Type: application/json"
 *
 * Optionally pass {"daysBack": 30, "dryRun": true} in the body to scope or preview.
 */
export async function POST(request: NextRequest) {
  // Auth
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 })
  }

  // Parse optional body
  let opts: { daysBack?: number; dryRun?: boolean } = {}
  try {
    opts = (await request.json()) ?? {}
  } catch {
    // No body — use defaults
  }
  const daysBack = opts.daysBack ?? 60
  const dryRun = opts.dryRun === true

  // Service-role Supabase client (bypasses RLS — needed to read auth.users via admin API)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Pull recent users via the admin API
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listErr || !usersData?.users) {
    return NextResponse.json({ error: 'Failed to list users', detail: listErr?.message }, { status: 500 })
  }

  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000
  const unverified = usersData.users.filter((u) => {
    const created = new Date(u.created_at).getTime()
    return !u.email_confirmed_at && created >= cutoff && !!u.email
  })

  // Read live beta-spot count for the email body
  let betaSpotsRemaining = 99
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dinnerdrop.app'}/api/stripe/beta-spots`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      if (typeof data.spotsRemaining === 'number') betaSpotsRemaining = data.spotsRemaining
    }
  } catch {
    /* swallow — fall back to default */
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldEmail: unverified.map((u) => ({ id: u.id, email: u.email, createdAt: u.created_at })),
      count: unverified.length,
      betaSpotsRemaining,
    })
  }

  // Send
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>'
  const sent: Array<{ email: string; id?: string }> = []
  const failed: Array<{ email: string; error: string }> = []

  for (const u of unverified) {
    if (!u.email) continue
    const unsubscribeUrl = `https://dinnerdrop.app/unsubscribe?uid=${u.id}`
    const firstName = u.email.split('@')[0].replace(/[^a-zA-Z]/g, '') || 'there'

    const html = await render(
      React.createElement(ReEngageUnverified, {
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        betaSpotsRemaining,
        unsubscribeUrl,
      })
    )

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: u.email,
        subject: `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} — your DinnerDrop beta spot is still waiting (${betaSpotsRemaining} left)`,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
      if (error) {
        failed.push({ email: u.email, error: typeof error === 'string' ? error : JSON.stringify(error) })
      } else {
        sent.push({ email: u.email, id: data?.id })
      }
    } catch (err) {
      failed.push({ email: u.email, error: err instanceof Error ? err.message : 'unknown' })
    }
  }

  return NextResponse.json({
    sent: sent.length,
    failed: failed.length,
    betaSpotsRemaining,
    details: { sent, failed },
  })
}
