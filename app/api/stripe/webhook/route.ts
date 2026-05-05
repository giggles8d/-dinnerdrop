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
      const customerEmail = session.customer_details?.email
      const customerName = session.customer_details?.name ?? ''

      if (customerId) {
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

        if (process.env.RESEND_API_KEY) {
          // Welcome email to new beta user
          try {
            const resend = new Resend(process.env.RESEND_API_KEY)
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
                subject: "Welcome to DinnerDrop — you're in",
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

          // Admin notification to Sarah
          if (customerEmail) {
            try {
              const resendAdmin = new Resend(process.env.RESEND_API_KEY)
              let spotsRemaining = 100
              try {
                const coupon = await stripe.coupons.retrieve('BETA100')
                spotsRemaining = 100 - (coupon.times_redeemed || 0)
              } catch { /* coupon may not exist yet */ }
              const signupTime = new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York',
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
              })
              const spotsColor = spotsRemaining < 20 ? '#dc2626' : '#1a5c38'
              await resendAdmin.emails.send({
                from: process.env.RESEND_FROM_EMAIL ?? 'DinnerDrop <info@dinnerdrop.app>',
                to: 'info@dinnerdrop.app',
                subject: `New beta signup: ${customerEmail} (${spotsRemaining} spots left)`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
                  <h2 style="color:#1a5c38;margin-top:0">New Beta Signup!</h2>
                  <p style="font-size:15px;color:#333">A new user just joined DinnerDrop beta.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
                    <tr><td style="padding:10px 8px;color:#666;font-weight:600;width:130px">Name</td><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">${customerName || '(not provided)'}</td></tr>
                    <tr style="background:#fafafa"><td style="padding:10px 8px;color:#666;font-weight:600">Email</td><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">${customerEmail}</td></tr>
                    <tr><td style="padding:10px 8px;color:#666;font-weight:600">Signed up</td><td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">${signupTime} EST</td></tr>
                    <tr style="background:#fafafa"><td style="padding:10px 8px;color:#666;font-weight:600">Spots left</td><td style="padding:10px 8px;color:${spotsColor};font-weight:700;font-size:16px">${spotsRemaining} / 100</td></tr>
                  </table>
                  <p><a href="https://dashboard.stripe.com/customers" style="background:#1a5c38;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-size:14px">View in Stripe</a></p>
                  <p style="color:#999;font-size:11px;margin-top:24px">DinnerDrop automated notification</p>
                </div>`,
              })
              console.log(`[webhook] Admin notification sent for beta signup: ${customerEmail}`)
            } catch (adminNotifyErr) {
              console.error('[webhook] Admin notification email failed:', adminNotifyErr)
            }
          }
        } else {
          console.log('RESEND_API_KEY not set — skipping emails')
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
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      if (customerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
          .select('email, full_name')
          .single()

        console.log(`Payment failed for customer ${customerId} — set past_due`)

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
