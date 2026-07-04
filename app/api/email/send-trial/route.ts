import React from 'react'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import ActivateDay1 from '@/emails/ActivateDay1'
import ActivateDay3 from '@/emails/ActivateDay3'
import ActivateDay7 from '@/emails/ActivateDay7'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

type EmailNumber = 1 | 2 | 3

// Activation sequence (2026-07: replaced the trial-conversion sequence — 226/227
// users are 'free' and never received emails; the goal now is first-plan
// activation, not trial-end urgency).
const EMAIL_CONFIG: Record<EmailNumber, { subject: string; Template: React.FC<{ firstName?: string; unsubscribeUrl: string; nextBillingDate?: string }> }> = {
  1: { subject: 'Your 5 dinners for this week are ready 🍽️', Template: ActivateDay1 },
  2: { subject: "Tonight's dinner, solved in 30 seconds", Template: ActivateDay3 },
  3: { subject: '60 seconds for a week of dinners — last nudge', Template: ActivateDay7 },
}

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email/send-trial] RESEND_API_KEY not configured — skipping')
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured' }, { status: 200 })
  }
  const authHeader = request.headers.get('x-cron-secret')
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userId?: string; userEmail?: string; firstName?: string; emailNumber?: number; nextBillingDate?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, userEmail, firstName, emailNumber, nextBillingDate } = body

  if (!userId || !userEmail || !emailNumber || !(emailNumber in EMAIL_CONFIG)) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 })
  }

  const config = EMAIL_CONFIG[emailNumber as EmailNumber]
  const unsubscribeUrl = `https://dinnerdrop.app/unsubscribe?uid=${userId}`

  const html = await render(
    React.createElement(config.Template, {
      firstName: firstName || 'there',
      unsubscribeUrl,
      nextBillingDate: nextBillingDate || 'one week from today',
    })
  )

  const { data, error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to: userEmail,
    subject: config.subject,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  if (error) {
    console.error(`[email/send-trial] Resend error for user ${userId}:`, error)
    return NextResponse.json({ error }, { status: 500 })
  }

  console.log(`[email/send-trial] Email #${emailNumber} sent to ${userEmail} (id: ${data?.id})`)
  return NextResponse.json({ success: true, emailId: data?.id })
}
