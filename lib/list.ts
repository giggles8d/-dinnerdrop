/**
 * Grocery list v2 helpers (shared by the list page, SMS add-to-list, and crons).
 * Rows live in public.list_items; the plan's grocery_list JSON is the seed.
 */
import type { GroceryCategory, GroceryItem } from '@/types'

export type ListSource = 'plan' | 'manual' | 'sms' | 'staples' | 'pantry' | 'extra'

export interface ListItem {
  id: string
  user_id: string
  household_id: string | null
  week_start: string | null
  name: string
  quantity: string | null
  unit: string | null
  category: GroceryCategory
  search_term: string | null
  source: ListSource
  added_by: string | null
  have: boolean
  checked: boolean
  est_price?: number | null   // typical-price estimate for non-plan lines
  ordered_at?: string | null  // set when the line went to a store; null = still on the active list
  created_at: string
}

export interface Staple {
  id: string
  user_id: string
  name: string
  quantity: string | null
  unit: string | null
  category: GroceryCategory
  every_weeks: number
  last_added_week: string | null
}

export const CATEGORY_ORDER: GroceryCategory[] = [
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages',
]

export const CATEGORY_EMOJI: Record<GroceryCategory, string> = {
  'Produce': '🥦', 'Meat & Seafood': '🥩', 'Dairy & Eggs': '🥛', 'Pantry & Dry Goods': '🫙',
  'Frozen': '❄️', 'Bakery': '🍞', 'Beverages': '🧃',
}

export function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Guess a store section for a free-typed item name. */
export function guessCategory(name: string): GroceryCategory {
  const n = normalizeItemName(name)
  const has = (...words: string[]) => words.some((w) => n.includes(w))
  if (has('milk', 'cheese', 'yogurt', 'butter', 'egg', 'cream', 'sour cream')) return 'Dairy & Eggs'
  if (has('chicken', 'beef', 'pork', 'turkey', 'steak', 'sausage', 'bacon', 'shrimp', 'salmon', 'fish', 'ground', 'ham')) return 'Meat & Seafood'
  if (has('bread', 'bagel', 'bun', 'tortilla', 'roll', 'muffin', 'pita')) return 'Bakery'
  if (has('frozen', 'ice cream', 'popsicle', 'pizza', 'waffle', 'fries')) return 'Frozen'
  if (has('juice', 'soda', 'water', 'coffee', 'tea', 'seltzer', 'drink')) return 'Beverages'
  if (has('apple', 'banana', 'berry', 'berries', 'grape', 'orange', 'lemon', 'lime', 'avocado', 'tomato', 'onion', 'garlic', 'pepper', 'lettuce', 'spinach', 'carrot', 'broccoli', 'cucumber', 'potato', 'salad', 'fruit', 'melon', 'cilantro', 'herb', 'celery', 'zucchini', 'squash', 'mushroom', 'corn', 'peas', 'beans')) return 'Produce'
  return 'Pantry & Dry Goods'
}

/** Rows to insert for the plan's grocery list. Pantry matches are inserted with have=true. */
export function rowsFromPlanList(
  list: Record<string, GroceryItem[]>,
  ctx: { userId: string; householdId: string | null; weekStart: string; pantryNames: Set<string> }
) {
  const rows: Array<Omit<ListItem, 'id' | 'created_at'>> = []
  for (const category of Object.keys(list)) {
    for (const item of list[category] ?? []) {
      if (!item?.name) continue
      rows.push({
        user_id: ctx.userId,
        household_id: ctx.householdId,
        week_start: ctx.weekStart,
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        category: (CATEGORY_ORDER.includes(category as GroceryCategory) ? category : 'Pantry & Dry Goods') as GroceryCategory,
        search_term: item.searchTerm ?? null,
        source: 'plan',
        added_by: null,
        have: ctx.pantryNames.has(normalizeItemName(item.name)),
        checked: false,
      })
    }
  }
  return rows
}

/** Staples that are due this week given their cadence. */
export function dueStaples(staples: Staple[], weekStart: string): Staple[] {
  const ws = new Date(weekStart + 'T00:00:00Z').getTime()
  return staples.filter((s) => {
    if (!s.last_added_week) return true
    const last = new Date(s.last_added_week + 'T00:00:00Z').getTime()
    const weeks = Math.round((ws - last) / (7 * 86400000))
    return weeks >= Math.max(1, s.every_weeks)
  })
}

/** Simple lunch / breakfast basics, scaled for the household. */
export function basicsFor(kind: 'lunch' | 'breakfast', familySize: number): GroceryItem[] {
  const big = familySize >= 5
  if (kind === 'lunch') {
    return [
      { name: 'Sandwich bread', quantity: big ? '2' : '1', unit: 'loaf', category: 'Bakery', searchTerm: 'sandwich bread' },
      { name: 'Deli turkey', quantity: big ? '1 1/2' : '1', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'sliced deli turkey' },
      { name: 'Sliced cheese', quantity: '1', unit: 'package', category: 'Dairy & Eggs', searchTerm: 'sliced cheddar cheese' },
      { name: 'Apples', quantity: big ? '8' : '5', unit: 'whole', category: 'Produce', searchTerm: 'apples' },
      { name: 'Baby carrots', quantity: '1', unit: 'bag', category: 'Produce', searchTerm: 'baby carrots' },
      { name: 'Pretzels or crackers', quantity: '1', unit: 'bag', category: 'Pantry & Dry Goods', searchTerm: 'pretzels' },
    ]
  }
  return [
    { name: 'Eggs', quantity: big ? '2' : '1', unit: 'dozen', category: 'Dairy & Eggs', searchTerm: 'large eggs' },
    { name: 'Milk', quantity: big ? '2' : '1', unit: 'gallon', category: 'Dairy & Eggs', searchTerm: 'whole milk' },
    { name: 'Cereal or oats', quantity: '1', unit: 'box', category: 'Pantry & Dry Goods', searchTerm: 'cereal' },
    { name: 'Bananas', quantity: '1', unit: 'bunch', category: 'Produce', searchTerm: 'bananas' },
    { name: 'Yogurt', quantity: big ? '2' : '1', unit: 'package', category: 'Dairy & Eggs', searchTerm: 'yogurt cups' },
    { name: 'Frozen waffles', quantity: '1', unit: 'box', category: 'Frozen', searchTerm: 'frozen waffles' },
  ]
}

