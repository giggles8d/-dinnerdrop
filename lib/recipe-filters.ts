import { safeBite, cookware } from '@/lib/meal-insights'
import type { Meal } from '@/types'

/** One row of the slim recipe index the library page filters in the browser (no steps, ingredient names only). */
export interface LibRow {
  id: string
  name: string
  slug: string
  cuisine: string
  protein: string
  pg: ProteinGroup
  cg: CuisineGroup
  time: number
  servings: number
  cost: number
  tags: string[]
  image_url: string | null
  source: 'generated' | 'user'
  created_by: string | null
  kept: number
  ing: string        // ingredient names, lowercased, " | " separated
  cook: string       // "2 pans" etc.
  safe: string | null
}

export type ProteinGroup = 'chicken' | 'beef' | 'pork' | 'turkey' | 'seafood' | 'lamb' | 'meatless'
export type CuisineGroup = 'american' | 'mexican' | 'italian' | 'asian' | 'mediterranean' | 'other'

export const PROTEINS: Array<{ v: ProteinGroup; l: string }> = [
  { v: 'chicken', l: '🍗 Chicken' }, { v: 'beef', l: '🥩 Beef' }, { v: 'pork', l: '🥓 Pork' }, { v: 'turkey', l: '🦃 Turkey' },
  { v: 'seafood', l: '🐟 Fish & seafood' }, { v: 'lamb', l: 'Lamb' }, { v: 'meatless', l: '🥦 Meatless' },
]
export const CUISINES: Array<{ v: CuisineGroup; l: string }> = [
  { v: 'american', l: 'American' }, { v: 'mexican', l: 'Mexican' }, { v: 'italian', l: 'Italian' },
  { v: 'asian', l: 'Asian' }, { v: 'mediterranean', l: 'Mediterranean' }, { v: 'other', l: 'More cuisines' },
]
export const STYLES: Array<{ v: string; l: string }> = [
  { v: 'quick', l: 'Quick' }, { v: 'kid-favorite', l: 'Kid favorite' }, { v: 'sheet-pan', l: 'Sheet pan' }, { v: 'one-pot', l: 'One pot' },
  { v: 'skillet', l: 'Skillet' }, { v: 'slow-cooker', l: 'Slow cooker' }, { v: 'instant-pot', l: 'Instant Pot' }, { v: 'air-fryer', l: 'Air fryer' },
  { v: 'grill', l: 'Grill' }, { v: 'freezer-friendly', l: 'Freezer-friendly' }, { v: 'make-ahead', l: 'Make-ahead' }, { v: 'budget', l: 'Budget' },
  { v: 'high-protein', l: 'High protein' }, { v: 'comfort-food', l: 'Comfort food' }, { v: 'vegan', l: 'Vegan' },
]
export const TIMES = [{ v: 0, l: 'Any time' }, { v: 20, l: '20 min or less' }, { v: 30, l: '30 min or less' }, { v: 45, l: '45 min or less' }]
export const SORTS = [{ v: 'kept', l: 'Most kept' }, { v: 'quick', l: 'Quickest' }, { v: 'cheap', l: 'Cheapest per serving' }] as const
export type SortKey = (typeof SORTS)[number]['v']

const MEATLESS = /\b(beans?|lentils?|chickpeas?|tofu|tempeh|eggs?|cheese|paneer|halloumi|ricotta|mozzarella|feta|edamame|peas|cauliflower|eggplant|mushrooms?|jackfruit|vegetables|potatoes|millet|walnuts|seeds|coconut milk|none)\b/

const MEAT_INGREDIENT = /\b(chicken|beef|steak|pork|bacon|ham|sausage|chorizo|pepperoni|prosciutto|salami|turkey|lamb|salmon|tuna|cod|tilapia|shrimp|fish|anchov\w*|clams?|scallops?|crab|meatballs?)\b/

export function proteinGroup(protein: string | null | undefined, tags: string[] = []): ProteinGroup {
  const p = (protein ?? '').toLowerCase()
  if (/turkey/.test(p)) return 'turkey'
  if (/chicken/.test(p)) return 'chicken'
  if (/lamb/.test(p)) return 'lamb'
  if (/beef|steak|brisket|chuck|sirloin|ribeye|meatball|short rib|corned/.test(p)) return 'beef'
  if (/pork|bacon|ham\b|sausage|chorizo|kielbasa|bratwurst|hot dog|pepperoni|andouille/.test(p) && !/soy chorizo/.test(p)) return 'pork'
  if (/salmon|tuna|cod|tilapia|shrimp|scallop|clam|catfish|halibut|mahi|swordfish|fish|sea bass/.test(p)) return 'seafood'
  if (MEATLESS.test(p) || /soy chorizo/.test(p) || tags.includes('meatless') || tags.includes('vegan')) return 'meatless'
  return 'meatless'
}

export function cuisineGroup(cuisine: string | null | undefined): CuisineGroup {
  const c = (cuisine ?? '').toLowerCase()
  if (/mexican|tex-mex/.test(c)) return 'mexican'
  if (/italian/.test(c)) return 'italian'
  if (/asian|chinese|japanese|korean|thai/.test(c)) return 'asian'
  if (/mediterranean|greek|middle eastern|north african/.test(c)) return 'mediterranean'
  if (/^american$|southern|cajun/.test(c)) return 'american'
  return c ? 'other' : 'american'
}

