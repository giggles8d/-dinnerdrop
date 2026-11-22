/**
 * Free Family rules, in one place (Nov 22 2026 review, Sarah approved):
 *   Every new family gets 14 days of Family free with no card (lib/family-grant.ts), then is asked for a card.
 *   No new offers that stack extra free Family days on top. Grants already given stay as they are.
 *
 * What this switches off (each file checks it):
 *   - lib/weekend-offer.ts   Thanksgiving first-list offer (90 days): honored until Sun Nov 22 11:59 PM ET, then never again
 *   - lib/cart-offer.ts      Nov 7-8 first-cart offer (90 days): ended Nov 8, can't be restarted by a date edit
 *   - lib/family-extend.ts   92-day extension when free Family ends: off even if app_kv says 'approved'
 *   - lib/maple-offer.ts     30 days for /maple sign-ups: off; Maple families get the same 14 days as everyone
 *   - lib/family-grant.ts    6-month grant to every account without Family (admin route): off
 *   - lib/promo.ts           ?code= promo codes over 14 days: closed to new redemptions
 *
 * To run a new free-days offer later, Sarah decides first and this file changes in code review. Don't flip it from data.
 */

/** Free Family days every new family gets, no card. */
export const FREE_FAMILY_DAYS = 14

/** The last moment any stacking offer may grant: the Thanksgiving offer's own deadline (Sun Nov 22 2026, 11:59 PM ET). */
export const LAST_STACKING_GRANT_AT = new Date('2026-11-23T04:59:59Z')

export function stackingOfferAllowed(now = new Date()): boolean {
  return now.getTime() <= LAST_STACKING_GRANT_AT.getTime()
}

/** Promo codes may add at most this many Family days; longer codes are closed to new redemptions. */
export const PROMO_MAX_DAYS = FREE_FAMILY_DAYS
