/**
 * Two things parents ask about a dinner before they say yes to it — client-safe, no AI:
 *   safeBite(meal)  → the one plain component a picky eater can eat on its own ("plain rice", "tortillas")
 *   cookware(meal)  → how many pans/pots/dishes the steps actually use ("1 pan", "2 pans + 1 bowl")
 * Generated dinners may carry an explicit `safeBite`; otherwise it is inferred from the ingredients.
 */
import type { Meal } from '@/types'

type Lite = Pick<Meal, 'ingredients' | 'steps' | 'tags' | 'name'> & { safeBite?: string }

// Order matters: the plainest, most reliably eaten things first.
const SAFE: Array<[RegExp, string]> = [
  [/\b(white |jasmine |basmati |plain )?rice\b(?!\s*vinegar)/i, 'plain rice'],
  [/\b(flour |corn )?tortillas?\b/i, 'a plain tortilla'],
  [/\b(pasta|penne|spaghetti|linguine|rotini|macaroni|noodles?|tortellini|ravioli)\b/i, 'plain noodles'],
  [/\b(buns?|rolls?|bread|baguette|english muffins?|pita|naan)\b/i, 'plain bread or a bun'],
  [/\b(potato(es)?|fries|tots)\b/i, 'plain potatoes'],
  [/\b(corn|corn on the cob)\b(?!\s*(starch|tortilla|flour))/i, 'corn'],
  [/\b(cheddar|mozzarella|cheese)\b/i, 'cheese'],
  [/\b(chicken (breast|tenders?|thighs?)|chicken)\b/i, 'plain chicken, sauce on the side'],
  [/\b(apple|banana|grapes|strawberr|blueberr|orange|clementine|melon|pineapple)/i, 'fruit'],
  [/\b(carrot|cucumber|snap peas|bell pepper|edamame)/i, 'raw veg on the side'],
  [/\b(black beans|beans)\b/i, 'plain beans'],
  [/\b(ground beef|beef|turkey|pork|steak)\b/i, 'the plain protein, sauce on the side'],
  [/\b(eggs?)\b/i, 'a plain egg'],
]

export function safeBite(meal: Lite): string | null {
  if (meal.safeBite && meal.safeBite.trim()) return meal.safeBite.trim()
  const names = (meal.ingredients ?? []).map((i) => i.name)
  for (const [re, label] of SAFE) if (names.some((n) => re.test(n))) return label
  return null
}

// Cookware nouns, normalised so "large skillet" and "skillet" count once.
const WARE: Array<[RegExp, string, 'pan' | 'pot' | 'dish' | 'bowl']> = [
  [/\b(sheet pan|baking sheet|sheet tray|rimmed baking sheet)\b/i, 'sheet pan', 'pan'],
  [/\b(skillet|frying pan|saut[eé] pan|wok|griddle|grill pan)\b/i, 'skillet', 'pan'],
  [/\b(large pot|stock ?pot|dutch oven|saucepan|pot of (salted )?water|pot)\b/i, 'pot', 'pot'],
  [/\b(baking dish|casserole dish|9x13|9 x 13|roasting pan|loaf pan|muffin tin|pie dish)\b/i, 'baking dish', 'dish'],
  [/\b(slow cooker|crock ?pot|instant pot|pressure cooker|air fryer)\b/i, 'one appliance', 'pot'],
  [/\b(mixing bowl|large bowl|small bowl|bowl)\b/i, 'bowl', 'bowl'],
]

export function cookware(meal: Lite): { label: string; pans: number; bowls: number } {
  const tags = (meal.tags ?? []).map((t) => t.toLowerCase())
  const text = (meal.steps ?? []).join(' ')
  const found = new Set<string>(); let bowls = 0
  for (const [re, label, kind] of WARE) {
    if (!re.test(text)) continue
    if (kind === 'bowl') bowls = 1
    else found.add(label)
  }
  let pans = found.size
  if (tags.some((t) => /one-pot|one-pan|sheet-pan|slow-cooker|instant-pot|air-fryer/.test(t))) pans = Math.min(Math.max(pans, 1), 1)
  if (pans === 0) pans = 1
  const label = `${pans} ${pans === 1 ? 'pan' : 'pans'}${bowls ? ' + 1 bowl' : ''}`
  return { label, pans, bowls }
}
