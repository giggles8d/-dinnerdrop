import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
}

// Use service role client to bypass RLS for webhook updates
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string

      if (customerId) {
        // New checkout creates a trialing subscription — set trialing, not active.
        // trial_starts_at = now; trial_ends_at = 7 days from now (standard trial period).
        // customer.subscription.updated will update trial_ends_at with the exact Stripe timestamp.
        const now = new Date()
        const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'trialing',
            trial_starts_at: now.toISOString(),
            trial_ends_at: trialEnds.toISOString(),
          })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      // Preserve trialing vs active distinction so dashboard upgrade banner works correctly
      const statusMap: Record<string, string> = {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'canceled',
        incomplete: 'canceled',
        incomplete_expired: 'canceled',
        paused: 'canceled',
      }
      const status = statusMap[subscription.status] ?? 'canceled'

      // Sync exact trial_ends_at from Stripe (overrides the estimate set at checkout)
      const trialEndAt = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null

      await supabase
        .from('profiles')
        .update({
          subscription_status: status,
          ...(trialEndAt !== null && { trial_ends_at: trialEndAt }),
        })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('profiles')
        .update({ subscription_status: 'canceled' })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
