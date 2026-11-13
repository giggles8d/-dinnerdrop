/**
 * Weekend receipt reward (Sarah approved Nov 13 2026): a family that places a grocery order through DinnerDrop's
 * Instacart button on Sat Nov 14 or Sun Nov 15 (ET) and uploads that order's receipt by Mon Nov 16 11:59 PM ET gets a
 * $5 Instacart gift card, one per family, first 50 families. Shown on /start and above the receipt upload on the
 * grocery list. Winners are pulled from grocery_handoffs + receipts after the deadline and sent by Sarah.
 */
export const RECEIPT_REWARD = {
  id: 'weekend-receipt-2026-11-14',
  orderFrom: '2026-11-14T05:00:00Z',   // Sat Nov 14 00:00 ET
  orderBy: '2026-11-16T04:59:59Z',     // Sun Nov 15 11:59 PM ET
  receiptBy: '2026-11-17T04:59:59Z',   // Mon Nov 16 11:59 PM ET
  cap: 50,
  amount: 5,
}

/** Show the offer from now until the receipt deadline. */
export function receiptRewardOpen(now = Date.now()): boolean {
  return now <= new Date(RECEIPT_REWARD.receiptBy).getTime()
}

export const RECEIPT_REWARD_TERMS = 'Order through DinnerDrop’s Shop with Instacart button on Saturday, Nov 14 or Sunday, Nov 15, then upload that order’s receipt here by Monday, Nov 16 at 11:59 PM ET. One $5 Instacart gift card per family, first 50 families, emailed within 7 days.'
