import React from 'react'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import InstacartLive from '@/emails/InstacartLive'

const ADMIN_EMAIL = 'setzl1979@gmail.com'

// Marker stored in profiles.email_sequence_sent so re-invocations skip users
// who already got this announcement (activation uses 1-3, win-back uses 99).
const MARKER = 98
// 80 sends × ~300ms ≈ 25s — inside the 60s function limit. Resend's free tier
// caps at 100/day; reload ?confirm=send daily until `remaining` is 0.
const BATCH_SIZE = 80

export const maxDuration = 60

/**
 * One-shot admin endpoint (2026-10-16): "the one-tap Instacart cart is live".
 * Audience: EVERY account (founding members + non-members, planned or not) plus
 * waitlist emails that never became accounts. Excludes unsubscribed profiles,
 * internal @dinnerdrop.app accounts, and anyone already marked 98.
 *
 * Auth — accepts EITHER:
 *   1. x-admin-secret header matching SETUP_SECRET, OR
 *   2. Authenticated Supabase session matching ADMIN_EMAIL (Sarah's browser).
 *
 * Usage (Sarah, from her logged-in browser):
 *   GET  /api/admin/instacart-live?test=1        → 3 preview copies to ADMIN_EMAIL (founding / returning / waitlist)
 *   GET  /api/admin/instacart-live               → dry run: counts + sample
 *   GET  /api/admin/instacart-live?confirm=send  → sends the next batch
 */

const CTA_ACCOUNT = 'https://www.dinnerdrop.app/login?utm_source=email&utm_medium=instacart_live&utm_campaign=early'
const CTA_TRIAL = 'https://www.dinnerdrop.app/login?utm_source=email&utm_medium=instacart_live&utm_campaign=free'

async function checkAuth(request: NextRequest): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && secret === process.env.SETUP_SECRET) return { ok: true }
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return { ok: false, reason: 'config' }
    const cookieStore = cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        remove(name: string, options: CookieOptions) { cookieStore.delete(name) },
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email?.toLowerCase() === ADMIN_EMAIL) return { ok: true }
    return { ok: false, reason: user?.email ? `not_admin_email (got ${user.email})` : 'no_session' }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'auth_check_failed' }
  }
}

