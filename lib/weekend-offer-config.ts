/** Client-safe offer settings (no server imports), shared by lib/weekend-offer and the grocery list page. */
export const WEEKEND_OFFER = {
  id: 'thanksgiving-2026',
  signupFrom: '2026-01-01T05:00:00Z',   // anyone who hasn't sent a list yet (the first-list check below does the rest)
  sendBy: '2026-11-23T04:59:59Z',       // Sun Nov 22 11:59 PM ET
  days: 90,
  label: '3 months of Family free',
}

export function weekendOfferOpen(now = new Date()): boolean {
  return now.getTime() <= new Date(WEEKEND_OFFER.sendBy).getTime()
}

