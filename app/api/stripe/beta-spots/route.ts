import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
}

export async function GET() {
  try {
    const stripe = getStripe()
    const coupon = await stripe.coupons.retrieve('BETA100')
    const spotsRemaining = 100 - (coupon.times_redeemed || 0)
    return NextResponse.json({ spotsRemaining })
  } catch (error) {
    console.error('Error fetching beta spots:', error)
    return NextResponse.json({ spotsRemaining: 100 }, { status: 200 })
  }
}
