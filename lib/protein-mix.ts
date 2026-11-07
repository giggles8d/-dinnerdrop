/**
 * Weekly protein mix (Sarah, Oct 31 2026: "I have a lot of fish meals but no other meats this week —
 * I should be able to pick how many of each kind"). Families set counts per protein group in
 * Settings (settings.food.mix); plans, texted vote options and the final voted week follow them.
 *
 * Client-safe: used by Settings, the planner and the vote close.
 */

export type ProteinGroup = 'chicken' | 'beef' | 'pork' | 'turkey' | 'fish' | 'meatless' | 'other'

/** The groups a family can set counts for, in display order. ('other' = lamb etc., never set directly.) */
export const MIX_GROUPS: Array<{ key: Exclude<ProteinGroup, 'other'>; label: string }> = [
  { key: 'chicken', label: 'Chicken' },
  { key: 'beef', label: 'Beef' },
  { key: 'pork', label: 'Pork' },
  { key: 'turkey', label: 'Turkey' },
  { key: 'fish', label: 'Fish & seafood' },
  { key: 'meatless', label: 'Meatless' },
]

/** Counts per group for the cooked dinners of a week. null = any mix (the default). */
export type ProteinMix = Partial<Record<Exclude<ProteinGroup, 'other'>, number>> | null
export type MixKey = Exclude<ProteinGroup, 'other'>

/** "How often" choices for a group in the mix (Sarah, Nov 7 2026: "fish every other week or once a month"). */
export const MIX_EVERY: Array<{ v: 1 | 2 | 4; label: string }> = [
  { v: 1, label: 'Every week' },
  { v: 2, label: 'Every other week' },
  { v: 4, label: 'Once a month' },
]

/**
 * This week's mix after "how often": a group set to every other week (or once a month) sits out when it was
 * already in a plan made in the last 10 days (or 24 days). `recent` is each recent plan's age in days and the
 * protein groups its dinners used. Returns null when nothing is left in the mix (then any mix).
 */
export function mixForThisWeek(mix: NonNullable<ProteinMix>, every: Partial<Record<MixKey, number>> | undefined, recent: Array<{ ageDays: number; groups: string[] }>): ProteinMix {
  const out: NonNullable<ProteinMix> = { ...mix }
  for (const g of MIX_GROUPS) {
    const c = Number(every?.[g.key]) || 1
    if (c <= 1 || !(Number(out[g.key]) > 0)) continue
    const window = c >= 4 ? 24 : 10
    if (recent.some((r) => r.ageDays < window && r.groups.includes(g.key))) out[g.key] = 0
  }
  return Object.values(out).some((n) => Number(n) > 0) ? out : null
}

const FISH = /\b(fish|salmon|tuna|cod|tilapia|halibut|catfish|mahi|swordfish|sea bass|trout|snapper|haddock|pollock|sardines?|anchov\w*|shrimp|prawns?|scallops?|clams?|mussels?|crab|lobster|calamari|squid|seafood|white fish)\b/i
const TURKEY = /\bturkey\b/i
const CHICKEN = /\b(chicken|rotisserie)\b/i
const PORK = /\b(pork|bacon|ham|prosciutto|pepperoni|salami|chorizo|kielbasa|bratwurst|andouille|hot dogs?|pancetta|sausages?)\b/i
const BEEF = /\b(beef|steak|sirloin|ribeye|brisket|chuck|flank|skirt|short ribs|meatballs|roast beef|corned beef|veal)\b/i
const OTHER_MEAT = /\b(lamb|goat|duck|venison|bison)\b/i

/** Which group a dinner's main protein falls in ("chicken sausage" is chicken, "soy chorizo" is meatless). */
export function proteinGroup(protein: string | null | undefined, name = ''): ProteinGroup {
  const p = (protein ?? '').toLowerCase().trim()
  const hay = p && p !== 'none' ? p : name.toLowerCase()
  if (/\b(soy|plant[- ]based|vegan|veggie|beyond|impossible)\b/.test(hay)) return 'meatless'
  if (FISH.test(hay)) return 'fish'
  if (TURKEY.test(hay)) return 'turkey'
  if (CHICKEN.test(hay)) return 'chicken'
  if (PORK.test(hay)) return 'pork'
  if (BEEF.test(hay) || /\bground (beef|meat)\b/.test(hay)) return 'beef'
  if (OTHER_MEAT.test(hay)) return 'other'
  if (!p || p === 'none') {
    // Unknown protein and nothing meaty in the name: count it as meatless.
    return 'meatless'
  }
  return 'meatless'
}

/** True when the family has set a mix (any count > 0). */
export function hasMix(mix: ProteinMix | undefined): mix is NonNullable<ProteinMix> {
  return !!mix && Object.values(mix).some((n) => Number(n) > 0)
}

/**
 * Scale the week's counts to `total` slots (e.g. 10 ideas to text for a 5-dinner mix), keeping
 * the proportions: largest remainder, so the result always adds up to `total`.
 * Groups set to 0 stay 0.
 */
export function scaleMix(mix: NonNullable<ProteinMix>, total: number): Record<string, number> {
  const entries = MIX_GROUPS.map((g) => [g.key, Math.max(0, Number(mix[g.key]) || 0)] as const).filter(([, n]) => n > 0)
  const sum = entries.reduce((s, [, n]) => s + n, 0)
  const out: Record<string, number> = {}
  if (!sum || total <= 0) return out
  const raw = entries.map(([k, n]) => ({ k, exact: (n / sum) * total }))
  let used = 0
  for (const r of raw) { out[r.k] = Math.floor(r.exact); used += out[r.k] }
  raw.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)))
  for (let i = 0; used < total && raw.length; i = (i + 1) % raw.length) { out[raw[i].k]++; used++ }
  return out
}

/** Readable summary: "2 chicken, 1 beef, 1 pork, 1 fish". */
export function mixLabel(mix: NonNullable<ProteinMix> | Record<string, number>): string {
  return MIX_GROUPS.filter((g) => Number((mix as Record<string, number>)[g.key]) > 0)
    .map((g) => `${(mix as Record<string, number>)[g.key]} ${g.label.toLowerCase()}`)
    .join(', ')
}

/**
 * Pick `count` items in preference order while following the quota. Items over their group's
 * quota (or in a group the family set to 0) are skipped; if a group can't fill its count, the
 * slot goes to the next best item from a group that's in the mix. Only when nothing in the mix
 * is left does it fall back to anything (so the week is never short).
 */
export function pickByQuota<T>(ordered: T[], count: number, quota: Record<string, number>, groupOf: (t: T) => ProteinGroup): T[] {
  const left = { ...quota }
  const chosen: T[] = []
  for (const t of ordered) {
    if (chosen.length >= count) break
    const g = groupOf(t)
    if ((left[g] ?? 0) > 0) { chosen.push(t); left[g]-- }
  }
  const inMix = new Set(Object.keys(quota).filter((k) => quota[k] > 0))
  for (const t of ordered) {
    if (chosen.length >= count) break
    if (!chosen.includes(t) && inMix.has(groupOf(t))) chosen.push(t)
  }
  for (const t of ordered) {
    if (chosen.length >= count) break
    if (!chosen.includes(t)) chosen.push(t)
  }
  return chosen
}
