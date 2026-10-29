/** Client-safe copy of the gift prices (source of truth for charging: lib/gifts.ts GIFT_PLANS). */
export const GIFT_PLAN_OPTIONS = [
  { id: '3' as const, label: '3 months', price: '$14.97', note: 'Same as 3 months of Family' },
  { id: '6' as const, label: '6 months', price: '$24.99', note: 'Save $5' },
  { id: '12' as const, label: '1 year', price: '$39', note: 'Best value — same as a Family year' },
]
