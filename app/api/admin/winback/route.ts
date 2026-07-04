import React from 'react'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import WinBack from '@/emails/WinBack'
import { amazonSearchUrl } from '@/lib/amazon-affiliate'

const ADMIN_EMAIL = 'setzl1979@gmail.com'

// Marker stored in profiles.email_sequence_sent so re-invocations skip users
// who already got the win-back (activation sequence uses 1-3).
const WINBACK_MARKER = 99
// 80 sends × ~550ms (rate-limit sleep + send RTT) ≈ 45s — safely inside the
// 60s function limit. Note: Resend free tier also caps at 100 emails/day, so
// the full list may take 2-3 days of batches — the endpoint handles that.
const BATCH_SIZE = 80

export const maxDuration = 60

/**
 * One-shot admin endpoint: win-back email to every signup who never generated
 * a meal plan. Excludes: activated users (have a meal_plans row), unsubscribed
 * profiles, and internal @dinnerdrop.app accounts.
 *
 * Auth — accepts EITHER:
 *   1. x-admin-secret header matching SETUP_SECRET (headless/curl use), OR
 *   2. Authenticated Supabase session matching ADMIN_EMAIL (Sarah's browser).
 *
 * Usage (Sarah, from her logged-in browser):
 *   GET  /api/admin/winback              → dry run: who would get it + count
 *   GET  /api/admin/winback?confirm=send → sends the next batch of 100
 *
 * Sends are chunked (80/call, ~45s within Vercel's 60s limit; already-sent
 * users are recorded in profiles.email_sequence_sent as 99 and excluded), so
 * just reload the ?confirm=send URL until `remaining` hits 0.
 */

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  // ?test=1 → send a single preview copy to ADMIN_EMAIL, nothing else
  if (url.searchParams.get('test') === '1') {
    return handleTest(request)
  }
  const dryRun = url.searchParams.get('confirm') !== 'send'
  return handle(request, dryRun)
}

async function handleTest(request: NextRequest) {
  const auth = await checkAuth(request)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized', detail: auth.reason }, { status: 401 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const html = await render(
    React.createElement(WinBack, {
      firstName: 'Sarah',
      unsubscribeUrl: 'https://dinnerdrop.app/unsubscribe',
      amazonPickUrl: amazonSearchUrl('nonstick sheet pan set'),
    })
  )
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to: ADMIN_EMAIL,
    subject: '[TEST] We rebuilt DinnerDrop — your week of dinners now takes 30 seconds',
    html,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ test: true, sentTo: ADMIN_EMAIL, id: data?.id })
}

export async function POST(request: NextRequest) {
  let opts: { dryRun?: boolean } = {}
  try { opts = (await request.json()) ?? {} } catch { /* no body */ }
  return handle(request, opts.dryRun ?? false)
}

async function handle(request: NextRequest, dryRun: boolean) {
  const auth = await checkAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', detail: auth.reason }, { status: 401 })
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // All users (admin API — includes email even before migration 010 backfill)
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr || !usersData?.users) {
    return NextResponse.json({ error: 'Failed to list users', detail: listErr?.message }, { status: 500 })
  }

  // Exclusion sets: activated users, unsubscribed profiles, already-sent (99 marker)
  const [{ data: planRows }, { data: profileRows }] = await Promise.all([
    supabase.from('meal_plans').select('user_id'),
    supabase.from('profiles').select('id, email_unsubscribed, email_sequence_sent'),
  ])
  const activated = new Set((planRows || []).map(r => r.user_id))
  const unsubscribed = new Set((profileRows || []).filter(r => r.email_unsubscribed === true).map(r => r.id))
  const alreadySent = new Set(
    (profileRows || [])
      .filter(r => Array.isArray(r.email_sequence_sent) && r.email_sequence_sent.includes(WINBACK_MARKER))
      .map(r => r.id)
  )
  const sentMarkers = new Map(
    (profileRows || []).map(r => [r.id, (r.email_sequence_sent as number[] | null) || []])
  )

  const allTargets = usersData.users.filter(u => {
    if (!u.email) return false
    if (u.email.toLowerCase().endsWith('@dinnerdrop.app')) return false // internal accounts
    if (activated.has(u.id)) return false
    if (unsubscribed.has(u.id)) return false
    if (alreadySent.has(u.id)) return false
    return true
  })
  const targets = allTargets.slice(0, BATCH_SIZE)

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      count: allTargets.length,
      excluded: { activated: activated.size, unsubscribed: unsubscribed.size, alreadySent: alreadySent.size },
      sample: allTargets.slice(0, 10).map(u => u.email),
      sendUrl: '/api/admin/winback?confirm=send',
    })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>'
  const amazonPickUrl = amazonSearchUrl('nonstick sheet pan set')
  const sent: Array<{ email: string; id?: string }> = []
  const failed: Array<{ email: string; error: string }> = []
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  let isFirst = true

  for (const u of targets) {
    if (!isFirst) await sleep(250) // Resend rate limit ~5/sec
    isFirst = false
    if (!u.email) continue

    const unsubscribeUrl = `https://dinnerdrop.app/unsubscribe?uid=${u.id}`
    const raw = u.email.split('@')[0].replace(/[^a-zA-Z]/g, '') || 'there'
    const firstName = raw.charAt(0).toUpperCase() + raw.slice(1)

    try {
      const html = await render(
        React.createElement(WinBack, { firstName, unsubscribeUrl, amazonPickUrl })
      )
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: u.email,
        subject: 'We rebuilt DinnerDrop — your week of dinners now takes 30 seconds',
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
        // Record the marker so the next batch call skips this user
        const prior = sentMarkers.get(u.id) || []
        await supabase.from('profiles')
          .update({ email_sequence_sent: [...prior, WINBACK_MARKER] })
          .eq('id', u.id)
      }
    } catch (err) {
      failed.push({ email: u.email, error: err instanceof Error ? err.message : 'unknown' })
    }
  }

  const remaining = allTargets.length - targets.length
  return NextResponse.json({
    sent: sent.length,
    failed: failed.length,
    remaining,
    ...(remaining > 0 ? { nextStep: 'Reload /api/admin/winback?confirm=send to send the next batch' } : {}),
    details: { failed },
  })
}
