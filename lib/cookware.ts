/**
 * Cookware: the "Kitchen Essentials" page and the "Cookware you'll need" list on each recipe
 * (Sarah, Oct 29 2026 — Mealime had both). Every item links to one specific, well-reviewed Amazon
 * product with our Associates tag (Sarah, Nov 7 2026: direct products, not searches). Short, general guidance on what
 * the tool is for — not claims that we tested a specific product. Client-safe, no AI.
 */
import { amazonProductUrl, amazonSearchUrl } from '@/lib/amazon-affiliate'
import type { Meal } from '@/types'

export interface CookwareItem {
  id: string
  name: string
  /** Amazon search term (fallback if a product listing is ever missing). */
  search: string
  /** The specific Amazon product we link to (ASIN). */
  asin?: string
  /** That product's short name, shown under the tool. */
  product?: string
  /** Sarah uses this one herself. */
  founderPick?: boolean
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
    { id: 'skillet', name: '12-inch nonstick skillet', founderPick: true, search: '12 inch nonstick skillet with lid', asin: 'B07W62FH16', product: 'HexClad 12" Hybrid Nonstick Frying Pan', why: 'The weeknight workhorse — eggs, stir-fries, quesadillas, chicken.', match: /\b(skillet|frying pan|saut[eé] pan|nonstick pan)\b/i, starter: true },
    { id: 'cast-iron', name: '12-inch cast-iron skillet', search: '12 inch cast iron skillet pre-seasoned', asin: 'B00G2XGC88', product: 'Lodge 12" Pre-Seasoned Cast Iron Skillet', why: 'Gets screaming hot for a real sear on steak, chops and smash burgers; goes stovetop to oven.', match: /\bcast[- ]iron\b/i },
    { id: 'dutch-oven', name: '5–6 quart Dutch oven', search: '6 quart enameled dutch oven', asin: 'B073Q9WV8S', product: 'Amazon Basics 6-Qt Enameled Cast Iron Dutch Oven', why: 'Chili, soups, braises and one-pot pastas — one heavy pot that holds heat evenly.', match: /\b(dutch oven|large pot|stock ?pot|soup pot)\b/i, starter: true },
    { id: 'saucepan', name: '3-quart saucepan with lid', search: '3 quart stainless saucepan with lid', asin: 'B00008CM6D', product: 'Cuisinart Chef\'s Classic 3-Qt Saucepan with Cover', why: 'Rice, sauces, boiled potatoes, mac and cheese.', match: /\b(saucepan|small pot|medium pot|pot of (salted )?water|bring .{0,20}to a boil)\b/i, starter: true },
    { id: 'wok', name: 'Carbon-steel wok', search: 'carbon steel wok flat bottom 14 inch', asin: 'B084DQYNNM', product: 'YOSUKATA 13.5" Flat-Bottom Carbon Steel Wok', why: 'Fast, high-heat stir-fries and fried rice with room to toss.', match: /\bwok\b/i },
    { id: 'grill-pan', name: 'Grill pan / griddle', search: 'cast iron grill pan griddle reversible', asin: 'B002CMLTXG', product: 'Lodge Reversible Cast Iron Grill/Griddle', why: 'Grill marks and burgers indoors, pancakes on the flat side.', match: /\b(grill pan|griddle)\b/i },
  ] },
  { id: 'bakeware', title: 'Bakeware', emoji: '🔥', items: [
    { id: 'sheet-pan', name: 'Rimmed half-sheet pan', search: 'rimmed half sheet pan set aluminum', asin: 'B0049C2S32', product: 'Nordic Ware Naturals Half Sheet Pan', why: 'Sheet-pan dinners: protein and vegetables on one pan, one thing to wash.', match: /\b(sheet pan|baking sheet|sheet tray|roast(ed)? .{0,20}(at|in) .{0,6}\d{3})\b/i, starter: true },
    { id: 'baking-dish', name: '9x13 baking dish', search: '9x13 glass baking dish with lid', asin: 'B09ZLT4FZJ', product: 'Pyrex Deep 9x13" Glass Baking Dish with Lid', why: 'Casseroles, enchiladas, baked pasta, and leftovers that go straight in the fridge.', match: /\b(baking dish|casserole|9x13|9 x 13|13x9|enchiladas|bake .{0,30}(dish|pan))\b/i, starter: true },
    { id: 'parchment', name: 'Parchment paper', search: 'parchment paper roll unbleached', asin: 'B0D5MSJ3PJ', product: 'Reynolds Parchment Paper Roll (2-pack)', why: 'Nothing sticks, almost nothing to scrub.', match: /\b(parchment|line .{0,20}(sheet|pan))\b/i },
    { id: 'foil', name: 'Heavy-duty foil', search: 'heavy duty aluminum foil', asin: 'B00M8ZEAW4', product: 'Reynolds Wrap Heavy Duty Aluminum Foil', why: 'Foil-packet dinners and covering dishes in the oven.', match: /\b(foil)\b/i },
    { id: 'muffin-tin', name: '12-cup muffin tin', search: '12 cup muffin pan nonstick', asin: 'B073P4RPFP', product: 'Amazon Basics Nonstick Muffin Pan', why: 'Egg bites, mini meatloaves and muffins.', match: /\bmuffin (tin|pan|cups?)\b/i },
    { id: 'wire-rack', name: 'Oven-safe wire rack', search: 'oven safe cooling rack fits half sheet pan', asin: 'B081THCMXB', product: 'Cooling and Baking Rack Set (fits half sheet)', why: 'Crispier oven wings and chicken — air gets underneath.', match: /\b(wire rack|cooling rack|on a rack)\b/i },
  ] },
  { id: 'knives', title: 'Knives & cutting', emoji: '🔪', items: [
    { id: 'chef-knife', name: "8-inch chef's knife", search: '8 inch chef knife', asin: 'B008M5U1C2', product: 'Victorinox Fibrox Pro 8" Chef\'s Knife', why: 'One sharp, comfortable knife does 90% of the chopping.', match: /\b(chop|dice|mince|slice|cut)\b/i, starter: true },
    { id: 'paring-knife', name: 'Paring knife', search: 'paring knife 3.5 inch', asin: 'B0061SWLKW', product: 'Victorinox Swiss Classic 3.25" Paring Knife', why: 'Small jobs — trimming, coring, peeling.' },
    { id: 'board', name: 'Large cutting boards (set of 2)', search: 'large plastic cutting board set dishwasher safe', asin: 'B07WBTRRMT', product: 'OXO Good Grips 2-Piece Cutting Board Set', why: 'One for raw meat, one for everything else.', match: /\b(chop|dice|mince|slice|cut)\b/i, starter: true },
    { id: 'sharpener', name: 'Knife sharpener', search: 'knife sharpener manual', asin: 'B079WWFZY6', product: '3-Stage Manual Knife Sharpener', why: 'A sharp knife is a safer knife.' },
    { id: 'kitchen-shears', name: 'Kitchen shears', search: 'kitchen shears heavy duty', asin: 'B000KILLXM', product: 'OXO Good Grips Multi-Purpose Kitchen Shears', why: 'Cut chicken, herbs and pizza without a board.', match: /\b(shears|scissors|snip)\b/i },
  ] },
  { id: 'tools', title: 'Utensils & tools', emoji: '🥄', items: [
    { id: 'spatula', name: 'Silicone spatula & turner set', search: 'silicone spatula turner set heat resistant', asin: 'B0DWX1SCXG', product: '5-Piece Silicone Spatula Set', why: 'Safe on nonstick, flips and scrapes.', match: /\b(flip|stir|turn)\b/i, starter: true },
    { id: 'tongs', name: '12-inch locking tongs', search: '12 inch locking kitchen tongs silicone tips', asin: 'B003L0OYK8', product: 'OXO Good Grips 12" Tongs with Silicone Heads', why: 'Turn chicken, toss pasta, pull things off the grill.', match: /\b(tongs|toss|turn .{0,10}(over|once))\b/i, starter: true },
    { id: 'wooden-spoons', name: 'Wooden spoons', search: 'wooden spoons for cooking set', asin: 'B0BBGQ2GLZ', product: 'Wooden Spoons for Cooking (10-piece)', why: 'Stirring sauces and soups without scratching pots.', match: /\b(stir)\b/i },
    { id: 'whisk', name: 'Balloon whisk', search: 'balloon whisk stainless', asin: 'B00004OCNS', product: 'OXO Good Grips 11" Balloon Whisk', why: 'Sauces, dressings, eggs.', match: /\b(whisk)\b/i },
    { id: 'ladle', name: 'Ladle', search: 'ladle stainless steel', asin: 'B003L0OOVW', product: 'OXO Good Grips Nylon Ladle', why: 'Soups and chili into bowls without the drips.', match: /\b(ladle|soup|chili|stew)\b/i },
    { id: 'colander', name: 'Colander', search: 'colander stainless steel large', asin: 'B09Z76236G', product: 'OXO Good Grips 5-Qt Strainer', why: 'Draining pasta, rinsing beans and produce.', match: /\b(drain|colander|rinse)\b/i, starter: true },
    { id: 'thermometer', name: 'Instant-read meat thermometer', search: 'instant read meat thermometer digital', asin: 'B07XXSYLL8', product: 'ThermoPro TempSwift Instant-Read Thermometer', why: 'No more cutting into chicken to check it.', match: /\b(internal temp|165 ?°?f?|145 ?°?f?|until cooked through|no longer pink)\b/i, starter: true },
    { id: 'measuring', name: 'Measuring cups & spoons', search: 'measuring cups and spoons set stainless', asin: 'B0CBW78J4Q', product: 'Spring Chef Stainless Measuring Cups & Spoons', why: 'For the recipes that need it to be right.', match: /\b(cup|tbsp|tsp|tablespoon|teaspoon)\b/i, starter: true },
    { id: 'grater', name: 'Box grater', search: 'box grater stainless steel', asin: 'B0FDCY2DR7', product: 'KitchenAid Gourmet Box Grater', why: 'Fresh cheese, zucchini, carrots.', match: /\b(grate|grated|shred)\b/i },
    { id: 'zester', name: 'Microplane zester', search: 'microplane zester grater', asin: 'B00151WA06', product: 'Microplane Premium Classic Zester', why: 'Lemon zest, garlic and parmesan in seconds.', match: /\b(zest|microplane)\b/i },
    { id: 'peeler', name: 'Y-peeler', search: 'y peeler vegetable', asin: 'B00004OCIU', product: 'OXO Good Grips Y-Peeler', why: 'Potatoes, carrots, ribbons of zucchini.', match: /\b(peel)\b/i },
    { id: 'can-opener', name: 'Can opener', search: 'smooth edge can opener', asin: 'B00004OCJW', product: 'OXO Good Grips Manual Can Opener', why: 'Beans, tomatoes, coconut milk — weeknight staples.', match: /\b(canned|cans? of|drained and rinsed|oz can)\b/i },
    { id: 'masher', name: 'Potato masher', search: 'potato masher stainless', asin: 'B00004OCL9', product: 'OXO Good Grips Stainless Potato Masher', why: 'Mashed potatoes, refried beans, guacamole.', match: /\b(mash)\b/i },
  ] },
  { id: 'prep', title: 'Prep & storage', emoji: '🥣', items: [
    { id: 'bowls', name: 'Nesting mixing bowls', search: 'stainless steel mixing bowls set nesting', asin: 'B01HTYH8YA', product: 'FineDine Stainless Steel Mixing Bowl Set', why: 'Marinating, tossing, mixing — you always need one more bowl.', match: /\b(bowl)\b/i, starter: true },
    { id: 'containers', name: 'Glass food-storage containers', search: 'glass meal prep containers with lids', asin: 'B07L51SFVS', product: 'Pyrex Simply Store Glass Containers (12-pc)', why: 'Leftovers and lunches that go oven-to-fridge.', match: /\b(leftover|store|refrigerate)\b/i },
    { id: 'zip-bags', name: 'Gallon zip-top bags', search: 'gallon freezer bags', asin: 'B093WPZF1Y', product: 'Amazon Basics Gallon Freezer Bags', why: 'Marinate with no dishes; freeze extras flat.', match: /\b(marinate|zip|ziplock|freezer bag)\b/i },
    { id: 'salad-spinner', name: 'Salad spinner', search: 'salad spinner', asin: 'B00004OCKR', product: 'OXO Good Grips Salad Spinner', why: 'Dry greens and herbs so dressing sticks.', match: /\b(salad|greens|lettuce)\b/i },
  ] },
  { id: 'appliances', title: 'Small appliances', emoji: '⚡', items: [
    { id: 'pressure-cooker', name: '6-quart electric pressure cooker', search: '6 quart electric pressure cooker multicooker', asin: 'B00FLYWNYQ', product: 'Instant Pot Duo 6-Qt 7-in-1', why: '"I forgot to start dinner" becomes dinner in 30 minutes.', match: /\b(instant pot|pressure cook|pressure-cook)\b/i },
    { id: 'slow-cooker', name: '6-quart slow cooker', search: '6 quart programmable slow cooker', asin: 'B004P2NG0K', product: 'Crock-Pot 6-Qt Programmable Cook & Carry', why: 'Start it in the morning, dinner is done when you walk in.', match: /\b(slow cooker|crock ?pot)\b/i },
    { id: 'air-fryer', name: 'Air fryer (5–6 quart)', search: 'air fryer 6 quart', asin: 'B0CSZ7WBYW', product: 'Ninja Air Fryer Pro 5-Qt', why: 'Crispy chicken and vegetables faster than heating the oven.', match: /\b(air fryer|air-fry|air fry)\b/i },
    { id: 'blender', name: 'Blender', search: 'countertop blender', asin: 'B00939FV8K', product: 'Ninja Professional Plus Blender 72 oz', why: 'Smoothies, sauces, blended soups.', match: /\b(blender|pur[eé]e(?:d)?|blend (?:until|till|to a|into|the (?:sauce|soup|mixture|dressing)|everything|all)|blend (?:in|with) a)\b/i }, // not "until the flavors blend"
    { id: 'immersion-blender', name: 'Immersion blender', search: 'immersion hand blender', asin: 'B08F2QZZPQ', product: 'KitchenAid Variable Speed Hand Blender', why: 'Blend soup right in the pot.', match: /\b(immersion blender|hand blender|stick blender)\b/i },
    { id: 'food-processor', name: 'Mini food processor', search: 'mini food processor 3 cup', asin: 'B0000645YM', product: 'Cuisinart Mini-Prep 3-Cup Food Processor', why: 'Pesto, salsa and chopping onions without tears.', match: /\b(food processor|pulse)\b/i },
    { id: 'rice-cooker', name: 'Rice cooker', search: 'rice cooker 6 cup', asin: 'B007WQ9YNO', product: 'AROMA Digital Rice Cooker 4-Cup', why: 'Perfect rice with no watching — one less burner.', match: /\b(rice cooker)\b/i },
  ] },
]

const ALL: CookwareItem[] = COOKWARE.flatMap((g) => g.items)
export const cookwareUrl = (item: CookwareItem) => (item.asin ? amazonProductUrl(item.asin) : amazonSearchUrl(item.search))

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
