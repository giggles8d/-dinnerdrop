/**
 * How long a promo code's free Family lasts, in words: "14 days", "3 months", "1 year", "2 years".
 * Client-safe (used by the /start banner and the promo share image). Nov 27 2026: FRIENDS is 730 days again, and the
 * old wording showed it as "a year" on /start and "24 months" on the image.
 */
export function promoLength(days: number): string {
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`
  if (days < 360) { const m = Math.round(days / 30); return `${m} month${m === 1 ? '' : 's'}` }
  const y = Math.round(days / 365)
  return `${y} year${y === 1 ? '' : 's'}`
}
