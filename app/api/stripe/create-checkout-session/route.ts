import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { FAMILY_TRIAL_DAYS, getFamilyPriceId, type FamilyInterval } from '@/lib/stripe'

// Use the Stripe SDK default API version (pinned to the account in the Stripe dashboard).
// Previously hardcoded to a non-existent version which made every checkout fail.
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

// Legacy $9/mo price — only used by the BETA100 founding-family path so those
// subscriptions keep their original terms. New checkouts use the Family prices.
const LEGACY_PRICE_ID = 'price_1TBEm3BnujZBkm2Rdirr7XtN'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const couponCode: string | undefined = body?.couponCode
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

    // BETA100 = the closed founding-family offer (6 months free, no card).
    // Kept so existing links keep working; new visitors never see it.
    let sessionParams: Stripe.Checkout.SessionCreateParams

    if (couponCode === 'BETA100') {
      sessionParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: LEGACY_PRICE_ID, quantity: 1 }],
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
