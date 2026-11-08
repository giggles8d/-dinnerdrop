/**
 * The Sunday Drop's kitchen pick (Sarah, Nov 8 2026; plan reviewed by ChatGPT 9/10 and Gemini 9.2/10).
 * ONE Amazon product per email, matched to the dinner the email features. Every product is an exact Amazon
 * product page (never a search link — search links earn no credit). All 19 were opened on Amazon on Nov 8 2026:
 * in stock, 4.7★ or better. About half are things families run out of and buy again; no $100+ appliances
 * (a big-ticket appliance next to a $15 dinner reads as a sales pitch).
 * Copy is general guidance, never a claim that Sarah personally tested a product.
 * Links in emails use the newsletter tracking ID so newsletter sales show up on their own.
 */
import { amazonProductUrl } from '@/lib/amazon-affiliate'

/** Amazon tracking ID for the Sunday Drop (created Nov 8 2026 in Associates Central). One ID for everyone: never per person. */
export const NEWSLETTER_TAG = 'dinnerdropnl-20'

export interface KitchenPick {
  asin: string
  product: string
  /** Two short, honest lines on why it helps with this kind of dinner. */
  why: string
  /** Which dinners it goes with (tested against the dinner's name + ingredients). */
  fits: RegExp
  /** Runs out and gets bought again (preferred when two picks fit). */
  consumable: boolean
}

