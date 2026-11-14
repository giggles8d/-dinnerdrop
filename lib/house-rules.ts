/**
 * DinnerDrop-wide food rules that apply to every family (Sarah's house rules). Nov 14 2026: no lamb dinners at all;
 * the 31 lamb recipes in the library were converted to beef (pork for the chops). Word-boundary match so "Tacos de
 * Alambre" is not caught.
 */
export const HOUSE_NEVER_WORDS = ['lamb', 'mutton'] as const

const NEVER_RE = /\b(lamb|mutton)\b/i

/** True when a dinner breaks a house rule (checks the name and every ingredient name). */
export function breaksHouseRules(m: { name?: string; ingredients?: Array<{ name?: string }> } | null | undefined): boolean {
  if (!m) return false
  return NEVER_RE.test(`${m.name ?? ''} ${(m.ingredients ?? []).map((i) => i?.name ?? '').join(' ')}`)
}
