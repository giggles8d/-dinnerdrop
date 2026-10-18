/**
 * "Rest of the shop" — the everyday things families buy alongside dinner, organized
 * as aisles. Each aisle shows the family's own usuals first (learned from what they've
 * added or texted before), then sensible defaults. Client-safe: no server imports.
 */
import type { GroceryCategory } from '@/types'
import { normalizeItemName } from '@/lib/list'

export type AisleKey = 'fruit' | 'veg' | 'snacks' | 'drinks' | 'frozen' | 'breakfast' | 'lunch' | 'dairy' | 'household'

export interface AislePick { name: string; category: GroceryCategory; searchTerm: string; quantity?: string; unit?: string }

export const AISLES: Array<{ key: AisleKey; label: string; emoji: string; picks: AislePick[] }> = [
  { key: 'fruit', label: 'Fruit', emoji: '🍎', picks: [
    { name: 'Bananas', category: 'Produce', searchTerm: 'bananas', quantity: '1', unit: 'bunch' },
    { name: 'Apples', category: 'Produce', searchTerm: 'apples', quantity: '1', unit: 'bag' },
    { name: 'Strawberries', category: 'Produce', searchTerm: 'strawberries', quantity: '1', unit: 'lb' },
    { name: 'Blueberries', category: 'Produce', searchTerm: 'blueberries', quantity: '1', unit: 'pint' },
    { name: 'Grapes', category: 'Produce', searchTerm: 'grapes', quantity: '2', unit: 'lb' },
    { name: 'Clementines', category: 'Produce', searchTerm: 'clementines', quantity: '1', unit: 'bag' },
    { name: 'Oranges', category: 'Produce', searchTerm: 'navel oranges', quantity: '1', unit: 'bag' },
    { name: 'Watermelon', category: 'Produce', searchTerm: 'watermelon', quantity: '1', unit: 'whole' },
    { name: 'Pineapple', category: 'Produce', searchTerm: 'pineapple', quantity: '1', unit: 'whole' },
    { name: 'Avocados', category: 'Produce', searchTerm: 'avocados', quantity: '3', unit: 'whole' },
    { name: 'Lemons', category: 'Produce', searchTerm: 'lemons', quantity: '3', unit: 'whole' },
    { name: 'Applesauce cups', category: 'Pantry & Dry Goods', searchTerm: 'applesauce cups', quantity: '1', unit: 'package' },
  ]},
  { key: 'veg', label: 'Veg', emoji: '🥦', picks: [
    { name: 'Baby carrots', category: 'Produce', searchTerm: 'baby carrots', quantity: '1', unit: 'bag' },
    { name: 'Cucumbers', category: 'Produce', searchTerm: 'cucumbers', quantity: '2', unit: 'whole' },
    { name: 'Salad kit', category: 'Produce', searchTerm: 'salad kit', quantity: '1', unit: 'bag' },
    { name: 'Broccoli', category: 'Produce', searchTerm: 'broccoli crowns', quantity: '1', unit: 'lb' },
    { name: 'Bell peppers', category: 'Produce', searchTerm: 'bell peppers', quantity: '3', unit: 'whole' },
    { name: 'Cherry tomatoes', category: 'Produce', searchTerm: 'cherry tomatoes', quantity: '1', unit: 'pint' },
    { name: 'Celery', category: 'Produce', searchTerm: 'celery', quantity: '1', unit: 'bunch' },
    { name: 'Sweet potatoes', category: 'Produce', searchTerm: 'sweet potatoes', quantity: '3', unit: 'lb' },
    { name: 'Spinach', category: 'Produce', searchTerm: 'baby spinach', quantity: '1', unit: 'bag' },
    { name: 'Onions', category: 'Produce', searchTerm: 'yellow onions', quantity: '1', unit: 'bag' },
    { name: 'Garlic', category: 'Produce', searchTerm: 'garlic', quantity: '1', unit: 'head' },
    { name: 'Corn on the cob', category: 'Produce', searchTerm: 'corn on the cob', quantity: '4', unit: 'whole' },
  ]},
  { key: 'snacks', label: 'Snacks', emoji: '🥨', picks: [
    { name: 'Goldfish crackers', category: 'Pantry & Dry Goods', searchTerm: 'goldfish crackers', quantity: '1', unit: 'bag' },
    { name: 'Granola bars', category: 'Pantry & Dry Goods', searchTerm: 'granola bars', quantity: '1', unit: 'box' },
    { name: 'Pretzels', category: 'Pantry & Dry Goods', searchTerm: 'pretzels', quantity: '1', unit: 'bag' },
    { name: 'Tortilla chips', category: 'Pantry & Dry Goods', searchTerm: 'tortilla chips', quantity: '1', unit: 'bag' },
    { name: 'Salsa', category: 'Pantry & Dry Goods', searchTerm: 'salsa', quantity: '1', unit: 'jar' },
    { name: 'Popcorn', category: 'Pantry & Dry Goods', searchTerm: 'microwave popcorn', quantity: '1', unit: 'box' },
    { name: 'Fruit snacks', category: 'Pantry & Dry Goods', searchTerm: 'fruit snacks', quantity: '1', unit: 'box' },
    { name: 'Trail mix', category: 'Pantry & Dry Goods', searchTerm: 'trail mix', quantity: '1', unit: 'bag' },
    { name: 'Hummus', category: 'Dairy & Eggs', searchTerm: 'hummus', quantity: '1', unit: 'container' },
    { name: 'Crackers', category: 'Pantry & Dry Goods', searchTerm: 'crackers', quantity: '1', unit: 'box' },
    { name: 'Cookies', category: 'Bakery', searchTerm: 'cookies', quantity: '1', unit: 'package' },
    { name: 'Rice cakes', category: 'Pantry & Dry Goods', searchTerm: 'rice cakes', quantity: '1', unit: 'bag' },
  ]},
  { key: 'drinks', label: 'Drinks', emoji: '🧃', picks: [
    { name: 'Milk', category: 'Dairy & Eggs', searchTerm: 'whole milk', quantity: '1', unit: 'gallon' },
    { name: 'Orange juice', category: 'Beverages', searchTerm: 'orange juice', quantity: '1', unit: 'half-gallon' },
    { name: 'Juice boxes', category: 'Beverages', searchTerm: 'juice boxes', quantity: '1', unit: 'pack' },
    { name: 'Sparkling water', category: 'Beverages', searchTerm: 'sparkling water 12 pack', quantity: '1', unit: '12-pack' },
    { name: 'Coffee', category: 'Beverages', searchTerm: 'ground coffee', quantity: '1', unit: 'bag' },
    { name: 'Creamer', category: 'Dairy & Eggs', searchTerm: 'coffee creamer', quantity: '1', unit: 'bottle' },
    { name: 'Soda', category: 'Beverages', searchTerm: 'soda 12 pack', quantity: '1', unit: '12-pack' },
    { name: 'Almond milk', category: 'Dairy & Eggs', searchTerm: 'almond milk', quantity: '1', unit: 'half-gallon' },
    { name: 'Lemonade', category: 'Beverages', searchTerm: 'lemonade', quantity: '1', unit: 'bottle' },
    { name: 'Tea bags', category: 'Beverages', searchTerm: 'tea bags', quantity: '1', unit: 'box' },
    { name: 'Gatorade', category: 'Beverages', searchTerm: 'gatorade 8 pack', quantity: '1', unit: 'pack' },
    { name: 'Bottled water', category: 'Beverages', searchTerm: 'bottled water 24 pack', quantity: '1', unit: 'case' },
  ]},
  { key: 'frozen', label: 'Frozen', emoji: '❄️', picks: [
    { name: 'Frozen pizza', category: 'Frozen', searchTerm: 'frozen pizza', quantity: '2', unit: 'whole' },
    { name: 'Chicken nuggets', category: 'Frozen', searchTerm: 'frozen chicken nuggets', quantity: '1', unit: 'bag' },
    { name: 'Frozen vegetables', category: 'Frozen', searchTerm: 'frozen mixed vegetables', quantity: '2', unit: 'bag' },
    { name: 'Frozen fruit', category: 'Frozen', searchTerm: 'frozen mixed berries', quantity: '1', unit: 'bag' },
    { name: 'Ice cream', category: 'Frozen', searchTerm: 'ice cream', quantity: '1', unit: 'container' },
    { name: 'Frozen waffles', category: 'Frozen', searchTerm: 'frozen waffles', quantity: '1', unit: 'box' },
    { name: 'French fries', category: 'Frozen', searchTerm: 'frozen french fries', quantity: '1', unit: 'bag' },
    { name: 'Popsicles', category: 'Frozen', searchTerm: 'popsicles', quantity: '1', unit: 'box' },
    { name: 'Frozen burritos', category: 'Frozen', searchTerm: 'frozen burritos', quantity: '1', unit: 'box' },
    { name: 'Fish sticks', category: 'Frozen', searchTerm: 'fish sticks', quantity: '1', unit: 'box' },
    { name: 'Frozen meatballs', category: 'Frozen', searchTerm: 'frozen meatballs', quantity: '1', unit: 'bag' },
    { name: 'Garlic bread', category: 'Frozen', searchTerm: 'frozen garlic bread', quantity: '1', unit: 'loaf' },
  ]},
  { key: 'breakfast', label: 'Breakfast', emoji: '🥞', picks: [
    { name: 'Eggs', category: 'Dairy & Eggs', searchTerm: 'large eggs', quantity: '1', unit: 'dozen' },
    { name: 'Cereal', category: 'Pantry & Dry Goods', searchTerm: 'cereal', quantity: '1', unit: 'box' },
    { name: 'Oatmeal', category: 'Pantry & Dry Goods', searchTerm: 'instant oatmeal', quantity: '1', unit: 'box' },
    { name: 'Yogurt', category: 'Dairy & Eggs', searchTerm: 'yogurt cups', quantity: '1', unit: 'package' },
    { name: 'Bagels', category: 'Bakery', searchTerm: 'bagels', quantity: '1', unit: 'package' },
    { name: 'Cream cheese', category: 'Dairy & Eggs', searchTerm: 'cream cheese', quantity: '1', unit: 'package' },
    { name: 'Pancake mix', category: 'Pantry & Dry Goods', searchTerm: 'pancake mix', quantity: '1', unit: 'box' },
    { name: 'Maple syrup', category: 'Pantry & Dry Goods', searchTerm: 'maple syrup', quantity: '1', unit: 'bottle' },
    { name: 'Bacon', category: 'Meat & Seafood', searchTerm: 'bacon', quantity: '1', unit: 'package' },
    { name: 'Breakfast sausage', category: 'Meat & Seafood', searchTerm: 'breakfast sausage', quantity: '1', unit: 'package' },
    { name: 'Butter', category: 'Dairy & Eggs', searchTerm: 'butter', quantity: '1', unit: 'lb' },
    { name: 'Jam', category: 'Pantry & Dry Goods', searchTerm: 'strawberry jam', quantity: '1', unit: 'jar' },
  ]},
  { key: 'lunch', label: 'Lunch', emoji: '🥪', picks: [
    { name: 'Sandwich bread', category: 'Bakery', searchTerm: 'sandwich bread', quantity: '1', unit: 'loaf' },
    { name: 'Deli turkey', category: 'Meat & Seafood', searchTerm: 'sliced deli turkey', quantity: '1', unit: 'lb' },
    { name: 'Deli ham', category: 'Meat & Seafood', searchTerm: 'sliced deli ham', quantity: '1', unit: 'lb' },
    { name: 'Sliced cheese', category: 'Dairy & Eggs', searchTerm: 'sliced cheese', quantity: '1', unit: 'package' },
    { name: 'Peanut butter', category: 'Pantry & Dry Goods', searchTerm: 'peanut butter', quantity: '1', unit: 'jar' },
    { name: 'Tortillas', category: 'Bakery', searchTerm: 'flour tortillas', quantity: '1', unit: 'package' },
    { name: 'Mac and cheese', category: 'Pantry & Dry Goods', searchTerm: 'mac and cheese', quantity: '3', unit: 'box' },
    { name: 'Canned soup', category: 'Pantry & Dry Goods', searchTerm: 'chicken noodle soup', quantity: '3', unit: 'can' },
    { name: 'Tuna', category: 'Pantry & Dry Goods', searchTerm: 'canned tuna', quantity: '3', unit: 'can' },
    { name: 'Mayo', category: 'Pantry & Dry Goods', searchTerm: 'mayonnaise', quantity: '1', unit: 'jar' },
    { name: 'Pickles', category: 'Pantry & Dry Goods', searchTerm: 'pickles', quantity: '1', unit: 'jar' },
    { name: 'String cheese', category: 'Dairy & Eggs', searchTerm: 'string cheese', quantity: '1', unit: 'package' },
  ]},
  { key: 'dairy', label: 'Dairy', emoji: '🧀', picks: [
    { name: 'Shredded cheddar', category: 'Dairy & Eggs', searchTerm: 'shredded cheddar cheese', quantity: '1', unit: 'bag' },
    { name: 'Sour cream', category: 'Dairy & Eggs', searchTerm: 'sour cream', quantity: '1', unit: 'container' },
    { name: 'Greek yogurt', category: 'Dairy & Eggs', searchTerm: 'greek yogurt', quantity: '1', unit: 'container' },
    { name: 'Cottage cheese', category: 'Dairy & Eggs', searchTerm: 'cottage cheese', quantity: '1', unit: 'container' },
    { name: 'Parmesan', category: 'Dairy & Eggs', searchTerm: 'grated parmesan', quantity: '1', unit: 'container' },
    { name: 'Heavy cream', category: 'Dairy & Eggs', searchTerm: 'heavy cream', quantity: '1', unit: 'pint' },
    { name: 'Block cheese', category: 'Dairy & Eggs', searchTerm: 'cheddar cheese block', quantity: '1', unit: 'block' },
    { name: 'Whipped cream', category: 'Dairy & Eggs', searchTerm: 'whipped cream', quantity: '1', unit: 'can' },
  ]},
  { key: 'household', label: 'Household & pet', emoji: '🧻', picks: [
    { name: 'Paper towels', category: 'Pantry & Dry Goods', searchTerm: 'paper towels', quantity: '1', unit: 'pack' },
    { name: 'Toilet paper', category: 'Pantry & Dry Goods', searchTerm: 'toilet paper', quantity: '1', unit: 'pack' },
    { name: 'Dish soap', category: 'Pantry & Dry Goods', searchTerm: 'dish soap', quantity: '1', unit: 'bottle' },
    { name: 'Laundry detergent', category: 'Pantry & Dry Goods', searchTerm: 'laundry detergent', quantity: '1', unit: 'bottle' },
    { name: 'Trash bags', category: 'Pantry & Dry Goods', searchTerm: 'trash bags', quantity: '1', unit: 'box' },
    { name: 'Dishwasher pods', category: 'Pantry & Dry Goods', searchTerm: 'dishwasher pods', quantity: '1', unit: 'bag' },
    { name: 'Disinfecting wipes', category: 'Pantry & Dry Goods', searchTerm: 'disinfecting wipes', quantity: '1', unit: 'container' },
    { name: 'Zip bags', category: 'Pantry & Dry Goods', searchTerm: 'zip top bags', quantity: '1', unit: 'box' },
    { name: 'Foil', category: 'Pantry & Dry Goods', searchTerm: 'aluminum foil', quantity: '1', unit: 'roll' },
    { name: 'Dog food', category: 'Pantry & Dry Goods', searchTerm: 'dog food', quantity: '1', unit: 'bag' },
    { name: 'Cat food', category: 'Pantry & Dry Goods', searchTerm: 'cat food', quantity: '1', unit: 'bag' },
    { name: 'Cat litter', category: 'Pantry & Dry Goods', searchTerm: 'cat litter', quantity: '1', unit: 'box' },
  ]},
]

