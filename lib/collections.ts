/**
 * Seasonal and themed collections — rule-based over the library (name + tags), so they fill in as the library grows.
 * `window` = when to feature it on the library page (month/day, inclusive); outside the window it's still reachable by URL.
 */
export interface Collection {
  slug: string
  name: string
  emoji: string
  blurb: string
  match: (r: { name: string; tags: string[]; cuisine?: string }) => boolean
  window?: { from: [number, number]; to: [number, number] } // [month, day]
}

const re = (p: RegExp) => (r: { name: string }) => p.test(r.name)

export const COLLECTIONS: Collection[] = [
  { slug: 'thanksgiving', name: 'Thanksgiving week', emoji: '🦃', blurb: 'Turkey without the whole bird, sides that travel, and what to do with the leftovers.', window: { from: [11, 1], to: [11, 30] },
    match: re(/\b(thanksgiving|turkey (breast|cutlets?|tenderloin|meatballs?|pot pie|tetrazzini)|stuffing|cranberr|sweet potato (casserole|mash)|green bean casserole|mashed potatoes?|pumpkin|butternut|acorn squash|brussels|leftover turkey|gravy)\b/i) },
  { slug: 'game-day', name: 'Game day', emoji: '🏈', blurb: 'Wings, sliders, nachos, chili — dinners that double as the spread.', window: { from: [9, 1], to: [2, 15] },
    match: re(/\b(wings|nachos|sliders|chili|dip\b|pizza|buffalo|pulled pork|sloppy joes?|loaded (fries|potato)|queso|hot dogs?)\b/i) },
  { slug: 'cozy', name: 'Cozy nights', emoji: '🍲', blurb: 'Soups, stews, pot pies and casseroles for cold evenings.', window: { from: [10, 15], to: [3, 15] },
    match: re(/\b(soup|stew|chili|pot pie|casserole|braised?|chowder|shepherd|dumplings?|gratin|ragu|bolognese)\b/i) },
  { slug: 'slow-cooker', name: 'Set it and forget it', emoji: '⏲️', blurb: 'Slow cooker and Instant Pot dinners that are done when you get home.',
    match: (r) => r.tags.includes('slow-cooker') || r.tags.includes('instant-pot') || /\b(slow[- ]cooker|instant pot|crock ?pot)\b/i.test(r.name) },
  { slug: 'holiday', name: 'Holiday table', emoji: '🎄', blurb: 'Roasts, ham, and dinners that feel like a celebration without a whole day in the kitchen.', window: { from: [12, 1], to: [12, 31] },
    match: re(/\b(roast|ham\b|prime rib|beef tenderloin|pork loin|glazed|cranberr|christmas|holiday|festive|lasagna|beef wellington)\b/i) },
  { slug: 'back-to-school', name: 'Back-to-school 20-minute', emoji: '🎒', blurb: 'Twenty minutes, one pan, kids eat it.', window: { from: [8, 1], to: [9, 30] },
    match: (r) => r.tags.includes('20-min') || r.tags.includes('15-min') },
  { slug: 'grill', name: 'Grill nights', emoji: '🔥', blurb: 'Burgers, kebabs and anything that tastes better outside.', window: { from: [5, 1], to: [9, 15] },
    match: (r) => r.tags.includes('grill') || /\b(grilled|burgers?|kebabs?|kabobs?|skewers|bbq)\b/i.test(r.name) },
]

export const collectionBySlug = (slug: string) => COLLECTIONS.find((c) => c.slug === slug) ?? null

/** Collections in season today (plus Set-it-and-forget-it, which has no season). */
export function featuredCollections(now = new Date()): Collection[] {
  const m = now.getMonth() + 1, d = now.getDate()
  const key = m * 100 + d
  return COLLECTIONS.filter((c) => {
    if (!c.window) return true
    const from = c.window.from[0] * 100 + c.window.from[1], to = c.window.to[0] * 100 + c.window.to[1]
    return from <= to ? key >= from && key <= to : key >= from || key <= to
  })
}
