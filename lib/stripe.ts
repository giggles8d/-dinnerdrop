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

export const FAMILY_TRIAL_DAYS = 14

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
