/**
 * Meta Conversions API events from the Stripe webhook. (Nov 22 2026 review, Sarah approved)
 *
 *  - StartTrial on checkout.session.completed when the new subscription is trialing.
 *    event_id = trial_<checkout session id>, the same id the browser uses on /dashboard?subscribed=true.
 *    Value = predicted value of one Family month ($4.99); no money is charged at trial start.
 *  - Purchase (every invoice actually paid, amount > 0) and Subscribe (the first paid invoice of a
 *    subscription) on invoice.paid. event_id = the invoice id. Server only: no browser is present when
 *    Stripe charges, so action_source is 'system_generated' (Meta's value for auto-pay renewals).
 *
 * Browser signals for matching (user agent, IP, _fbp, _fbc) are saved on the Checkout Session metadata by
 * app/api/stripe/create-checkout-session (fbp/fbc also on the subscription, for later invoices).
 * Never throws: a Meta problem must never fail a Stripe webhook.
 */
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { metaCapiEnabled, sendMetaEvent } from '@/lib/meta-capi'
import { TRIAL_PREDICTED_VALUE, trialEventId } from '@/lib/meta-events'
import { isTestProfile } from '@/lib/tracking-env'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
const idOf = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id ?? null)

async function profileFor(supabase: SupabaseClient, customerId: string | null) {
  if (!customerId) return null
  const { data } = await supabase.from('profiles').select('id, email, settings').eq('stripe_customer_id', customerId).maybeSingle()
  return data as { id: string; email: string | null; settings: unknown } | null
}

/** Call from checkout.session.completed. */
export async function metaStartTrialFromCheckout(stripe: Stripe, supabase: SupabaseClient, session: Stripe.Checkout.Session, eventCreated: number): Promise<void> {
  if (!metaCapiEnabled()) return
  try {
    if (session.mode !== 'subscription' || (session.amount_total ?? 0) > 0) return // paid now: Purchase covers it
    const subId = idOf(session.subscription as string | Stripe.Subscription | null)
    if (!subId) return
    const sub = await stripe.subscriptions.retrieve(subId)
    if (sub.status !== 'trialing') return
    const customerId = idOf(session.customer as string | Stripe.Customer | null)
    const prof = await profileFor(supabase, customerId)
    if (isTestProfile(prof)) return // test accounts never reach Meta (Sarah, Nov 25 2026)
    const md = session.metadata ?? {}
    const ua = md.dd_ua || null
    await sendMetaEvent({
      eventName: 'StartTrial',
      eventId: trialEventId(session.id),
      eventTime: Math.min(eventCreated, Math.floor(Date.now() / 1000)),
      // Meta requires the user agent for website events; checkouts started before this change don't have it.
      actionSource: ua ? 'website' : 'system_generated',
      eventSourceUrl: `${APP_URL()}/subscribe`,
      user: {
        email: session.customer_details?.email ?? prof?.email ?? null,
        externalId: prof?.id ?? null,
        userAgent: ua, ip: md.dd_ip || null, fbp: md.dd_fbp || null, fbc: md.dd_fbc || null,
      },
      customData: { value: TRIAL_PREDICTED_VALUE, currency: 'USD', predicted_ltv: TRIAL_PREDICTED_VALUE },
    })
  } catch (err) {
    console.warn('[meta-stripe] StartTrial skipped:', err instanceof Error ? err.name : 'error')
  }
}

/** Call from invoice.paid. */
export async function metaPurchaseFromInvoice(stripe: Stripe, supabase: SupabaseClient, invoice: Stripe.Invoice, eventCreated: number): Promise<void> {
  if (!metaCapiEnabled()) return
  try {
    if (!(invoice.amount_paid > 0) || !invoice.id) return
    const customerId = idOf(invoice.customer as string | Stripe.Customer | null)
    const prof = await profileFor(supabase, customerId)
    if (isTestProfile(prof)) return // test accounts never reach Meta (Sarah, Nov 25 2026)
    const details = invoice.parent?.subscription_details ?? null
    const subId = idOf(details?.subscription as string | Stripe.Subscription | null | undefined)
    const md = details?.metadata ?? {}
    const value = Math.round(invoice.amount_paid) / 100
    const currency = (invoice.currency || 'usd').toUpperCase()
    const base = {
      eventId: invoice.id,
      eventTime: Math.min(eventCreated, Math.floor(Date.now() / 1000)),
      actionSource: 'system_generated' as const,
      eventSourceUrl: `${APP_URL()}/subscribe`,
      user: { email: prof?.email ?? invoice.customer_email ?? null, externalId: prof?.id ?? null, fbp: md.dd_fbp || null, fbc: md.dd_fbc || null },
    }
    await sendMetaEvent({ ...base, eventName: 'Purchase', customData: { value, currency, content_name: 'DinnerDrop Family' } })

    // Subscribe once per subscription: only when this is its first invoice with money paid.
    if (!subId) return
    const paid = await stripe.invoices.list({ subscription: subId, status: 'paid', limit: 100 })
    const earlierPaid = paid.data.filter((i) => i.id !== invoice.id && i.amount_paid > 0 && i.created <= invoice.created)
    if (earlierPaid.length) return
    await sendMetaEvent({ ...base, eventName: 'Subscribe', customData: { value, currency, predicted_ltv: value } })
  } catch (err) {
    console.warn('[meta-stripe] Purchase/Subscribe skipped:', err instanceof Error ? err.name : 'error')
  }
}
