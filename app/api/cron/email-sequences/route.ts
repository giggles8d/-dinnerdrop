import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Called by Vercel Cron daily at 10:00 AM EST (14:00 UTC)
// Schedule defined in vercel.json: "0 14 * * *"
export async function GET(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[cron/email-sequences] RESEND_API_KEY not configured — skipping batch')
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured', sent: 0, failed: 0 }, { status: 200 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const results: Array<{ userId: string; emailNumber: number; status: string }> = []
  const errors: Array<{ userId: string; emailNumber: number; error: string }> = []

  // [days since trial start, email sequence number]
  const emailDays: [number, number][] = [[3, 1], [6, 2], [7, 3]]

  for (const [daysAgo, emailNumber] of emailDays) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - daysAgo)
    const dateStr = targetDate.toISOString().split('T')[0]

    const { data: users, error: queryError } = await supabase
      .from('profiles')
      .select('id, email, full_name, trial_starts_at, email_sequence_sent, subscription_status')
      .eq('subscription_status', 'trialing')
      .not('email_unsubscribed', 'eq', true)
      .gte('trial_starts_at', `${dateStr}T00:00:00Z`)
      .lt('trial_starts_at', `${dateStr}T23:59:59Z`)

    if (queryError) {
      console.error(`[cron/email-sequences] Day-${daysAgo} query error:`, queryError)
      continue
    }

    for (const user of (users || [])) {
      const sentEmails: number[] = user.email_sequence_sent || []
      if (sentEmails.includes(emailNumber)) continue
      if (user.subscription_status === 'active') continue

      const firstName = user.full_name ? user.full_name.split(' ')[0] : undefined

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dinnerdrop.vercel.app'}/api/email/send-trial`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET! },
            body: JSON.stringify({ userId: user.id, userEmail: user.email, firstName, emailNumber }),
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