type Full = {
  id: string; name: string; slug: string; cuisine: string | null; protein: string | null; cook_time: number | null; prep_time: number | null
  servings: number | null; estimated_cost: number | null; ingredients: Meal['ingredients'] | null; steps: string[] | null; tags: string[] | null
  image_url: string | null; source: 'generated' | 'user'; created_by: string | null; kept_count: number | null
}
export const FULL_COLUMNS = 'id, name, slug, cuisine, protein, cook_time, prep_time, servings, estimated_cost, ingredients, steps, tags, image_url, source, created_by, kept_count'

export function toLibRow(r: Full): LibRow {
  const tags = (r.tags ?? []).map((t) => (t === 'vegetarian' ? 'meatless' : t))
  const lite = { name: r.name, ingredients: r.ingredients ?? [], steps: r.steps ?? [], tags }
  const names = (r.ingredients ?? []).map((i) => i.name.toLowerCase())
  let pg = proteinGroup(r.protein, tags)
  // "Meatless" must really be meatless: if an ingredient is meat or fish, file it under that instead.
  if (pg === 'meatless') {
    const meat = names.find((n) => MEAT_INGREDIENT.test(n) && !/broth|stock|bouillon|fish sauce|soy chorizo|plant|vegan|meatless|beyond|impossible/.test(n))
    if (meat) pg = proteinGroup(meat)
  }
  return {
    id: r.id, name: r.name, slug: r.slug, cuisine: r.cuisine ?? '', protein: r.protein ?? '',
    pg, cg: cuisineGroup(r.cuisine),
    time: (r.cook_time ?? 0) + (r.prep_time ?? 0), servings: r.servings ?? 4, cost: Number(r.estimated_cost ?? 0),
    tags, image_url: r.image_url, source: r.source, created_by: r.created_by, kept: r.kept_count ?? 0,
    ing: names.join(' | '),
    cook: cookware(lite).label, safe: safeBite(lite),
  }
}

export interface Filters { q: string; without: string; time: number; proteins: ProteinGroup[]; cuisines: CuisineGroup[]; styles: string[]; sort: SortKey; mine: boolean; favs: boolean }
export const EMPTY: Filters = { q: '', without: '', time: 0, proteins: [], cuisines: [], styles: [], sort: 'kept', mine: false, favs: false }

/** Apply the filters. Proteins and cuisines are any-of; styles are all-of; "without" excludes any matching ingredient word. */
export function applyFilters(rows: LibRow[], f: Filters, ctx: { userId: string | null; favNames: Set<string> }): LibRow[] {
  const q = f.q.trim().toLowerCase()
  const without = f.without.split(',').map((w) => w.trim().toLowerCase().replace(/s$/, '')).filter((w) => w.length > 1)
  const out = rows.filter((r) => {
    if (f.mine && !(r.source === 'user' && r.created_by === ctx.userId)) return false
    if (f.favs && !ctx.favNames.has(r.name)) return false
    if (f.time && r.time > f.time) return false
    if (f.proteins.length && !f.proteins.includes(r.pg)) return false
    if (f.cuisines.length && !f.cuisines.includes(r.cg)) return false
    if (f.styles.length && !f.styles.every((s) => r.tags.includes(s) || (s === 'meatless' && r.pg === 'meatless'))) return false
    if (without.length && without.some((w) => r.ing.includes(w) || r.name.toLowerCase().includes(w))) return false
    if (q && !`${r.name} ${r.cuisine} ${r.protein} ${r.ing}`.toLowerCase().includes(q)) return false
    return true
  })
  const per = (r: LibRow) => (r.servings ? r.cost / r.servings : r.cost) || 99
  if (f.sort === 'quick') out.sort((a, b) => (a.time || 999) - (b.time || 999) || b.kept - a.kept)
  else if (f.sort === 'cheap') out.sort((a, b) => per(a) - per(b) || b.kept - a.kept)
  return out
}

/** Filters <-> URL query (?p=chicken,beef&c=mexican&s=quick&t=30&q=…&x=mushrooms&sort=quick) so a filtered view can be shared. */
export function filtersFromQuery(sp: URLSearchParams): Filters {
  const list = (k: string) => (sp.get(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const sort = sp.get('sort')
  return {
    ...EMPTY,
    q: sp.get('q') ?? '', without: sp.get('x') ?? '', time: Number(sp.get('t')) || 0,
    proteins: list('p').filter((p): p is ProteinGroup => PROTEINS.some((x) => x.v === p)),
    cuisines: list('c').filter((c): c is CuisineGroup => CUISINES.some((x) => x.v === c)),
    styles: list('s').map((s) => (s === 'vegetarian' ? 'meatless' : s)).filter((s) => STYLES.some((x) => x.v === s) || s === 'meatless'),
    sort: sort === 'quick' || sort === 'cheap' ? sort : 'kept',
  }
}
export function filtersToQuery(f: Filters): string {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  if (f.without) sp.set('x', f.without)
  if (f.time) sp.set('t', String(f.time))
  if (f.proteins.length) sp.set('p', f.proteins.join(','))
  if (f.cuisines.length) sp.set('c', f.cuisines.join(','))
  if (f.styles.length) sp.set('s', f.styles.join(','))
  if (f.sort !== 'kept') sp.set('sort', f.sort)
  const s = sp.toString()
  return s ? `?${s}` : ''
}
export function activeCount(f: Filters): number {
  return (f.q ? 1 : 0) + (f.without ? 1 : 0) + (f.time ? 1 : 0) + f.proteins.length + f.cuisines.length + f.styles.length + (f.mine ? 1 : 0) + (f.favs ? 1 : 0)
}
