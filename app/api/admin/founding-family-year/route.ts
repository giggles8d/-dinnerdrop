import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getFamilyPriceId, FOUNDING_FAMILY_YEAR_END } from '@/lib/stripe'

/**
 * One-shot admin endpoint (Sarah, 2026-10-18): every founding family
 * (profiles.is_beta_member = true) gets the Family plan free for a full year
 * starting today — through 2027-10-18 — then $4.99/month only if they keep it.
 *
 * What it does, per founding profile:
 *   - profiles.trial_ends_at = FOUNDING_YEAR_END (and trial_starts_at = today if empty)
 *   - if they have a Stripe subscription that is trialing/active: move it to the
 *     Family monthly price and extend trial_end to FOUNDING_YEAR_END (no proration,
 *     nothing charged). Canceled subscriptions are left alone.
 *   - profiles.subscription_status = 'trialing' when a Stripe subscription exists;
 *     profiles without one stay 'free' + is_beta_member (the app treats that as Family).
 *
 * Auth: x-admin-secret = SETUP_SECRET, or Sarah's logged-in session.
 * Usage: GET ?dry=1 (default) → counts + sample.  GET ?confirm=apply → applies.
 * Idempotent: re-running updates the same rows to the same values.
 */

const ADMIN_EMAIL = 'setzl1979@gmail.com'
const FOUNDING_YEAR_END_ISO = FOUNDING_FAMILY_YEAR_END
const FOUNDING_YEAR_START_ISO = '2026-10-18T04:00:00.000Z'

export const maxDuration = 60

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
    return { ok: false, reason: user?.email ? 'not_admin_email' : 'no_session' }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'auth_check_failed' }
  }
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized', detail: auth.reason }, { status: 401 })
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
  }

  const url = new URL(request.url)
  const apply = url.searchParams.get('confirm') === 'apply'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const { data: founders, error } = await supabase
    .from('profiles')
    .select('id, email, subscription_status, trial_ends_at, stripe_customer_id')
    .eq('is_beta_member', true)
  if (error || !founders) {
    return NextResponse.json({ error: 'Failed to list founding profiles', detail: error?.message }, { status: 500 })
  }

  const withStripe = founders.filter((f) => !!f.stripe_customer_id)
  const summary = {
    foundingFamilies: founders.length,
    withStripeCustomer: withStripe.length,
    byStatus: founders.reduce<Record<string, number>>((acc, f) => {
      const k = f.subscription_status || 'free'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {}),
    familyFreeThrough: FOUNDING_YEAR_END_ISO,
  }

  if (!apply) {
    return NextResponse.json({
      dryRun: true,
      ...summary,
      sample: founders.slice(0, 5).map((f) => `${f.email} · ${f.subscription_status || 'free'} · trial_ends ${f.trial_ends_at ?? '—'} · stripe ${f.stripe_customer_id ? 'yes' : 'no'}`),
      applyUrl: '/api/admin/founding-family-year?confirm=apply',
    })
  }

  const familyPriceId = await getFamilyPriceId(stripe, 'monthly')
  const trialEndUnix = Math.floor(new Date(FOUNDING_YEAR_END_ISO).getTime() / 1000)

  const results = { profilesUpdated: 0, subscriptionsUpdated: 0, subscriptionsSkipped: 0, errors: [] as string[] }

  for (const f of founders) {
    // 1) Stripe subscription (if any)
    let hasLiveSub = false
    if (f.stripe_customer_id) {
      try {
        const subs = await stripe.subscriptions.list({ customer: f.stripe_customer_id, status: 'all', limit: 5 })
        for (const sub of subs.data) {
          if (sub.status !== 'trialing' && sub.status !== 'active') { results.subscriptionsSkipped++; continue }
          const item = sub.items.data[0]
          const alreadyDone = item?.price?.id === familyPriceId && sub.trial_end === trialEndUnix
          if (!alreadyDone) {
            await stripe.subscriptions.update(sub.id, {
              items: item ? [{ id: item.id, price: familyPriceId }] : undefined,
              trial_end: trialEndUnix,
              proration_behavior: 'none',
              metadata: { ...sub.metadata, founding_family_year: 'true', founding_year_end: FOUNDING_YEAR_END_ISO },
            })
            results.subscriptionsUpdated++
          }
          hasLiveSub = true
        }
      } catch (err) {
        results.errors.push(`${f.email}: ${err instanceof Error ? err.message : 'stripe error'}`)
      }
    }

    // 2) Profile
    const update: Record<string, unknown> = {
      trial_ends_at: FOUNDING_YEAR_END_ISO,
    }
    if (hasLiveSub) update.subscription_status = 'trialing'
    const { data: existing } = await supabase.from('profiles').select('trial_starts_at').eq('id', f.id).single()
    if (!existing?.trial_starts_at) update.trial_starts_at = FOUNDING_YEAR_START_ISO
    const { error: upErr } = await supabase.from('profiles').update(update).eq('id', f.id)
    if (upErr) results.errors.push(`${f.email}: ${upErr.message}`)
    else results.profilesUpdated++
  }

  return NextResponse.json({ applied: true, ...summary, ...results })
}
