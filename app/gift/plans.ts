/** Client-safe copy of the gift prices (source of truth for charging: lib/gifts.ts GIFT_PLANS). */
export const GIFT_PLAN_OPTIONS = [
  { id: '3' as const, label: '3 months', price: '$12', note: '$4/month' },
  { id: '6' as const, label: '6 months', price: '$20', note: 'About $3.33/month' },
  { id: '12' as const, label: '1 year', price: '$30', note: 'Best value — $2.50/month' },
]
