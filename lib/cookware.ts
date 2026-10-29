/**
 * Cookware: the "Kitchen Essentials" page and the "Cookware you'll need" list on each recipe
 * (Sarah, Oct 29 2026 — Mealime had both). Every item links to an Amazon search with our
 * Associates tag (search links never point at a dead listing). Short, general guidance on what
 * the tool is for — not claims that we tested a specific product. Client-safe, no AI.
 */
import { amazonSearchUrl } from '@/lib/amazon-affiliate'
import type { Meal } from '@/types'

export interface CookwareItem {
  id: string
  name: string
  /** Amazon search term. */
  search: string
  /** One line: what it does for weeknight dinners. */
  why: string
  /** Matches recipe steps/tags that need this tool. Items without one only appear on the essentials page. */
  match?: RegExp
  /** In the "start here" set for a new kitchen. */
  starter?: boolean
}

export interface CookwareGroup { id: string; title: string; emoji: string; items: CookwareItem[] }

export const COOKWARE: CookwareGroup[] = [
  { id: 'pans', title: 'Pots & pans', emoji: '🍳', items: [
    { id: 'skillet', name: '12-inch nonstick skillet', search: '12 inch nonstick skillet with lid', why: 'The weeknight workhorse — eggs, stir-fries, quesadillas, chicken.', match: /\b(skillet|frying pan|saut[eé] pan|nonstick pan)\b/i, starter: true },
    { id: 'cast-iron', name: '12-inch cast-iron skillet', search: '12 inch cast iron skillet pre-seasoned', why: 'Gets screaming hot for a real sear on steak, chops and smash burgers; goes stovetop to oven.', match: /\bcast[- ]iron\b/i },
    { id: 'dutch-oven', name: '5–6 quart Dutch oven', search: '6 quart enameled dutch oven', why: 'Chili, soups, braises and one-pot pastas — one heavy pot that holds heat evenly.', match: /\b(dutch oven|large pot|stock ?pot|soup pot)\b/i, starter: true },
    { id: 'saucepan', name: '3-quart saucepan with lid', search: '3 quart stainless saucepan with lid', why: 'Rice, sauces, boiled potatoes, mac and cheese.', match: /\b(saucepan|small pot|medium pot|pot of (salted )?water|bring .{0,20}to a boil)\b/i, starter: true },
    { id: 'wok', name: 'Carbon-steel wok', search: 'carbon steel wok flat bottom 14 inch', why: 'Fast, high-heat stir-fries and fried rice with room to toss.', match: /\bwok\b/i },
    { id: 'grill-pan', name: 'Grill pan / griddle', search: 'cast iron grill pan griddle reversible', why: 'Grill marks and burgers indoors, pancakes on the flat side.', match: /\b(grill pan|griddle)\b/i },
  ] },
  { id: 'bakeware', title: 'Bakeware', emoji: '🔥', items: [
    { id: 'sheet-pan', name: 'Rimmed sheet pans (half sheet, set of 2)', search: 'rimmed half sheet pan set aluminum', why: 'Sheet-pan dinners: protein and vegetables on one pan, one thing to wash.', match: /\b(sheet pan|baking sheet|sheet tray|roast(ed)? .{0,20}(at|in) .{0,6}\d{3})\b/i, starter: true },
    { id: 'baking-dish', name: '9x13 baking dish', search: '9x13 glass baking dish with lid', why: 'Casseroles, enchiladas, baked pasta, and leftovers that go straight in the fridge.', match: /\b(baking dish|casserole|9x13|9 x 13|13x9|enchiladas|bake .{0,30}(dish|pan))\b/i, starter: true },
    { id: 'parchment', name: 'Parchment paper', search: 'parchment paper roll unbleached', why: 'Nothing sticks, almost nothing to scrub.', match: /\b(parchment|line .{0,20}(sheet|pan))\b/i },
    { id: 'foil', name: 'Heavy-duty foil', search: 'heavy duty aluminum foil', why: 'Foil-packet dinners and covering dishes in the oven.', match: /\b(foil)\b/i },
    { id: 'muffin-tin', name: '12-cup muffin tin', search: '12 cup muffin pan nonstick', why: 'Egg bites, mini meatloaves and muffins.', match: /\bmuffin (tin|pan|cups?)\b/i },
    { id: 'wire-rack', name: 'Oven-safe wire rack', search: 'oven safe cooling rack fits half sheet pan', why: 'Crispier oven wings and chicken — air gets underneath.', match: /\b(wire rack|cooling rack|on a rack)\b/i },
  ] },
  { id: 'knives', title: 'Knives & cutting', emoji: '🔪', items: [
    { id: 'chef-knife', name: "8-inch chef's knife", search: '8 inch chef knife', why: 'One sharp, comfortable knife does 90% of the chopping.', match: /\b(chop|dice|mince|slice|cut)\b/i, starter: true },
    { id: 'paring-knife', name: 'Paring knife', search: 'paring knife 3.5 inch', why: 'Small jobs — trimming, coring, peeling.' },
    { id: 'board', name: 'Large cutting boards (set of 2)', search: 'large plastic cutting board set dishwasher safe', why: 'One for raw meat, one for everything else.', match: /\b(chop|dice|mince|slice|cut)\b/i, starter: true },
    { id: 'sharpener', name: 'Knife sharpener', search: 'knife sharpener manual', why: 'A sharp knife is a safer knife.' },
    { id: 'kitchen-shears', name: 'Kitchen shears', search: 'kitchen shears heavy duty', why: 'Cut chicken, herbs and pizza without a board.', match: /\b(shears|scissors|snip)\b/i },
  ] },
  { id: 'tools', title: 'Utensils & tools', emoji: '🥄', items: [
    { id: 'spatula', name: 'Silicone spatula & turner set', search: 'silicone spatula turner set heat resistant', why: 'Safe on nonstick, flips and scrapes.', match: /\b(flip|stir|turn)\b/i, starter: true },
    { id: 'tongs', name: '12-inch locking tongs', search: '12 inch locking kitchen tongs silicone tips', why: 'Turn chicken, toss pasta, pull things off the grill.', match: /\b(tongs|toss|turn .{0,10}(over|once))\b/i, starter: true },
    { id: 'wooden-spoons', name: 'Wooden spoons', search: 'wooden spoons for cooking set', why: 'Stirring sauces and soups without scratching pots.', match: /\b(stir)\b/i },
    { id: 'whisk', name: 'Balloon whisk', search: 'balloon whisk stainless', why: 'Sauces, dressings, eggs.', match: /\b(whisk)\b/i },
    { id: 'ladle', name: 'Ladle', search: 'ladle stainless steel', why: 'Soups and chili into bowls without the drips.', match: /\b(ladle|soup|chili|stew)\b/i },
    { id: 'colander', name: 'Colander', search: 'colander stainless steel large', why: 'Draining pasta, rinsing beans and produce.', match: /\b(drain|colander|rinse)\b/i, starter: true },
    { id: 'thermometer', name: 'Instant-read meat thermometer', search: 'instant read meat thermometer digital', why: 'No more cutting into chicken to check it.', match: /\b(internal temp|165 ?°?f?|145 ?°?f?|until cooked through|no longer pink)\b/i, starter: true },
    { id: 'measuring', name: 'Measuring cups & spoons', search: 'measuring cups and spoons set stainless', why: 'For the recipes that need it to be right.', match: /\b(cup|tbsp|tsp|tablespoon|teaspoon)\b/i, starter: true },
    { id: 'grater', name: 'Box grater', search: 'box grater stainless steel', why: 'Fresh cheese, zucchini, carrots.', match: /\b(grate|grated|shred)\b/i },
    { id: 'zester', name: 'Microplane zester', search: 'microplane zester grater', why: 'Lemon zest, garlic and parmesan in seconds.', match: /\b(zest|microplane)\b/i },
    { id: 'peeler', name: 'Y-peeler', search: 'y peeler vegetable', why: 'Potatoes, carrots, ribbons of zucchini.', match: /\b(peel)\b/i },
    { id: 'can-opener', name: 'Can opener', search: 'smooth edge can opener', why: 'Beans, tomatoes, coconut milk — weeknight staples.', match: /\b(canned|cans? of|drained and rinsed|oz can)\b/i },
    { id: 'masher', name: 'Potato masher', search: 'potato masher stainless', why: 'Mashed potatoes, refried beans, guacamole.', match: /\b(mash)\b/i },
  ] },
  { id: 'prep', title: 'Prep & storage', emoji: '🥣', items: [
    { id: 'bowls', name: 'Nesting mixing bowls', search: 'stainless steel mixing bowls set nesting', why: 'Marinating, tossing, mixing — you always need one more bowl.', match: /\b(bowl)\b/i, starter: true },
    { id: 'containers', name: 'Glass food-storage containers', search: 'glass meal prep containers with lids', why: 'Leftovers and lunches that go oven-to-fridge.', match: /\b(leftover|store|refrigerate)\b/i },
    { id: 'zip-bags', name: 'Gallon zip-top bags', search: 'gallon freezer bags', why: 'Marinate with no dishes; freeze extras flat.', match: /\b(marinate|zip|ziplock|freezer bag)\b/i },
    { id: 'salad-spinner', name: 'Salad spinner', search: 'salad spinner', why: 'Dry greens and herbs so dressing sticks.', match: /\b(salad|greens|lettuce)\b/i },
  ] },
  { id: 'appliances', title: 'Small appliances', emoji: '⚡', items: [
    { id: 'pressure-cooker', name: '6-quart electric pressure cooker', search: '6 quart electric pressure cooker multicooker', why: '"I forgot to start dinner" becomes dinner in 30 minutes.', match: /\b(instant pot|pressure cook|pressure-cook)\b/i },
    { id: 'slow-cooker', name: '6-quart slow cooker', search: '6 quart programmable slow cooker', why: 'Start it in the morning, dinner is done when you walk in.', match: /\b(slow cooker|crock ?pot)\b/i },
    { id: 'air-fryer', name: 'Air fryer (5–6 quart)', search: 'air fryer 6 quart', why: 'Crispy chicken and vegetables faster than heating the oven.', match: /\b(air fryer|air-fry|air fry)\b/i },
    { id: 'blender', name: 'Blender', search: 'countertop blender', why: 'Smoothies, sauces, blended soups.', match: /\b(blender|pur[eé]e(?:d)?|blend (?:until|till|to a|into|the (?:sauce|soup|mixture|dressing)|everything|all)|blend (?:in|with) a)\b/i }, // not "until the flavors blend"
    { id: 'immersion-blender', name: 'Immersion blender', search: 'immersion hand blender', why: 'Blend soup right in the pot.', match: /\b(immersion blender|hand blender|stick blender)\b/i },
    { id: 'food-processor', name: 'Mini food processor', search: 'mini food processor 3 cup', why: 'Pesto, salsa and chopping onions without tears.', match: /\b(food processor|pulse)\b/i },
    { id: 'rice-cooker', name: 'Rice cooker', search: 'rice cooker 6 cup', why: 'Perfect rice with no watching — one less burner.', match: /\b(rice cooker)\b/i },
  ] },
]

const ALL: CookwareItem[] = COOKWARE.flatMap((g) => g.items)
export const cookwareUrl = (item: CookwareItem) => amazonSearchUrl(item.search)

// The obvious ones every recipe would match ("chop", "stir", "cup"): shown only when nothing else is.
const BASIC = new Set(['chef-knife', 'board', 'spatula', 'wooden-spoons', 'measuring', 'bowls', 'can-opener', 'containers'])

/** The cookware a recipe needs, most specific first (pans and appliances before knives and spoons). */
export function cookwareForMeal(meal: Pick<Meal, 'steps' | 'tags' | 'name'>, max = 6): CookwareItem[] {
  const text = `${meal.name} ${(meal.steps ?? []).join(' ')} ${(meal.tags ?? []).join(' ').replace(/-/g, ' ')}`
  const hits = ALL.filter((i) => i.match && i.match.test(text))
  const specific = hits.filter((i) => !BASIC.has(i.id))
  const basics = hits.filter((i) => BASIC.has(i.id))
  // Skillet + cast iron: keep the more specific one.
  const out = specific.some((i) => i.id === 'cast-iron') ? specific.filter((i) => i.id !== 'skillet') : specific
  return [...out, ...basics].slice(0, max)
}