const HOUSEHOLD = /paper towel|toilet|tissue|detergent|soap|wipes|trash|garbage|bleach|cleaner|sponge|foil|wrap|zip|bag|dog|cat|pet|litter|diaper|shampoo|toothpaste|deodorant|razor/i
const FROZEN = /frozen|ice cream|popsicle|pizza|waffle|fries|nugget/i
const DRINK = /milk|juice|soda|water|coffee|tea|creamer|lemonade|gatorade|dr pepper|coke|pepsi|sprite|seltzer|drink/i
const BREAKFAST = /egg|cereal|oatmeal|yogurt|bagel|pancake|syrup|bacon|sausage|granola|muffin/i
const LUNCH = /bread|deli|turkey|ham|sliced cheese|peanut butter|tortilla|mac and cheese|soup|tuna|mayo|pickle|string cheese|lunch/i
const SNACK = /chip|cracker|pretzel|bar|popcorn|cookie|snack|trail mix|hummus|dip|candy|goldfish|rice cake/i
const FRUIT = /apple|banana|berry|berries|grape|orange|clementine|melon|pineapple|avocado|lemon|lime|peach|pear|mango|kiwi|cherry|plum|applesauce/i
const DAIRY = /cheese|cream|yogurt|butter|cheddar|parmesan|mozzarella/i

