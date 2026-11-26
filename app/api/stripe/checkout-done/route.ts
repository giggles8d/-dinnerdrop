import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { trackStep } from '@/lib/activation'

export const dynamic = 'force-dynamic'

/**
 * Record a finished Family checkout as activation_events 'checkout_done' (Sarah, Nov 26 2026: Black Friday sale
 * tracking; there was no event for a finished purchase). Called once by the dashboard when Stripe sends the family
 * back (?subscribed=true&session_id=...). Read-only toward Stripe; the webhook is unchanged and still does the real
 * work. Recorded only for the caller's own, completed session, once per session.
 *   POST { sessionId } → { ok, recorded }
 * meta: interval, sale ('bf-2026' when the Black Friday coupon applied), coupon, amount (cents due today; $0 during a
 * trial), session (last 12 characters of the session id, for de-duplication).
 */
export async function POST(request: Request) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json().catch(() => ({})) as { sessionId?: unknown }
  const sessionId = typeof b.sessionId === 'string' && /^cs_(test|live)_[A-Za-z0-9]+$/.test(b.sessionId) ? b.sessionId : null
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok: false })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const tail = sessionId.slice(-12)
  const { count } = await admin.from('activation_events').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('step', 'checkout_done').eq('meta->>session', tail)
  if (count) return NextResponse.json({ ok: true, recorded: false })
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const [session, { data: profile }] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription', 'total_details.breakdown'] }),
      admin.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle(),
    ])
    const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (!customer || customer !== profile?.stripe_customer_id || session.status !== 'complete') return NextResponse.json({ ok: true, recorded: false })
    const sub = typeof session.subscription === 'object' && session.subscription ? session.subscription : null
    const md = (sub?.metadata ?? {}) as Record<string, string>
    // The coupon sits in different places across Stripe API versions; read it the way the webhook does.
    type D = { discount?: { coupon?: { id?: string }; source?: { coupon?: string | { id?: string } } } }
    const d0 = session.total_details?.breakdown?.discounts?.[0] as D | undefined
    const src = d0?.discount?.source?.coupon
    const coupon = d0?.discount?.coupon?.id ?? (typeof src === 'string' ? src : src?.id) ?? ''
    await trackStep(admin, user.id, 'checkout_done', {
      interval: md.interval ?? '', sale: md.sale ?? (coupon === 'BF2026_YEARLY50' ? 'bf-2026' : ''), coupon,
      amount: session.amount_total ?? null, trial: sub?.status === 'trialing', session: tail,
    })
    return NextResponse.json({ ok: true, recorded: true })
  } catch (e) {
    console.error('[checkout-done]', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false })
  }
}
