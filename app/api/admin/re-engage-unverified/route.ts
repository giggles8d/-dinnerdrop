import React from 'react'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import ReEngageUnverified from '@/emails/ReEngageUnverified'

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * One-shot admin endpoint to re-engage users who signed up but never verified their email.
 *
 * Sends a branded Resend email pointing back to /subscribe?coupon=BETA100 so they can finish signup.
 *
 * Auth — accepts EITHER:
 *   1. x-admin-secret header matching SETUP_SECRET (for headless/curl use), OR
 *   2. Authenticated Supabase session whose email matches ADMIN_EMAIL (so Sarah can fire it
 *      via her existing browser session, no secret needed).
 *
 * Also supports GET for browser-based invocation (uses session auth only — GET shouldn't accept
 * a secret in the URL). Optional query/body params: {"daysBack": 60, "dryRun": true}.
 */

async function checkAuth(request: NextRequest): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Option 1 — x-admin-secret header
  const secret = request.headers.get('x-admin-secret')
  if (secret && secret === process.env.SETUP_SECRET) return { ok: true }

  // Option 2 — Supabase session cookie matching ADMIN_EMAIL
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
  return handle(request, true /* default dryRun=true for GET */)
}

export async function POST(request: NextRequest) {
  return handle(request, false)
}

async function handle(request: NextRequest, defaultDryRun: boolean) {
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

  // Parse optional body (POST) or query (GET)
  let opts: { daysBack?: number; dryRun?: boolean } = {}
  if (request.method === 'POST') {
    try { opts = (await request.json()) ?? {} } catch { /* no body */ }
  } else {
    const url = new URL(request.url)
    const daysBackParam = url.searchParams.get('daysBack')
    const dryRunParam = url.searchParams.get('dryRun')
    if (daysBackParam) opts.daysBack = parseInt(daysBackParam, 10)
    if (dryRunParam !== null) opts.dryRun = dryRunParam !== 'false' && dryRunParam !== '0'
  }
  const daysBack = opts.daysBack ?? 60
  const dryRun = opts.dryRun ?? defaultDryRun

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