/** "Rest of your week" quick-add chips — the everyday things families buy anyway. */
export const REST_OF_WEEK: Array<{ name: string; category: GroceryCategory; searchTerm: string }> = [
  { name: 'Milk', category: 'Dairy & Eggs', searchTerm: 'milk' },
  { name: 'Eggs', category: 'Dairy & Eggs', searchTerm: 'large eggs' },
  { name: 'Bread', category: 'Bakery', searchTerm: 'bread' },
  { name: 'Bananas', category: 'Produce', searchTerm: 'bananas' },
  { name: 'Apples', category: 'Produce', searchTerm: 'apples' },
  { name: 'Berries', category: 'Produce', searchTerm: 'strawberries' },
  { name: 'Yogurt', category: 'Dairy & Eggs', searchTerm: 'yogurt' },
  { name: 'Cheese sticks', category: 'Dairy & Eggs', searchTerm: 'string cheese' },
  { name: 'Cereal', category: 'Pantry & Dry Goods', searchTerm: 'cereal' },
  { name: 'Peanut butter', category: 'Pantry & Dry Goods', searchTerm: 'peanut butter' },
  { name: 'Snack bars', category: 'Pantry & Dry Goods', searchTerm: 'granola bars' },
  { name: 'Crackers', category: 'Pantry & Dry Goods', searchTerm: 'crackers' },
  { name: 'Juice boxes', category: 'Beverages', searchTerm: 'juice boxes' },
  { name: 'Coffee', category: 'Beverages', searchTerm: 'ground coffee' },
  { name: 'Paper towels', category: 'Pantry & Dry Goods', searchTerm: 'paper towels' },
  { name: 'Dish soap', category: 'Pantry & Dry Goods', searchTerm: 'dish soap' },
  { name: 'Toilet paper', category: 'Pantry & Dry Goods', searchTerm: 'toilet paper' },
  { name: 'Trash bags', category: 'Pantry & Dry Goods', searchTerm: 'trash bags' },
]

/** Items to actually buy: not already-have, not checked off in store. */
export function shoppableItems(items: ListItem[]): Record<GroceryCategory, GroceryItem[]> {
  const out = {} as Record<GroceryCategory, GroceryItem[]>
  for (const c of CATEGORY_ORDER) out[c] = []
  for (const it of items) {
    if (it.have || it.checked) continue
    out[it.category].push({
      name: it.name,
      quantity: it.quantity ?? '1',
      unit: it.unit ?? '',
      category: it.category,
      searchTerm: it.search_term ?? it.name,
    })
  }
  return out
}

/** Plain-text version of the list for copy / share / SMS. */
export function listToText(items: ListItem[], formatQty: (q: string | number, u: string) => string): string {
  const lines: string[] = []
  for (const c of CATEGORY_ORDER) {
    const rows = items.filter((i) => i.category === c && !i.have)
    if (!rows.length) continue
    lines.push(`${c.toUpperCase()}`)
    for (const r of rows) lines.push(`${r.checked ? '☑' : '☐'} ${r.name}${r.quantity ? ` — ${formatQty(r.quantity, r.unit ?? '')}` : ''}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

const UNIT_WORDS: Record<string, string> = {
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', oz: 'oz', ounce: 'oz', ounces: 'oz',
  gallon: 'gallon', gallons: 'gallon', gal: 'gallon', quart: 'quart', quarts: 'quart', pint: 'pint', pints: 'pint',
  dozen: 'dozen', bunch: 'bunch', bunches: 'bunch', bag: 'bag', bags: 'bag', box: 'box', boxes: 'box',
  can: 'can', cans: 'can', jar: 'jar', jars: 'jar', bottle: 'bottle', bottles: 'bottle', pack: 'pack', packs: 'pack',
  loaf: 'loaf', loaves: 'loaf', head: 'head', heads: 'head', package: 'package', packages: 'package', pkg: 'package',
  case: 'case', cases: 'case', carton: 'carton', cartons: 'carton', roll: 'roll', rolls: 'roll',
}

/** "2 gallons milk" → {name: "milk", quantity: "2", unit: "gallon"}; "bananas" → {name, "1", ""}. */
export function parseTypedItem(raw: string): { name: string; quantity: string; unit: string } {
  const t = raw.trim().replace(/\s+/g, ' ')
  const m = t.match(/^(\d+(?:[.\/]\d+)?)\s*(?:x\s+)?([a-zA-Z-]+)?\s*(?:of\s+)?(.+)$/)
  if (m) {
    const qty = m[1]
    const maybeUnit = (m[2] ?? '').toLowerCase()
    const unit = UNIT_WORDS[maybeUnit]
    if (unit) return { name: m[3].trim(), quantity: qty, unit }
    // "2 bananas" — the second token is part of the name
    const name = [m[2], m[3]].filter(Boolean).join(' ').trim()
    return { name, quantity: qty, unit: '' }
  }
  return { name: t, quantity: '1', unit: '' }
}
