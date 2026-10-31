import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { FAMILY_TRIAL_DAYS, getFamilyPriceId, type FamilyInterval } from '@/lib/stripe'

// Use the Stripe SDK default API version (pinned to the account in the Stripe dashboard).
// Previously hardcoded to a non-existent version which made every checkout fail.
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    let couponCode: string | undefined = body?.couponCode
    const interval: FamilyInterval = body?.interval === 'yearly' ? 'yearly' : 'monthly'

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const stripe = getStripe()
    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'

    // BETA100 (the founding offer, 6 months free with no card) closed 2026-10-16. Founding families are
    // already on their free Family year, so the code is ignored here — it used to still work if posted directly.
    if (couponCode === 'BETA100') couponCode = undefined
    let sessionParams: Stripe.Checkout.SessionCreateParams
    {
      // Family tier: $4.99/mo or $39/yr, 14-day free trial, card at signup.
      const priceId = await getFamilyPriceId(stripe, interval)
      sessionParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?subscribed=true`,
        cancel_url: `${appUrl}/subscribe`,
        subscription_data: {
          trial_period_days: FAMILY_TRIAL_DAYS,
          metadata: { tier: 'family', interval },
        },
        allow_promotion_codes: true,
      }
      if (couponCode) {
        sessionParams.discounts = [{ coupon: couponCode }]
        delete sessionParams.allow_promotion_codes
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    // Surface the real Stripe error in logs so failures are debuggable.
    const message = error instanceof Error ? error.message : String(error)
    console.error('Stripe checkout error:', message, error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', detail: message },
      { status: 500 }
    )
  }
}
