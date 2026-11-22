/**
 * Each person's setup "won't eat" list as something a dinner can be checked against. Shared by the library weeks
 * (lib/first-plan) and the AI planner's safety net (app/api/generate-plan), so both keep a won't-eat out of a
 * dinner's name (Nov 22 2026: a mom who won't eat onions got "Paprika Pork Chops with Sautéed Peppers, Mango & Onion"
 * — the AI ballot never checked names, and the budget swap put it on her Monday).
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

/** The household's won't-eats as words (de-duplicated, broad ones dropped). */
export function dislikeWords(raw: Array<string | null | undefined>): string[] {
  return Array.from(new Set(raw.map((x) => dislikeWord(x ?? '')).filter((w): w is string => !!w)))
}

/** Which of the won't-eat words a text (a dinner name, or its ingredients joined) contains.
 * "black pepper" is seasoning, not a pepper (removed before matching, so a list with both still counts the bell pepper). */
export function dislikeHits(words: string[], text: string): string[] {
  const t = text.toLowerCase().replace(/black pepper/g, '')
  return words.filter((w) => (DISLIKE_PATTERNS[w] ?? new RegExp(`\\b${w}s?\\b`)).test(t))
}
