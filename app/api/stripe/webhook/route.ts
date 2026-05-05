import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import WelcomeBeta from '@/emails/WelcomeBeta'
import PaymentFailed from '@/emails/PaymentFailed'

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

        // Send welcome email to new beta user (graceful — skips if RESEND_API_KEY not set)
        if (process.env.RESEND_API_KEY) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const customerEmail = session.customer_details?.email
            const customerName = session.customer_details?.name ?? ''
            const firstName = customerName.split(' ')[0] || 'there'
            const trialEndFormatted = trialEnds.toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })
            if (customerEmail) {
              const html = await render(
                WelcomeBeta({ firstName, trialEndsDate: trialEndFormatted })
              )
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL ?? 'DinnerDrop <info@dinnerdrop.app>',
                to: customerEmail,
                subject: 'Welcome to DinnerDrop — you\'re in 🎉',
                html,
                headers: {
                  'List-Unsubscribe': '<https://dinnerdrop.app/unsubscribe?email=' + encodeURIComponent(customerEmail) + '>',
                },
              })
              console.log('Welcome email sent to ' + customerEmail)
            }
          } catch (emailErr) {
            console.error('Welcome email send failed:', emailErr)
          }
        } else {
          console.log('RESEND_API_KEY not set — skipping welcome email')
        }
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

    case 'invoice.payment_failed': {
      // Triggered when a subscription renewal charge fails.
      // Sets status to past_due so the dashboard can show a payment update banner.
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      if (customerId) {
        // 1. Update DB status to past_due
        const { data: profile } = await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
          .select('email, full_name')
          .single()

        console.log(`Payment failed for customer ${customerId} — set past_due`)

        // 2. Send dunning email (graceful — skips if RESEND_API_KEY not set)
        if (process.env.RESEND_API_KEY && profile?.email) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const firstName = (profile.full_name ?? '').split(' ')[0] || 'there'
            const html = await render(
              PaymentFailed({
                firstName,
                updatePaymentUrl: 'https://dinnerdrop.app/account',
              })
            )
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? 'DinnerDrop <info@dinnerdrop.app>',
              to: profile.email,
              subject: 'Action needed: update your DinnerDrop payment method',
              html,
              headers: {
                'List-Unsubscribe': `<https://dinnerdrop.app/unsubscribe?email=${encodeURIComponent(profile.email)}>`,
              },
            })
            console.log(`Dunning email sent to ${profile.email}`)
          } catch (emailErr) {
            console.error('Dunning email send failed:', emailErr)
          }
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
