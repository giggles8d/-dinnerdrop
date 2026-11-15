/**
 * A family's "won't eat" words (setup, texts) as something a dinner can be checked against.
 *
 * Nov 15 2026: a mom who won't eat seafood got Chipotle Salmon Tacos and Sheet-Pan Shrimp Fajitas in her vote, then
 * Honey-Soy Salmon as a swap. The vote and week builders passed her "Seafood" straight through as a word to exclude,
 * and no salmon recipe says "seafood". lib/first-plan already knew seafood/spicy/bell pepper as patterns; this module
 * is that knowledge in one place, so every exclude-words check (library picks, swaps, votes) reads a won't-eat the
 * same way.
 */

/** Won't-eats that a single word can't catch (Nov 11 2026: a mom who won't eat spicy food got Blackened Cod). */
export const DISLIKE_PATTERNS: Record<string, RegExp> = {
  'bell pepper': /\b(bell )?peppers?\b(?!oni)/,
  spicy: /\b(spicy|blackened|cajun|buffalo|chipotle|jalape[nñ]os?|habaneros?|serranos?|sriracha|hot sauce|nashville hot|diablo|arrabbiata|jerk|harissa|gochujang|chili crisp|red pepper flakes|crushed red pepper|cayenne)\b/,
  seafood: /\b(seafood|fish|salmon|tilapia|cod|shrimp|prawns?|tuna|crab|clams?|scallops?|mussels?|lobster|halibut|mahi|catfish|haddock|oysters?|anchov(y|ies)|sardines?|trout|pollock)\b/,
}

/** A setup "won't eat" as a word to look for: "Bell peppers" → "bell pepper", "Spicy food" → "spicy". Too-broad ones
 * ("Anything mixed together") are skipped. */
export function dislikeWord(raw: string): string | null {
  const w = String(raw ?? '').toLowerCase().trim()
  if (!w || /anything|mixed/.test(w)) return null
  if (/spicy/.test(w)) return 'spicy'
  const base = w.replace(/\s+food$/, '').replace(/(es|s)$/, (m) => (w.endsWith('tomatoes') || w.endsWith('potatoes') ? '' : m === 's' ? '' : 'e')).trim()
  const fixed: Record<string, string> = { 'bell pepper': 'bell pepper', tomato: 'tomato', potato: 'potato', mushroom: 'mushroom', onion: 'onion', bean: 'bean', olive: 'olive', avocado: 'avocado', eggplant: 'eggplant', cilantro: 'cilantro', seafood: 'seafood' }
  return fixed[base] ?? (base.length >= 3 ? base : null)
}

/** For a hard exclusion, "bell pepper" means the vegetable, not every "pepper" (black pepper, lemon pepper, pepper jack
 * would empty the library). The soft first-week penalty keeps the wider pattern above. */
const HARD_PATTERNS: Record<string, RegExp> = {
  ...DISLIKE_PATTERNS,
  'bell pepper': /\b((red|green|yellow|orange|mini|sweet|bell) (bell )?peppers?|poblanos?|capsicums?)\b/,
}

/**
 * Does this text (a dinner's name + ingredient names, lower-cased) hit one of the exclude words?
 * Each word counts two ways, so nothing that matched before stops matching: the raw word as a substring (how
 * exclude-words always worked) and, for the few words that name a category, its pattern (Seafood → salmon, shrimp,
 * cod…; Spicy food → chipotle, jalapeño…; Bell peppers → red/green/sweet peppers, poblanos). Plain words stay a
 * substring match on purpose: widening "Onions" to every onion would empty the library for some families.
 */
export function excludeWordsHit(hay: string, excludeWords: string[]): string | null {
  const text = hay.toLowerCase()
  for (const raw of excludeWords) {
    const w = String(raw ?? '').toLowerCase().trim()
    if (!w) continue
    if (text.includes(w)) return raw
    const base = dislikeWord(w)
    const pat = base ? HARD_PATTERNS[base] : undefined
    if (pat && pat.test(text)) return raw
  }
  return null
}
