/**
 * Black Friday 2026 sale (Sarah, Nov 25 2026): Family yearly 50% off the first year ($39 -> $19.50) and gift
 * subscriptions 50% off, from now until Mon Nov 30, 11:59 PM ET. A price cut at checkout, not extra free days, so it
 * respects the Nov 22 "no stacking free-day offers" rule (lib/offer-policy.ts). Client-safe: no server imports.
 * After the deadline everything here turns itself off; nothing else needs to change.
 */
export const BF_SALE = {
  id: 'bf-2026',
  endsAt: '2026-12-01T04:59:59Z',          // Mon Nov 30, 11:59 PM ET
  couponId: 'BF2026_YEARLY50',              // created on first use by lib/stripe.ts getBlackFridayCouponId (Amazon deals live in lib/black-friday.ts)
  percentOff: 50,
  yearlyPrice: '$19.50',
  yearlyFull: '$39',
  deadlineLabel: 'Mon, Nov 30 at 11:59 PM ET',
}

export function blackFridayOpen(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(BF_SALE.endsAt).getTime()
}

/** Gift price in cents during the sale (50% off, rounded to whole dollars). */
export function giftSaleCents(cents: number, now: Date = new Date()): number {
  return blackFridayOpen(now) ? Math.round(cents / 200) * 100 : cents
}