function firstNameFrom(email: string, fullName?: string | null) {
  if (fullName && fullName.trim()) return fullName.trim().split(/\s+/)[0]
  const raw = email.split('@')[0].replace(/[^a-zA-Z]/g, '') || 'there'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function subjectFor(kind: 'founding' | 'returning' | 'waitlist') {
  if (kind === 'founding') return 'Family is yours free for a year — and the one-tap Instacart cart is live'
  if (kind === 'waitlist') return 'DinnerDrop is open — free, no card, and the Instacart cart is live'
  return 'One tap, your whole grocery list in your Instacart cart — it’s live'
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  if (url.searchParams.get('test') === '1') return handleTest(request)
  const dryRun = url.searchParams.get('confirm') !== 'send'
  return handle(request, dryRun)
}

export async function POST(request: NextRequest) {
  let opts: { dryRun?: boolean } = {}
  try { opts = (await request.json()) ?? {} } catch { /* no body */ }
  return handle(request, opts.dryRun ?? false)
}

async function handleTest(request: NextRequest) {
  const auth = await checkAuth(request)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized', detail: auth.reason }, { status: 401 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>'
  const variants: Array<{ kind: 'founding' | 'returning' | 'waitlist'; props: Record<string, unknown> }> = [
    { kind: 'founding', props: { firstName: 'Sarah', isFoundingMember: true, ctaUrl: CTA_ACCOUNT } },
    { kind: 'returning', props: { firstName: 'Sarah', isFoundingMember: false, ctaUrl: CTA_TRIAL } },
    { kind: 'waitlist', props: { firstName: 'Sarah', isFoundingMember: false, isWaitlist: true, ctaUrl: CTA_TRIAL } },
  ]
  const results: Array<{ kind: string; id?: string; error?: unknown }> = []
  for (const v of variants) {
    const html = await render(React.createElement(InstacartLive, v.props))
    const { data, error } = await resend.emails.send({
      from, to: ADMIN_EMAIL, subject: `[TEST ${v.kind}] ${subjectFor(v.kind)}`, html,
    })
    results.push({ kind: v.kind, id: data?.id, error: error ?? undefined })
    await new Promise<void>((r) => setTimeout(r, 300))
  }
  return NextResponse.json({ test: true, sentTo: ADMIN_EMAIL, results })
}

async function handle(request: NextRequest, dryRun: boolean) {
  const auth = await checkAuth(request)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized', detail: auth.reason }, { status: 401 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: profiles, error: profErr }, { data: waitlistRows }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, is_beta_member, email_unsubscribed, email_sequence_sent'),
    supabase.from('waitlist').select('email, created_at'),
  ])
  if (profErr || !profiles) {
    return NextResponse.json({ error: 'Failed to list profiles', detail: profErr?.message }, { status: 500 })
  }

  type Target = {
    key: string
    email: string
    firstName: string
    kind: 'founding' | 'returning' | 'waitlist'
    profileId?: string
    priorMarkers?: number[]
  }

  const accountEmails = new Set<string>()
  const targets: Target[] = []
  let excludedUnsub = 0, excludedSent = 0, excludedInternal = 0

  for (const p of profiles) {
    const email = (p.email || '').toLowerCase().trim()
    if (!email) continue
    accountEmails.add(email)
    if (email.endsWith('@dinnerdrop.app')) { excludedInternal++; continue }
    if (p.email_unsubscribed) { excludedUnsub++; continue }
    const markers = (p.email_sequence_sent as number[] | null) || []
    if (markers.includes(MARKER)) { excludedSent++; continue }
    targets.push({
      key: email, email,
      firstName: firstNameFrom(email, p.full_name),
      kind: p.is_beta_member ? 'founding' : 'returning',
      profileId: p.id,
      priorMarkers: markers,
    })
  }

  // Waitlist contacts who never created an account. There is no marker column
  // on waitlist, so these are keyed by email and only sent when ?confirm=send
  // runs with waitlist=1 — keeps re-runs idempotent for accounts and lets the
  // waitlist go out exactly once.
  const url = new URL(request.url)
  const includeWaitlist = url.searchParams.get('waitlist') === '1'
  const waitlistTargets: Target[] = []
  for (const w of waitlistRows || []) {
    const email = (w.email || '').toLowerCase().trim()
    if (!email || accountEmails.has(email) || email.endsWith('@dinnerdrop.app')) continue
    if (waitlistTargets.some((t) => t.email === email)) continue
    waitlistTargets.push({ key: email, email, firstName: firstNameFrom(email), kind: 'waitlist' })
  }

  const allTargets = includeWaitlist ? [...targets, ...waitlistTargets] : targets
  const batch = allTargets.slice(0, BATCH_SIZE)

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      accounts: targets.length,
      byKind: {
        founding: targets.filter((t) => t.kind === 'founding').length,
        returning: targets.filter((t) => t.kind === 'returning').length,
        waitlist: waitlistTargets.length,
      },
      excluded: { unsubscribed: excludedUnsub, alreadySent: excludedSent, internal: excludedInternal },
      sample: allTargets.slice(0, 8).map((t) => `${t.kind}: ${t.email}`),
      sendUrl: '/api/admin/instacart-live?confirm=send  (add &waitlist=1 on the FINAL run to include waitlist emails once)',
    })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>'
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  const sent: string[] = []
  const failed: Array<{ email: string; error: string }> = []
  let first = true

  for (const t of batch) {
    if (!first) await sleep(250)
    first = false
    const unsubscribeUrl = t.profileId
      ? `https://www.dinnerdrop.app/unsubscribe?uid=${t.profileId}`
      : `https://www.dinnerdrop.app/unsubscribe?email=${encodeURIComponent(t.email)}`
    try {
      const html = await render(
        React.createElement(InstacartLive, {
          firstName: t.firstName,
          isFoundingMember: t.kind === 'founding',
          isWaitlist: t.kind === 'waitlist',
          ctaUrl: t.kind === 'founding' ? CTA_ACCOUNT : CTA_TRIAL,
          unsubscribeUrl,
        })
      )
      const { error } = await resend.emails.send({
        from, to: t.email, subject: subjectFor(t.kind), html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
      if (error) {
        failed.push({ email: t.email, error: typeof error === 'string' ? error : JSON.stringify(error) })
      } else {
        sent.push(t.email)
        if (t.profileId) {
          await supabase.from('profiles')
            .update({ email_sequence_sent: [...(t.priorMarkers || []), MARKER] })
            .eq('id', t.profileId)
        }
      }
    } catch (err) {
      failed.push({ email: t.email, error: err instanceof Error ? err.message : 'unknown' })
    }
  }

  const remaining = allTargets.length - batch.length
  return NextResponse.json({
    sent: sent.length,
    failed: failed.length,
    remaining,
    ...(remaining > 0 ? { nextStep: 'Reload ?confirm=send to send the next batch' } : {}),
    details: { failed },
  })
}
