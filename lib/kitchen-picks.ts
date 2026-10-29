/**
 * "Kitchen must-have" for the weekly Sunday Drop (Sarah, Oct 29 2026): one tool a week with an
 * Amazon affiliate link (search link, so it never points at a dead listing) and a short, honest
 * editorial review — what it does for weeknight dinners, what to look for, one honest caveat.
 * Written as general guidance, not a claim that we personally tested a specific product.
 */
import { amazonSearchUrl } from '@/lib/amazon-affiliate'

export interface KitchenPick { name: string; search: string; why: string; lookFor: string; headsUp: string }

export const KITCHEN_PICKS: KitchenPick[] = [
  { name: 'Instant-read meat thermometer', search: 'instant read meat thermometer digital',
    why: 'Takes the guesswork out of chicken, pork and steak — no more cutting into dinner to check, and no more dry, overcooked meat.',
    lookFor: 'A reading in 3 seconds or less, a backlit display and a probe that folds away.',
    headsUp: 'The cheapest ones can be slow; spend a little more for speed.' },
  { name: 'Large rimmed sheet pans (set of 2)', search: 'rimmed half sheet pan set aluminum',
    why: 'Sheet-pan dinners are the easiest weeknight meal there is: protein and vegetables on one pan, one thing to wash.',
    lookFor: 'Heavy-gauge aluminum "half sheet" size (about 18 x 13 in) that won\'t warp in a hot oven.',
    headsUp: 'Thin pans buckle at 425°F; pair with parchment paper to skip scrubbing.' },
  { name: '6-quart electric pressure cooker', search: '6 quart electric pressure cooker multicooker',
    why: 'Turns "I forgot to start dinner" into dinner in 30 minutes — shredded chicken, chili, rice and soups without watching the stove.',
    lookFor: '6-quart size for a family of 4, a stainless-steel inner pot and a sauté setting.',
    headsUp: 'Add about 15 minutes to any recipe for it to come up to pressure.' },
  { name: 'Air fryer (5–6 quart)', search: 'air fryer 6 quart',
    why: 'Crispy chicken, frozen fries and roasted vegetables faster than heating the oven — and kids tend to eat what comes out of it.',
    lookFor: 'A basket big enough for a family (5 quarts or more) and dishwasher-safe parts.',
    headsUp: 'It takes counter space; smaller baskets mean cooking in batches.' },
  { name: "8-inch chef's knife", search: '8 inch chef knife',
    why: 'A sharp, comfortable knife makes chopping faster and safer than a drawer of dull ones.',
    lookFor: 'A full-tang blade, a handle that feels good in your hand, and a price that leaves room for a sharpener.',
    headsUp: 'Hand-wash it — the dishwasher dulls blades fast.' },
  { name: 'Large cutting board with juice groove', search: 'large cutting board juice groove',
    why: 'Room to chop a whole dinner\'s worth of vegetables without things rolling onto the counter.',
    lookFor: 'At least 18 x 12 inches, a groove to catch juices, and non-slip feet or edges.',
    headsUp: 'Keep a separate board for raw meat.' },
  { name: '12-inch nonstick skillet', search: '12 inch nonstick skillet',
    why: 'The workhorse for eggs, stir-fries, quesadillas and one-pan pastas — food releases and cleanup takes a minute.',
    lookFor: 'A heavy base that heats evenly, an oven-safe handle and a lid.',
    headsUp: 'Nonstick wears out; use wooden or silicone tools and skip high heat to make it last.' },
  { name: 'Glass meal-prep containers', search: 'glass meal prep containers with lids',
    why: 'Leftovers become tomorrow\'s lunch: oven- and microwave-safe, and they don\'t stain from tomato sauce.',
    lookFor: 'Snap-lock lids, a mix of sizes, and glass that\'s safe in the oven (lids off).',
    headsUp: 'Glass is heavier than plastic for lunch bags.' },
  { name: '6-quart slow cooker', search: '6 quart programmable slow cooker',
    why: 'Load it in the morning, walk in to dinner at 6. Great for roasts, chili and pulled chicken on busy days.',
    lookFor: 'A programmable timer that switches to "warm" when done.',
    headsUp: 'Most recipes need 6–8 hours, so it\'s a morning-planning tool.' },
  { name: 'Silicone spatula & tongs set', search: 'silicone kitchen utensil set tongs spatula',
    why: 'Heat-safe tools that won\'t scratch your pans — the ones you reach for every single night.',
    lookFor: 'One-piece silicone heads (no gaps for food to hide) and locking tongs.',
    headsUp: 'Cheap sets can melt near a hot burner; check the heat rating.' },
  { name: 'Salad spinner', search: 'salad spinner',
    why: 'Washed, dry greens in a minute — so the side salad actually happens on a weeknight.',
    lookFor: 'A pump or crank that works one-handed and a basket that doubles as a colander.',
    headsUp: 'It\'s bulky to store.' },
  { name: 'Digital kitchen scale', search: 'digital kitchen scale grams ounces',
    why: 'Portions come out right and recipes turn out the same every time — handy when doubling a dinner.',
    lookFor: 'Grams and ounces, a tare button and a flat surface that wipes clean.',
    headsUp: 'Batteries die at the worst time; keep spares.' },
]

/** One pick per week, rotating through the list. */
export function kitchenPickFor(date: Date): KitchenPick & { url: string } {
  const week = Math.floor(date.getTime() / (7 * 86400000))
  const p = KITCHEN_PICKS[week % KITCHEN_PICKS.length]
  return { ...p, url: amazonSearchUrl(p.search) }
}
