import type { Meal, Ingredient } from '@/types'

/**
 * "What goes with it?" — a side for every dinner (eMeals pairs every entrée with one). Generated dinners may carry
 * an explicit `side`; otherwise one is suggested from what the dinner already has, so a pasta doesn't get rice and a
 * sheet-pan dinner with two vegetables gets bread, not more vegetables. Client-safe, no AI.
 */
export interface Side { name: string; minutes: number; items: Ingredient[] }

type Lite = Pick<Meal, 'name' | 'ingredients'> & { side?: Side }

const hay = (m: Lite) => `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' | ')}`.toLowerCase()
const HAS_STARCH = /\b(rice|pasta|spaghetti|penne|noodles?|tortillas?|potato|fries|bread|buns?|rolls?|naan|pita|couscous|quinoa|polenta|grits|gnocchi|lasagna|pizza|sandwich|wraps?|tacos?|burrito|quesadilla|tots)\b/
const HAS_GREEN = /\b(salad|greens|lettuce|romaine|arugula|spinach|kale|broccoli|green beans|asparagus|brussels|zucchini|slaw|cabbage|cucumber)\b/
const HAS_VEG = /\b(broccoli|green beans|asparagus|brussels|zucchini|carrots?|peppers?|squash|cauliflower|peas|corn|spinach|kale|salad|slaw|tomato(es)?)\b/
const SOUP = /\b(soup|chili|stew|chowder)\b/
const ASIAN = /\b(asian|chinese|japanese|korean|thai|vietnamese|teriyaki|stir[- ]fry|sesame|soy|ginger|miso|curry)\b/
const MEX = /\b(mexican|tex[- ]mex|taco|burrito|enchilada|fajita|quesadilla|salsa|chipotle)\b/
const MED = /\b(mediterranean|greek|italian|lemon|feta|olive|pesto|tzatziki)\b/

const SIDES = {
  salad: { name: 'Simple green salad', minutes: 5, items: [{ name: 'Bagged salad greens', quantity: '1', unit: 'bag', category: 'Produce' as const }, { name: 'Salad dressing', quantity: '1', unit: 'bottle', category: 'Pantry & Dry Goods' as const }] },
  garlicBread: { name: 'Garlic bread', minutes: 10, items: [{ name: 'Frozen garlic bread', quantity: '1', unit: 'package', category: 'Frozen' as const }] },
  rice: { name: 'Steamed rice', minutes: 20, items: [{ name: 'Long grain white rice', quantity: '1', unit: 'cup', category: 'Pantry & Dry Goods' as const }] },
  broccoli: { name: 'Roasted broccoli', minutes: 15, items: [{ name: 'Broccoli florets', quantity: '1', unit: 'lb', category: 'Produce' as const }] },
  greenBeans: { name: 'Garlicky green beans', minutes: 10, items: [{ name: 'Green beans', quantity: '12', unit: 'oz', category: 'Produce' as const }] },
  slaw: { name: 'Quick slaw', minutes: 5, items: [{ name: 'Coleslaw mix', quantity: '1', unit: 'bag', category: 'Produce' as const }, { name: 'Coleslaw dressing', quantity: '1', unit: 'bottle', category: 'Pantry & Dry Goods' as const }] },
  cornTortChips: { name: 'Chips and salsa', minutes: 2, items: [{ name: 'Tortilla chips', quantity: '1', unit: 'bag', category: 'Pantry & Dry Goods' as const }, { name: 'Salsa', quantity: '1', unit: 'jar', category: 'Pantry & Dry Goods' as const }] },
  cucumber: { name: 'Cucumber salad', minutes: 5, items: [{ name: 'Cucumbers', quantity: '2', unit: 'count', category: 'Produce' as const }, { name: 'Rice vinegar', quantity: '1', unit: 'bottle', category: 'Pantry & Dry Goods' as const }] },
  pita: { name: 'Warm pita and hummus', minutes: 5, items: [{ name: 'Pita bread', quantity: '1', unit: 'package', category: 'Bakery' as const }, { name: 'Hummus', quantity: '1', unit: 'container', category: 'Dairy & Eggs' as const }] },
  crustyBread: { name: 'Crusty bread', minutes: 2, items: [{ name: 'Crusty bread', quantity: '1', unit: 'loaf', category: 'Bakery' as const }] },
  fruit: { name: 'Fresh fruit', minutes: 2, items: [{ name: 'Fruit (grapes or apples)', quantity: '1', unit: 'lb', category: 'Produce' as const }] },
  cornCob: { name: 'Corn on the cob', minutes: 10, items: [{ name: 'Corn on the cob', quantity: '4', unit: 'count', category: 'Produce' as const }] },
  mash: { name: 'Mashed potatoes', minutes: 20, items: [{ name: 'Yukon gold potatoes', quantity: '2', unit: 'lb', category: 'Produce' as const }] },
}

/** The side that fits this dinner. */
export function sideFor(meal: Lite): Side {
  if (meal.side && meal.side.name) return meal.side
  const h = hay(meal)
  if (SOUP.test(h)) return /chili|taco/.test(h) ? SIDES.cornTortChips : SIDES.crustyBread
  if (MEX.test(h)) return HAS_GREEN.test(h) ? SIDES.cornTortChips : SIDES.slaw
  if (ASIAN.test(h)) return HAS_STARCH.test(h) ? SIDES.cucumber : SIDES.rice
  if (MED.test(h) && !HAS_STARCH.test(h)) return SIDES.pita
  if (!HAS_STARCH.test(h)) return /\b(steaks?|pork chops?|meatloaf|roast|chicken thighs)\b/.test(h) ? SIDES.mash : SIDES.rice
  const pasta = /\b(pasta|spaghetti|penne|lasagna|rigatoni|fettuccine|italian)\b/.test(h)
  if (!HAS_VEG.test(h)) return pasta ? SIDES.salad : SIDES.broccoli
  if (!HAS_GREEN.test(h)) return pasta ? SIDES.salad : SIDES.greenBeans
  if (/\b(pasta|spaghetti|penne|lasagna|italian)\b/.test(h)) return SIDES.garlicBread
  if (/\b(burger|bbq|grill|sandwich)\b/.test(h)) return SIDES.cornCob
  return SIDES.fruit
}
