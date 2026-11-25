import { fromAddress } from '@/lib/notify'
import React from 'react'
import { SafeResend } from '@/lib/email-guard'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import ActivateDay1 from '@/emails/ActivateDay1'
import { shopUrl } from '@/lib/followup'
import ActivateDay3 from '@/emails/ActivateDay3'
import ActivateDay7 from '@/emails/ActivateDay7'
import { createClient } from '@supabase/supabase-js'

function getResend() { return new SafeResend(process.env.RESEND_API_KEY) }

type EmailNumber = 1 | 2 | 3

// Activation sequence (2026-07: replaced the trial-conversion sequence — 226/227
// users are 'free' and never received emails; the goal now is first-plan
// activation, not trial-end urgency).
const EMAIL_CONFIG: Record<EmailNumber, { subject: string; Template: React.FC<{ firstName?: string; unsubscribeUrl: string; nextBillingDate?: string; shopUrl?: string; dinners?: string[] }> }> = {
  1: { subject: 'Your grocery list is ready, one tap to Instacart or Walmart', Template: ActivateDay1 },
  2: { subject: 'Want different dinners? Swap any of them in one tap', Template: ActivateDay3 },
  3: { subject: 'Your dinners are still waiting — one tap to Instacart', Template: ActivateDay7 },
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

  // A typo'd address ("name@hot") can't be delivered; skip it quietly instead of erroring on every send.
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(userEmail).trim())) {
    return NextResponse.json({ skipped: true, reason: 'invalid email address' })
  }
  const config = EMAIL_CONFIG[emailNumber as EmailNumber]
  // Name their actual dinners in the subject (Nov 21 2026 review: generic subjects; plan-ready emails that name
  // the dinners get opened more). Falls back to the fixed subject when there's no plan.
  let subject = config.subject
  let dinners: string[] = []
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: plan } = await admin.from('meal_plans').select('meals').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    dinners = ((plan?.meals as Array<{ name?: string }> | null) ?? []).map((m) => String(m?.name ?? '').trim()).filter(Boolean)
  } catch { /* fixed subject */ }
  if (dinners.length >= 2) {
    if (emailNumber === 1) subject = `${dinners[0]}, ${dinners[1]} and ${dinners.length - 2} more are ready`
    if (emailNumber === 3) subject = `Still on for ${dinners[0]} this week?`
  }
  const unsubscribeUrl = `https://www.dinnerdrop.app/unsubscribe?uid=${userId}`

  const html = await render(
    React.createElement(config.Template, {
      firstName: firstName || 'there',
      unsubscribeUrl,
      shopUrl: shopUrl(userId, emailNumber === 1 ? 'day1' : emailNumber === 2 ? 'day3' : 'day7'),
      nextBillingDate: nextBillingDate || 'one week from today',
      dinners,
    })
  )

  const send = () => getResend().emails.send({
    from: fromAddress(),
    to: userEmail,
    subject,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl.replace('/unsubscribe?', '/api/email/unsubscribe?')}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  // Resend allows 10 requests/second; other jobs can send at the same moment (Nov 1: 8 day-1 emails lost to 429s).
  // Wait and retry a rate-limited send instead of dropping it.
  let { data, error } = await send()
  for (let attempt = 1; attempt <= 3 && error && error.name === 'rate_limit_exceeded'; attempt++) {
    await new Promise((r) => setTimeout(r, 1000 * attempt))
    ;({ data, error } = await send())
  }

  if (error) {
    console.error(`[email/send-trial] Resend error for user ${userId}:`, error)
    return NextResponse.json({ error }, { status: 500 })
  }

  console.log(`[email/send-trial] Email #${emailNumber} sent to ${userEmail} (id: ${data?.id})`)
  return NextResponse.json({ success: true, emailId: data?.id })
}
