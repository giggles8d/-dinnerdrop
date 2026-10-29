import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { GIFT_PLANS, type GiftPlanId } from '@/lib/gifts'

export const dynamic = 'force-dynamic'

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '')

/**
 * POST { plan: '3'|'6'|'12', buyerName, buyerEmail, recipientName, recipientEmail?, message?, deliver: 'now'|'me' }
 * → a Stripe Checkout URL (one-time payment). No account needed to buy a gift.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const planId = (['3', '6', '12'].includes(String(b.plan)) ? String(b.plan) : '3') as GiftPlanId
  const plan = GIFT_PLANS[planId]
  const buyerEmail = clean(b.buyerEmail, 200)
  const recipientEmail = clean(b.recipientEmail, 200)
  const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  if (buyerEmail && !emailOk(buyerEmail)) return NextResponse.json({ error: 'Check your email address.' }, { status: 400 })
  if (recipientEmail && !emailOk(recipientEmail)) return NextResponse.json({ error: "Check the recipient's email address." }, { status: 400 })
  const deliver = b.deliver === 'now' && recipientEmail ? 'now' : 'me'

  const app = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: plan.cents,
          product_data: { name: `DinnerDrop Family — ${plan.label} gift`, description: 'Weekly dinner plans, one grocery list, one tap to Instacart. Starts when they sign up; no card needed for them.' },
        },
      }],
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
      metadata: {
        kind: 'gift', plan: planId, deliver,
        buyer_name: clean(b.buyerName, 80), recipient_name: clean(b.recipientName, 80), recipient_email: recipientEmail, message: clean(b.message, 300),
      },
      payment_intent_data: { description: `DinnerDrop gift — ${plan.label}` },
      success_url: `${app}/gift/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${app}/gift?canceled=1`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[gift/checkout]', e)
    return NextResponse.json({ error: 'Checkout is unavailable right now. Please try again in a minute.' }, { status: 500 })
  }
}
