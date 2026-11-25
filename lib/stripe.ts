import Stripe from 'stripe'

// Note: no module-level Stripe instance — routes construct their own client so
// the build (which has no STRIPE_SECRET_KEY) can collect page data.

/**
 * Pricing (decided 2026-10-18):
 *   Free   — $0, no card. Unlimited plans, list, one-tap Instacart cart.
 *   Family — $4.99/mo or $39/yr, 14-day free trial, card at signup.
 *
 * Prices are resolved by Stripe lookup_key so no price IDs live in env vars.
 * If a price is missing it is created once (idempotent on lookup_key).
 * The legacy $9 price (price_1TBEm3BnujZBkm2Rdirr7XtN) stays on existing
 * subscriptions untouched.
 */
export type FamilyInterval = 'monthly' | 'yearly'

export const FAMILY_PRICING = {
  monthly: { lookupKey: 'family_monthly', unitAmount: 499, interval: 'month' as const, label: '$4.99/month' },
  yearly: { lookupKey: 'family_yearly', unitAmount: 3900, interval: 'year' as const, label: '$39/year' },
}

// One place for the trial rule (Nov 22 2026 review): lib/trial-date is client-safe, so /subscribe can use it too.
export { FAMILY_TRIAL_DAYS } from './trial-date'

/** Founding families get Family free for their first year (Sarah, 2026-10-18): through midnight ET on Oct 18, 2027. */
export const FOUNDING_FAMILY_YEAR_END = '2027-10-18T04:00:00.000Z'

const FAMILY_PRODUCT_NAME = 'DinnerDrop Family'

async function findOrCreateFamilyProduct(client: Stripe): Promise<string> {
  const search = await client.products.search({ query: `name:'${FAMILY_PRODUCT_NAME}' AND active:'true'`, limit: 1 })
  if (search.data[0]) return search.data[0].id
  const product = await client.products.create({
    name: FAMILY_PRODUCT_NAME,
    description: 'Per-kid preferences, plan from favorites, family texting, shared household, Kroger cart push, busy-night scheduling, cook mode.',
    metadata: { tier: 'family' },
  })
  return product.id
}

/** Returns the Stripe price ID for the Family tier at the given interval, creating it on first use. */
export async function getFamilyPriceId(client: Stripe, interval: FamilyInterval): Promise<string> {
  const cfg = FAMILY_PRICING[interval]
  const existing = await client.prices.list({ lookup_keys: [cfg.lookupKey], active: true, limit: 1 })
  if (existing.data[0]) return existing.data[0].id
  const productId = await findOrCreateFamilyProduct(client)
  const price = await client.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: cfg.unitAmount,
    recurring: { interval: cfg.interval },
    lookup_key: cfg.lookupKey,
    transfer_lookup_key: true,
    nickname: `Family ${interval}`,
    metadata: { tier: 'family', interval },
  })
  return price.id
}

/**
 * Black Friday 2026 coupon (50% off the first yearly charge), created once in whichever Stripe account the site's key
 * belongs to (the live account isn't reachable from Cowork's Stripe connector). Stops working after the sale deadline.
 */
export async function getBlackFridayCouponId(client: Stripe): Promise<string> {
  const { BF_SALE } = await import('./bf-sale')
  try {
    const c = await client.coupons.retrieve(BF_SALE.couponId)
    if (c && c.valid) return c.id
    if (c) throw new Error('Black Friday coupon is no longer valid')
  } catch { /* not created yet */ }
  const c = await client.coupons.create({
    id: BF_SALE.couponId,
    name: 'Black Friday: 50% off your first year',
    percent_off: BF_SALE.percentOff,
    // 'repeating' for 12 months, not 'once': with a free trial the first invoice is $0, and the discount must still
    // cover the first paid yearly charge (day 15). The renewal a year later is past the 12 months, so it's full price.
    duration: 'repeating',
    duration_in_months: 12,
    redeem_by: Math.floor(new Date(BF_SALE.endsAt).getTime() / 1000) + 3600,
    metadata: { sale: BF_SALE.id },
  })
  return c.id
}

