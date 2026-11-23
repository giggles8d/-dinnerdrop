/**
 * Each person's setup "won't eat" list as something a dinner can be checked against. Shared by the library weeks
 * (lib/first-plan) and the AI planner's safety net (app/api/generate-plan), so both keep a won't-eat out of a
 * dinner's name (Nov 22 2026: a mom who won't eat onions got "Paprika Pork Chops with Sautéed Peppers, Mango & Onion"
 * — the AI ballot never checked names, and the budget swap put it on her Monday).
 */

/** Won't-eats that a single word can't catch (Nov 11 2026: a mom who won't eat spicy food got Blackened Cod; Nov 22 2026:
 * eight families whose setup says "Seafood" got shrimp fajitas, salmon tacos or tilapia as their no-vote week, because the
 * library filter looked for the literal word "seafood"; the same day a mom with a pork "allergy" got ham steaks and her
 * partner with a beef one got a cheesesteak). A family's word stands for the whole family of foods. */
const FISH = 'fish|salmon|tilapia|cod|tuna|halibut|mahi|catfish|haddock|trout|pollock|snapper|flounder|sole|swordfish|sea bass|branzino|whitefish|anchov(?:y|ies)|sardines?'
const SHELLFISH = 'shellfish|shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?|crawfish|crayfish|calamari|squid|langostinos?'
export const DISLIKE_PATTERNS: Record<string, RegExp> = {
  'bell pepper': /\b(bell )?peppers?\b(?!oni)/,
  spicy: /\b(spicy|blackened|cajun|buffalo|chipotle|jalape[nñ]os?|habaneros?|serranos?|sriracha|hot sauce|nashville hot|diablo|arrabbiata|jerk|harissa|gochujang|chili crisp|red pepper flakes|crushed red pepper|cayenne)\b/,
  seafood: new RegExp(`\\b(seafood|${FISH}|${SHELLFISH})\\b`),
  fish: new RegExp(`\\b(${FISH})\\b`),
  shellfish: new RegExp(`\\b(${SHELLFISH})\\b`),
  // "chicken sausage" and "turkey bacon" are not pork; "hamburger" and "graham" are not ham.
  pork: /\b(pork|ham|prosciutto|pancetta|kielbasa|bratwurst|salami|pepperoni|chorizo|spare ?ribs|baby back ribs)\b|(?<!turkey |chicken |beef |vegan |plant[- ]based )\b(bacon|sausages?)\b/,
  // turkey / chicken / veggie versions of a burger or meatball are not beef; "steak" alone is (a ham or tuna steak says so).
  beef: /\b(beef|brisket|ribeye|sirloin|flank|chuck|cheesesteak|short ribs)\b|(?<!turkey |chicken |black bean |veggie |veggie-|salmon |tuna |ham |pork |lamb |cauliflower |portobello )\b(steaks?|burgers?|hamburgers?|meatballs?|meatloaf|meatloaves)\b/,
}

/** A setup "won't eat" as a word to look for: "Bell peppers" → "bell pepper", "Spicy food" → "spicy". Too-broad ones
 * ("Anything mixed together") are skipped. */
export function dislikeWord(raw: string): string | null {
  const w = String(raw ?? '').toLowerCase().trim()
  if (!w || /anything|mixed/.test(w)) return null
  if (/spicy/.test(w)) return 'spicy'
  const base = w.replace(/\s+food$/, '').replace(/(es|s)$/, (m) => (w.endsWith('tomatoes') || w.endsWith('potatoes') ? '' : m === 's' ? '' : 'e')).trim()
  const fixed: Record<string, string> = { 'bell pepper': 'bell pepper', tomato: 'tomato', potato: 'potato', mushroom: 'mushroom', onion: 'onion', bean: 'bean', olive: 'olive', avocado: 'avocado', eggplant: 'eggplant', cilantro: 'cilantro', seafood: 'seafood', fish: 'fish', shellfish: 'shellfish', pork: 'pork', beef: 'beef', 'red meat': 'beef' }
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
  return words.filter((w) => (DISLIKE_PATTERNS[w] ?? new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`)).test(t))
}

/** True when a dinner (name + ingredient names) contains any of these setup words: won't-eats, never-ingredients or
 * proteins to avoid. Each word is read the way the family means it ("Seafood" covers shrimp and tilapia, "Pork" covers
 * ham and bacon), so the library filter and the AI safety net agree with the setup screen. */
export function avoidsAny(raw: Array<string | null | undefined>, text: string): boolean {
  const words = dislikeWords(raw)
  return words.length > 0 && dislikeHits(words, text).length > 0
}
