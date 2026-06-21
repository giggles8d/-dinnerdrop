import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getProduct } from '@/lib/products'

// Verifies a Stripe Checkout session was actually paid, then returns a
// short-lived signed download URL for the purchased file. This is the only way
// to reach a paid file — the storage bucket is private.
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }

    const productId = session.metadata?.product_id
    const product = productId ? getProduct(productId) : undefined
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Record the sale (idempotent on the unique stripe_session_id).
    await supabase.from('shop_purchases').upsert(
      {
        stripe_session_id: session.id,
        product_id: product.id,
        email: session.customer_details?.email ?? null,
        amount_total: session.amount_total ?? null,
      },
      { onConflict: 'stripe_session_id' }
    )

    const { data, error } = await supabase.storage
      .from('shop-downloads')
      .createSignedUrl(product.fileKey, 60 * 60 * 24) // 24h

    if (error || !data?.signedUrl) {
      console.error('Signed URL error:', error?.message)
      return NextResponse.json(
        { error: 'Your file is being prepared — please contact support@dinnerdrop.app.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      name: product.name,
      downloadUrl: data.signedUrl,
      email: session.customer_details?.email ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Shop download error:', message)
    return NextResponse.json({ error: 'Could not verify your purchase' }, { status: 500 })
  }
}
