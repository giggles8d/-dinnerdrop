import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Called by Vercel Cron daily at 10:00 AM EST (14:00 UTC)
// Schedule defined in vercel.json: "0 14 * * *"
//
// ACTIVATION SEQUENCE (2026-07 rewrite): the old version targeted
// subscription_status='trialing', but 226/227 users are 'free' — it never sent
// anything. This version nudges free users who haven't generated a meal plan
// yet, at Day 1 / 3 / 7 after signup. Users who have a plan are activated and
// are skipped; the newsletter takes over from there.
export async function GET(request: NextRequest) {
  // Auth check FIRST — do not reveal RESEND_API_KEY config status to unauthenticated callers
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.RESEND_API_KEY) {
    console.log('[cron/email-sequences] RESEND_API_KEY not configured — skipping batch')
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured', sent: 0, failed: 0 }, { status: 200 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const results: Array<{ userId: string; emailNumber: number; status: string }> = []
  const errors: Array<{ userId: string; emailNumber: number; error: string }> = []

  // [days since signup, email sequence number]
  const emailDays: [number, number][] = [[1, 1], [3, 2], [7, 3]]

  for (const [daysAgo, emailNumber] of emailDays) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - daysAgo)
    const dateStr = targetDate.toISOString().split('T')[0]

    const { data: users, error: queryError } = await supabase
      .from('profiles')
      .select('id, email, email_sequence_sent')
      .eq('subscription_status', 'free')
      .not('email_unsubscribed', 'eq', true)
      .not('email', 'is', null)
      .gte('created_at', `${dateStr}T00:00:00Z`)
      .lt('created_at', `${dateStr}T23:59:59Z`)

    if (queryError) {
      console.error(`[cron/email-sequences] Day-${daysAgo} query error:`, queryError)
      continue
    }
    if (!users || users.length === 0) continue

    // Skip activated users — anyone who already generated a meal plan doesn't
    // need activation nudges.
    const userIds = users.map(u => u.id)
    const { data: planRows } = await supabase
      .from('meal_plans')
      .select('user_id')
      .in('user_id', userIds)
    const activated = new Set((planRows || []).map(r => r.user_id))

    for (const user of users) {
      if (activated.has(user.id)) continue
      const sentEmails: number[] = user.email_sequence_sent || []
      if (sentEmails.includes(emailNumber)) continue

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dinnerdrop.app'}/api/email/send-trial`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET! },
            body: JSON.stringify({ userId: user.id, userEmail: user.email, emailNumber }),
          }
        )

        if (res.ok) {
          await supabase.from('profiles')
            .update({ email_sequence_sent: [...sentEmails, emailNumber] })
            .eq('id', user.id)
          results.push({ userId: user.id, emailNumber, status: 'sent' })
        } else {
          const errBody = await res.json().catch(() => ({}))
          errors.push({ userId: user.id, emailNumber, error: JSON.stringify(errBody) })
        }
      } catch (err) {
        errors.push({ userId: user.id, emailNumber, error: String(err) })
      }
    }
  }

  return NextResponse.json({ success: true, sent: results.length, failed: errors.length, results, errors: errors.length > 0 ? errors : undefined })
}
