import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
    const couponCode: string | undefined = body?.couponCode

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

    // BETA100 = 6 months completely free with NO card collected.
    // We implement this via a 180-day Stripe trial (rock-solid, no coupon required)
    // and `payment_method_collection: 'if_required'` so the user can check out
    // without entering a card. We email them before the trial ends to add one.
    //
    // Any other coupon code falls back to the legacy discount flow.
    let sessionParams: Stripe.Checkout.SessionCreateParams

    if (couponCode === 'BETA100') {
      sessionParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: 'price_1TBEm3BnujZBkm2Rdirr7XtN', quantity: 1 }],
        success_url: `${appUrl}/dashboard?subscribed=true&beta=1`,
        cancel_url: `${appUrl}/subscribe?coupon=BETA100`,
        subscription_data: {
          trial_period_days: 180,
          metadata: { beta_member: 'true', source: 'BETA100' },
        },
        payment_method_collection: 'if_required',
        allow_promotion_codes: false,
      }
    } else {
      sessionParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: 'price_1TBEm3BnujZBkm2Rdirr7XtN', quantity: 1 }],
        success_url: `${appUrl}/dashboard?subscribed=true`,
        cancel_url: `${appUrl}/dashboard`,
        subscription_data: { trial_period_days: 7 },
      }
      if (couponCode) {
        sessionParams.discounts = [{ coupon: couponCode }]
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
