/**
 * "Buy store brand" (Sarah, Nov 10 2026, after a $75-a-week family found the Instacart total too high): when a family
 * turns it on, packaged groceries (pantry, dairy, frozen, bakery, drinks) go to Instacart with their stores' own
 * brands preferred, and estimates assume store-brand prices (about 15% less). Produce and meat are unbranded anyway.
 *
 * Instacart matches brand names exactly and suggests alternatives when none is stocked, so only well-known
 * store-brand names are listed, for the stores the family told us they use (max 10 per line, Instacart's advice).
 */
import type { Settings } from '@/lib/settings'
import type { GroceryCategory } from '@/types'

export const STORE_BRAND_SAVINGS = 0.85
export const BRANDABLE: GroceryCategory[] = ['Pantry & Dry Goods', 'Dairy & Eggs', 'Frozen', 'Bakery', 'Beverages']

const BY_STORE: Array<[RegExp, string[]]> = [
  [/aldi/i, ['Simply Nature', 'Happy Farms', 'Friendly Farms', 'Millville', 'Specially Selected', 'Baker’s Corner', 'Carlini', 'Clancy’s', 'Season’s Choice']],
  [/walmart/i, ['Great Value', 'Marketside']],
  [/kroger|ralphs|fred meyer|king soopers|fry'?s|smith'?s|harris teeter|dillons|mariano|pick ?n ?save/i, ['Kroger', 'Simple Truth', 'Private Selection']],
  [/target/i, ['Good & Gather', 'Market Pantry']],
  [/costco/i, ['Kirkland Signature']],
  [/sam'?s/i, ["Member's Mark"]],
  [/shop ?rite/i, ['Bowl & Basket', 'ShopRite']],
  [/stop ?& ?shop|giant|martin'?s/i, ['Stop & Shop', 'Giant', "Nature's Promise"]],
  [/publix/i, ['Publix', 'GreenWise']],
  [/wegmans/i, ['Wegmans']],
  [/safeway|albertsons|vons|jewel|acme|shaw'?s|tom thumb|randalls/i, ['Signature Select', 'Lucerne', 'O Organics']],
  [/h-?e-?b/i, ['H-E-B', 'Hill Country Fare']],
  [/meijer/i, ['Meijer']],
  [/food lion/i, ['Food Lion']],
  [/hannaford/i, ['Hannaford']],
  [/whole foods/i, ['365 by Whole Foods Market']],
  [/trader joe/i, ["Trader Joe's"]],
  [/tops/i, ['Tops']],
  [/hy-?vee/i, ['Hy-Vee']],
]
const COMMON = ['Great Value', 'Kroger', 'Good & Gather', 'Signature Select', 'Kirkland Signature']

/** The store brands to prefer for this family (from their usual / compared stores), or [] when the option is off. */
export function storeBrandsFor(settings: Settings): string[] {
  if (!settings.stores.storeBrand) return []
  const names = [settings.stores.usualStore, ...settings.stores.myStores.map((s) => s.name)].join(' | ')
  const out: string[] = []
  for (const [re, brands] of BY_STORE) if (re.test(names)) out.push(...brands)
  for (const b of out.length ? [] : COMMON) out.push(b)
  return Array.from(new Set(out)).slice(0, 10)
}

/** Estimate multiplier for store-brand shoppers. */
export function storeBrandFactor(settings: Pick<Settings, 'stores'>): number {
  return settings.stores.storeBrand ? STORE_BRAND_SAVINGS : 1
}
