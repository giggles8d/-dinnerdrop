import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getProduct } from '@/lib/products'

// One-time (guest) checkout for a digital download. Inline price_data means we
// don't need a Stripe Price object per product — just the catalog in lib/products.
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(req: Request) {
  try {
    const { productId } = await req.json().catch(() => ({}))
    const product = productId ? getProduct(productId) : undefined

    if (!product || !product.active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(product.priceUsd * 100),
            product_data: {
              name: product.name,
              description: product.description.slice(0, 300),
            },
          },
        },
      ],
      // Guest checkout — Stripe collects the email for the receipt + delivery.
      success_url: `${appUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/shop`,
      metadata: { product_id: product.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Shop checkout error:', message)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