const SHEET = /\bsheet[- ]?pan|roast(ed)?\b|\bbaked?\b|tray/i
export const KITCHEN_PICKS: KitchenPick[] = [
  { asin: 'B00C37QN2C', product: 'Reynolds Kitchens Stay Flat Parchment Paper', consumable: true, fits: /sheet[- ]?pan|roast(ed)?|baked? (salmon|cod|fish|chicken)|salmon|cod|tilapia|glaze/i,
    why: 'Line the pan, roast, toss the paper. No scrubbing burnt glaze off the sheet pan, and the grid lines help you cut even portions.' },
  { asin: 'B001T6JTMY', product: 'If You Care Parchment Paper (70 sq ft)', consumable: true, fits: /sheet[- ]?pan|roast(ed)?|cookies?|biscuits?/i,
    why: 'Unbleached parchment that keeps sheet-pan dinners from sticking. One long roll lasts most families a couple of months.' },
  { asin: 'B09F8PHR1L', product: 'Reynolds Wrap Non-Stick Aluminum Foil', consumable: true, fits: /casserole|\bbake\b|lasagna|ziti|enchiladas?|hotdish|nachos/i,
    why: 'Cheese and sauce lift right off instead of tearing the top of the casserole. Cover the dish, then use it to line the pan for leftovers.' },
  { asin: 'B00IE76Q7M', product: 'Reynolds Kitchens Slow Cooker Liners', consumable: true, fits: /slow[- ]?cooker|crock[- ]?pot|pulled|pot roast/i,
    why: 'The liner goes in the crock, dinner cooks, the mess goes in the trash. No soaking a crusted slow cooker overnight.' },
  { asin: 'B000VDSS3C', product: 'Better Than Bouillon Roasted Chicken Base', consumable: true, fits: /soup|stew|chowder|pot pie|chicken and rice|risotto|gravy|noodle/i,
    why: 'A spoonful makes a cup of broth, so you never run out mid-recipe. One jar replaces about 9 cartons of stock in the pantry.' },
  { asin: 'B000VDWQXA', product: 'Better Than Bouillon Roasted Beef Base', consumable: true, fits: /stroganoff|beef stew|pot roast|french dip|chili|gravy|shepherd|beef and (noodles|broccoli)/i,
    why: 'Deep beef flavor for stroganoff, stew and gravy from one spoonful. It keeps in the fridge for months.' },
  { asin: 'B0DGNHJVLY', product: 'Ziploc Gallon Freezer Bags (2-pack)', consumable: true, fits: /marinat|freez|meatballs?|burgers?|chili|soup|batch|make[- ]ahead/i,
    why: 'Freeze half a batch flat so it thaws fast, or marinate tomorrow\'s chicken tonight. Thick enough to stop freezer burn.' },
  { asin: 'B07GSSR5V2', product: 'Souper Cubes 1-Cup Freezer Trays (2-pack)', consumable: false, fits: /soup|chili|stew|chowder|sauce|bolognese|make[- ]ahead/i,
    why: 'Freeze leftover soup or chili in single portions and pop out one or four. They stack flat in the freezer and go in the dishwasher.' },
  { asin: 'B07L51SFVS', product: 'Pyrex Simply Store Glass Containers (12-pc)', consumable: false, fits: /leftover|meal prep|casserole|bowls?|lasagna|bake/i,
    why: 'Leftovers become tomorrow\'s lunch. Oven and microwave safe (lids off), and they don\'t stain from tomato sauce.' },
  { asin: 'B07JRCSTKT', product: 'Mutti Double Concentrated Tomato Paste (4 tubes)', consumable: true, fits: /spaghetti|bolognese|marinara|lasagna|ziti|chili|tomato|meatballs?|parm/i,
    why: 'Squeeze out the tablespoon the recipe needs and cap it. No more half-used cans going fuzzy in the fridge.' },
  { asin: 'B0C1G4TSY1', product: 'Tajín Clásico Chile Lime Seasoning (2-pack)', consumable: true, fits: /tacos?|fajitas?|street corn|elote|chili[- ]lime|grilled chicken|quesadilla|burrito/i,
    why: 'Chile, lime and salt in one shake for tacos, grilled chicken and corn. Mild enough that most kids like it.' },
  { asin: 'B006R1UE52', product: 'Lee Kum Kee Premium Oyster Sauce', consumable: true, fits: /stir[- ]?fry|lo mein|chow mein|fried rice|beef and broccoli|bok choy|asian noodles?|drunken noodles/i,
    why: 'The savory backbone of takeout-style stir-fries. A couple of spoonfuls and the sauce tastes like the restaurant\'s.' },
  { asin: 'B002HMN6SC', product: 'Kadoya Roasted Sesame Oil', consumable: true, fits: /teriyaki|stir[- ]?fry|fried rice|sesame|soy|rice bowls?|korean|asian/i,
    why: 'A few drops at the end make teriyaki and fried rice smell like takeout. One bottle lasts months.' },
  { asin: 'B07XXSYLL8', product: 'ThermoPro TempSwift Instant-Read Thermometer', consumable: false, fits: /pork chops?|chicken breasts?|chicken thighs?|steak|roast chicken|tenderloin|meatloaf|salmon|turkey breast/i,
    why: 'Reads in a couple of seconds, so you stop cutting into dinner to check. No more dry pork chops or pink chicken.' },
  { asin: 'B000KILLXM', product: 'OXO Good Grips Kitchen Shears', consumable: false, fits: /chicken|pizza|bacon|herbs?|tortillas?|wings/i,
    why: 'Trim chicken, snip bacon straight into the pan and cut pizza for the kids. The blades come apart for the dishwasher.' },
  { asin: 'B00KSMBL26', product: 'DI ORO Silicone Spatula Set (3-pc)', consumable: false, fits: /skillet|mac and cheese|alfredo|sauce|scrambl|stroganoff|cream/i,
    why: 'Heat-safe spatulas that scrape every bit of sauce out of the pan without scratching nonstick.' },
  { asin: 'B003L0OYK8', product: 'OXO Good Grips 12" Tongs', consumable: false, fits: /grill(ed)?|spaghetti|noodles?|sheet[- ]?pan|wings|sausage|kebab|skewers?/i,
    why: 'Flip chicken, toss pasta and pull things off a hot sheet pan. The silicone tips are safe on nonstick.' },
  { asin: 'B0000CCY1Y', product: 'OXO Good Grips Angled Measuring Cups', consumable: false, fits: /rice|quinoa|oats|pancakes?|muffins?|biscuits?|casserole/i,
    why: 'Read the amount from above while you pour, which makes it easy to hand measuring to a kid who wants to help.' },
  { asin: 'B0049C2S32', product: 'Nordic Ware Naturals Half Sheet Pan', consumable: false, fits: SHEET,
    why: 'Heavy aluminum that doesn\'t warp at 425°F, and big enough to roast dinner for four on one pan.' },
]

/** Amazon product page with the newsletter tracking ID. */
export const pickUrl = (p: KitchenPick) => amazonProductUrl(p.asin, NEWSLETTER_TAG)

/**
 * The pick for this dinner: fits its name/ingredients, not shown to this family in their last 8 emails,
 * consumables first. null = nothing fits well enough, and the email leaves the block out that week.
 */
export function pickForDinner(dinner: { name: string; ingredients?: Array<{ name: string }> }, recentAsins: string[] = [], rotate = 0): KitchenPick | null {
  const name = dinner.name
  const all = `${name} ${(dinner.ingredients ?? []).map((i) => i.name).join(' ')}`
  const recent = new Set(recentAsins)
  // A match on the dinner's own name beats one only in the ingredients.
  const score = (p: KitchenPick) => (p.fits.test(name) ? 2 : p.fits.test(all) ? 1 : 0) + (p.consumable ? 0.5 : 0)
  const ranked = KITCHEN_PICKS.filter((p) => !recent.has(p.asin) && score(p) >= 1).sort((a, b) => score(b) - score(a))
  if (!ranked.length) return null
  const top = ranked.filter((p) => score(p) === score(ranked[0]))
  return top[rotate % top.length]
}
