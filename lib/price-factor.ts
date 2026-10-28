/** Client-safe price helpers (no server imports) — shared by the grocery page and the server. */

// Rough per-line fallback (typical package price by aisle) for when the model can't price a line,
// so an unpriced line never counts as $0 and quietly drags the total down.
const FALLBACK: Array<[RegExp, number]> = [
  [/\b(beef|steak|sirloin|pork|chicken|turkey|salmon|shrimp|fish|tilapia|cod|lamb|bacon|sausage|ham|chorizo)\b/i, 8],
  [/\b(cheese|parmesan|cotija|feta|mozzarella|cheddar|butter|cream|yogurt|milk)\b/i, 4.5],
  [/\b(eggs?)\b/i, 4],
  [/\b(frozen)\b/i, 4],
  [/\b(oil|vinegar|sauce|paste|broth|stock|honey|syrup|mayo|mayonnaise|mustard|ketchup|seasoning|spice|powder|paprika|cumin|oregano)\b/i, 4],
  [/\b(bread|buns?|tortillas?|rolls?|pasta|spaghetti|noodles|rice|flour|sugar|panko|oats|cereal)\b/i, 3.5],
  [/./, 3],
]
export function fallbackPrice(name: string): number {
  return FALLBACK.find(([re]) => re.test(name))![1]
}

/**
 * Instacart prices + service fees run ~20-30% over typical shelf prices (Oct 2026 orders: $89 est → $119 paid).
 * Until a family's own orders teach us their factor, assume this one instead of 1.0.
 */
export const DEFAULT_FACTOR = 1.25
/** The factor the grocery page multiplied est_total by when a handoff was sent (default only applies from 2026-10-29). */
export function factorAtSend(createdAt: string | null | undefined, learned: number | undefined | null): number {
  const f = Number(learned)
  if (f > 0 && f !== 1) return f
  return createdAt && createdAt >= '2026-10-29' ? DEFAULT_FACTOR : 1
}
export function effectiveFactor(learned: number | undefined | null): number {
  const f = Number(learned)
  return f > 0 && f !== 1 ? f : DEFAULT_FACTOR
}