/** Which aisle a free-typed item belongs to. */
export function aisleFor(name: string): AisleKey {
  const n = name.toLowerCase()
  if (HOUSEHOLD.test(n) && !/bagel|bag of|tea bag/.test(n)) return 'household'
  if (FROZEN.test(n)) return 'frozen'
  if (DRINK.test(n) && !/milk chocolate/.test(n)) return 'drinks'
  if (BREAKFAST.test(n)) return 'breakfast'
  if (SNACK.test(n)) return 'snacks'
  if (LUNCH.test(n)) return 'lunch'
  if (FRUIT.test(n)) return 'fruit'
  if (DAIRY.test(n)) return 'dairy'
  return 'veg'
}

export interface UsualItem { name: string; category: GroceryCategory; searchTerm: string; quantity: string; unit: string; times: number; lastWeek: string }

/**
 * The family's usuals: non-dinner lines from earlier weeks, most frequent and most recent first.
 * `history` = list_items rows from past weeks (source manual/sms/extra/staples).
 */
export function familyUsuals(history: Array<{ name: string; category: GroceryCategory; search_term: string | null; quantity: string | null; unit: string | null; week_start: string | null; source: string }>): UsualItem[] {
  const map = new Map<string, UsualItem>()
  for (const r of history) {
    if (!r.name || r.name.startsWith('(removed)')) continue
    const k = normalizeItemName(r.name)
    if (!k) continue
    const cur = map.get(k)
    if (cur) { cur.times++; if ((r.week_start ?? '') > cur.lastWeek) cur.lastWeek = r.week_start ?? '' }
    else map.set(k, { name: r.name, category: r.category, searchTerm: r.search_term ?? r.name, quantity: r.quantity ?? '1', unit: r.unit ?? '', times: 1, lastWeek: r.week_start ?? '' })
  }
  return Array.from(map.values()).sort((a, b) => b.times - a.times || (b.lastWeek > a.lastWeek ? 1 : -1))
}
