import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import Newsletter from '@/emails/Newsletter'
import { getPublishedPosts } from '@/lib/published-posts'
import { getIssueForDate, getFeatureForDate, isSendWeek, isoWeek } from '@/lib/newsletter-content'

// "The Sunday Drop" — biweekly newsletter.
// Vercel cron hits this every Sunday 13:00 UTC (vercel.json); the ISO-week
// parity gate below makes it effectively biweekly (even weeks only).
//
// KILL SWITCH: full sends only happen when NEWSLETTER_LIVE is true.
// ?preview=1  → sends ONE email to PREVIEW_RECIPIENT only (works while not live)
// ?dryRun=1   → returns assembled content + recipient counts, sends nothing
// ?force=1    → bypasses the ISO-week parity gate (not the live gate)
const NEWSLETTER_LIVE = false
const PREVIEW_RECIPIENT = 'setzl1979@gmail.com'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const preview = url.searchParams.get('preview') === '1'
  const force = url.searchParams.get('force') === '1'

  const now = new Date()
  if (!force && !isSendWeek(now)) {
    return NextResponse.json({ skipped: true, reason: `odd ISO week ${isoWeek(now)} — biweekly gate`, sent: 0 })
  }

  // Assemble the issue
  const issue = getIssueForDate(now)
  const feature = getFeatureForDate(now)
  const cutoff = new Date(now.getTime() - 14 * 86400000)
  const blogPosts = getPublishedPosts()
    .filter((p) => new Date(p.publishDate) > cutoff)
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 3)
    .map((p) => ({ title: p.title, description: p.description, slug: p.slug }))

  // Gather recipients: all profiles (not unsubscribed) + waitlist, deduped
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  type Recipient = { email: string; firstName?: string; isBetaMember: boolean; unsubscribeUrl: string }
  const recipients = new Map<string, Recipient>()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_beta_member, email_unsubscribed')
    .not('email_unsubscribed', 'eq', true)
  for (const p of profiles || []) {
    if (!p.email) continue
    recipients.set(p.email.toLowerCase(), {
      email: p.email,
      firstName: p.full_name ? p.full_name.split(' ')[0] : undefined,
      isBetaMember: !!p.is_beta_member,
      unsubscribeUrl: `https://dinnerdrop.app/unsubscribe?uid=${p.id}`,
    })
  }

  const { data: waitlist } = await supabase.from('waitlist').select('email')
  for (const w of waitlist || []) {
    if (!w.email) continue
    const key = w.email.toLowerCase()
    if (recipients.has(key)) continue
    recipients.set(key, {
      email: w.email,
      isBetaMember: false,
      unsubscribeUrl: `https://dinnerdrop.app/unsubscribe?email=${encodeURIComponent(w.email)}`,
    })
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      live: NEWSLETTER_LIVE,
      isoWeek: isoWeek(now),
      subject: issue.subject,
      theme: issue.themeTitle,
      feature: feature.title,
      blogPosts: blogPosts.map((p) => p.slug),
      recipientCount: recipients.size,
    })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured', sent: 0 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL ?? 'DinnerDrop <info@dinnerdrop.app>'

  const targets: Recipient[] = preview
    ? [{
        email: PREVIEW_RECIPIENT,
        firstName: 'Sarah',
        isBetaMember: true,
        unsubscribeUrl: 'https://dinnerdrop.app/unsubscribe',
      }]
    : Array.from(recipients.values())

  if (!preview && !NEWSLETTER_LIVE) {
    return NextResponse.json({ skipped: true, reason: 'NEWSLETTER_LIVE is false (kill switch)', recipientCount: recipients.size, sent: 0 })
  }

  let sent = 0
  const failures: string[] = []
  for (const r of targets) {
    try {
      const html = await render(
        React.createElement(Newsletter, {
          firstName: r.firstName,
          isBetaMember: r.isBetaMember,
          issue,
          feature,
          blogPosts,
          unsubscribeUrl: r.unsubscribeUrl,
        })
      )
      const { error } = await resend.emails.send({
        from,
        to: r.email,
        subject: preview ? `[PREVIEW] ${issue.subject}` : issue.subject,
        html,
      })
      if (error) failures.push(`${r.email}: ${error.message}`)
      else sent++
    } catch (err) {
      failures.push(`${r.email}: ${err instanceof Error ? err.message : String(err)}`)
    }
    // Resend rate limit ~5/sec
    await new Promise((res) => setTimeout(res, 250))
  }

  console.log(`[cron/newsletter] week ${isoWeek(now)} "${issue.themeTitle}" sent=${sent} failed=${failures.length}${preview ? ' (preview)' : ''}`)
  return NextResponse.json({ sent, failed: failures.length, failures, preview, subject: issue.subject })
}
