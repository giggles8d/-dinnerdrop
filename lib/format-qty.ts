/** Shopper-friendly amounts: "0.625 lbs" → "⅝ lb", "1 count" → "1". Shared by the grocery list and recipe pages (server-safe). */
// Display helper: "0.625 lbs" -> "5/8 lb", "1 lbs" -> "1 lb", "2 cloves" stays.
const FRACTIONS: Array<[number, string]> = [
  [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'], [0.5, '½'],
  [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
]
const PLURAL_TO_SINGULAR: Record<string, string> = {
  lbs: 'lb', pounds: 'lb', pound: 'lb', ounces: 'oz', ounce: 'oz', cups: 'cup', tablespoons: 'tbsp', tablespoon: 'tbsp',
  teaspoons: 'tsp', teaspoon: 'tsp', cloves: 'clove', cans: 'can', jars: 'jar', packages: 'package', bunches: 'bunch', heads: 'head',
}
const COUNT_UNITS = new Set(['clove', 'can', 'jar', 'package', 'bunch', 'head', 'whole', 'piece', 'bag', 'box', 'bottle', 'loaf', 'dozen'])

export function formatQuantity(quantity: string | number, unit: string): string {
  const raw = String(quantity ?? '').trim()
  const n = Number(raw)
  const u = (unit ?? '').trim().toLowerCase()
  const base = PLURAL_TO_SINGULAR[u] ?? u
  let qtyText = raw
  if (!Number.isNaN(n) && raw !== '') {
    const whole = Math.floor(n)
    const frac = n - whole
    let fracText = ''
    if (frac > 0.05) {
      const match = FRACTIONS.reduce((best, cur) => (Math.abs(cur[0] - frac) < Math.abs(best[0] - frac) ? cur : best))
      fracText = Math.abs(match[0] - frac) < 0.07 ? match[1] : ''
    }
    if (fracText) qtyText = whole > 0 ? `${whole}${fracText}` : fracText
    else qtyText = String(Math.round(n * 100) / 100)
  }
  // "1 count red onion" reads like a machine: plain counts show no unit (Nov 21 2026 review).
  let unitText = base === 'whole' || base === 'count' || base === 'each' || base === 'ct' ? '' : base
  if (!Number.isNaN(n) && n > 1 && unitText) {
    if (COUNT_UNITS.has(base) || base === 'cup') unitText = base === 'bunch' ? 'bunches' : base === 'box' ? 'boxes' : `${base}s`
  }
  return `${qtyText} ${unitText}`.trim()
}

