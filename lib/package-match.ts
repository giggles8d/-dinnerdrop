/**
 * Recipe amount → what a shopper actually buys.
 *
 * "2 1/2 tbsp soy sauce" is 1 bottle; "9 cups chicken broth" is 3 × 32-oz cartons; "15 eggs" is 2 dozen;
 * "1 1/4 lb beef sirloin" is 1.25 lb by weight. Stores that fill a cart from product IDs (Walmart's and
 * Amazon's add-to-cart links) need a package count, not a recipe measure — and so does a sane Instacart
 * quantity. Pure and deterministic so it can be unit-tested and reused by every store integration.
 */
import { parseQuantity } from '@/lib/portions'

export interface ListLine { name: string; quantity?: string | number | null; unit?: string | null; searchTerm?: string | null }
export interface PackagePlan {
  /** What to search the store for, including the package size when it matters ("chicken broth 32 oz"). */
  search: string
  /** How many packages / pounds / each to put in the cart. */
  count: number
  /** "package" (count of containers), "lb" (sold by weight), "each" (loose items). */
  kind: 'package' | 'lb' | 'each'
  /** Human label, e.g. "3 × 32 oz carton". */
  label: string
}

const VOL_TO_CUPS: Record<string, number> = { cup: 1, cups: 1, c: 1, tbsp: 1 / 16, tablespoon: 1 / 16, tablespoons: 1 / 16, tsp: 1 / 48, teaspoon: 1 / 48, teaspoons: 1 / 48, 'fl oz': 1 / 8, pint: 2, pints: 2, quart: 4, quarts: 4, gallon: 16, gallons: 16, ml: 1 / 237, l: 4.227, liter: 4.227, liters: 4.227 }
const WT_TO_OZ: Record<string, number> = { oz: 1, ounce: 1, ounces: 1, lb: 16, lbs: 16, pound: 16, pounds: 16, g: 1 / 28.35, gram: 1 / 28.35, grams: 1 / 28.35, kg: 35.27 }
const COUNT_UNITS = new Set(['', 'count', 'ct', 'each', 'whole', 'piece', 'pieces', 'large', 'medium', 'small', 'item', 'items'])

const has = (s: string, re: RegExp) => re.test(s)
const ceil = (n: number) => Math.max(1, Math.ceil(n - 1e-9))

type Rule = { re: RegExp; plan: (q: { n: number; unit: string; cups: number | null; oz: number | null; name: string }) => Omit<PackagePlan, 'search'> & { size?: string } }
const pkg = (count: number, what: string, size?: string) => ({ count: ceil(count), kind: 'package' as const, label: `${ceil(count)} × ${size ? `${size} ` : ''}${what}`, size })

const RULES: Rule[] = [
  // Seasonings: a recipe never needs more than one jar.
  { re: /\b(salt|pepper(corns)?|black pepper|powder|paprika|cumin|oregano|basil|thyme|rosemary|cinnamon|nutmeg|seasoning|flakes|bay leaves?|chili powder|curry|turmeric|ginger powder|allspice|cloves ground|sesame seeds)\b/i,
    plan: ({ name, n, unit }) => (/\b(bell|jalape\S*|serrano|poblano|habanero|fresh)\b/i.test(name) ? { count: COUNT_UNITS.has(unit) ? ceil(n) : 1, kind: 'each', label: `${COUNT_UNITS.has(unit) ? ceil(n) : 1} each` } : pkg(1, 'jar')) },
  { re: /\b(broth|stock)\b/i, plan: ({ cups, n }) => pkg(cups != null ? cups / 4 : n, 'carton', '32 oz') },
  { re: /\btomato paste\b/i, plan: ({ cups }) => pkg(cups != null ? cups / 0.75 : 1, 'can', '6 oz') },
  { re: /\b(crushed tomatoes|diced tomatoes|tomato sauce|black beans|kidney beans|pinto beans|chickpeas|cannellini|coconut milk|canned)\b/i,
    plan: ({ cups, n, unit }) => pkg(cups != null ? cups / 1.75 : /can/.test(unit) ? n : 1, 'can', '15 oz') },
  { re: /\b(soy sauce|hoisin|worcestershire|fish sauce|vinegar|oil|mayo(nnaise)?|ketchup|mustard|honey|maple syrup|sriracha|hot sauce|bbq sauce|barbecue sauce|salsa|teriyaki|sesame oil|cooking spray|dressing)\b/i,
    plan: ({ cups }) => pkg(cups != null && cups > 2 ? cups / 2 : 1, 'bottle') },
  { re: /\b(spaghetti|penne|rigatoni|fettuccine|linguine|macaroni|rotini|ziti|farfalle|orzo|egg noodles|lasagna|pasta)\b/i,
    plan: ({ oz, cups }) => pkg(oz != null ? oz / 16 : cups != null ? cups / 4 : 1, 'box', '16 oz') },
  { re: /\b(ramen)\b/i, plan: ({ n, unit }) => (COUNT_UNITS.has(unit) || /pack/.test(unit) ? pkg(n, 'pack') : pkg(1, 'pack')) },
  { re: /\b(rice|quinoa|couscous|farro|barley|lentils)\b/i, plan: ({ cups, oz }) => pkg(cups != null ? cups / 4.5 : oz != null ? oz / 32 : 1, 'bag', '2 lb') },
  { re: /\b(flour|sugar|cornstarch|panko|bread ?crumbs|oats|baking soda|baking powder|cocoa)\b/i, plan: ({ cups }) => pkg(cups != null && cups > 4 ? cups / 4 : 1, 'bag') },
  { re: /\beggs?\b/i, plan: ({ n, unit }) => (/dozen/.test(unit) ? pkg(n, 'carton', '12 ct') : pkg(n / 12, 'carton', '12 ct')) },
  { re: /\bbutter\b/i, plan: ({ cups }) => pkg(cups != null ? cups / 2 : 1, 'pack', '1 lb') },
  { re: /\b(milk|half and half|half-and-half|heavy cream|whipping cream|buttermilk)\b/i,
    plan: ({ cups }) => { const c = cups ?? 1; return c <= 2 ? pkg(1, 'container', '1 pint') : c <= 4 ? pkg(1, 'container', '1 quart') : c <= 8 ? pkg(1, 'jug', 'half gallon') : pkg(c / 16, 'jug', '1 gallon') } },
  { re: /\bcream cheese\b/i, plan: ({ oz, cups }) => pkg(oz != null ? oz / 8 : cups != null ? cups : 1, 'block', '8 oz') },
  { re: /\b(sour cream|yogurt|ricotta|cottage cheese)\b/i, plan: ({ cups, oz }) => pkg(cups != null ? cups / 2 : oz != null ? oz / 16 : 1, 'tub', '16 oz') },
  { re: /\b(parmesan|cheddar|mozzarella|monterey|pepper jack|cheese|cotija|feta|gruyere|swiss|provolone)\b/i,
    plan: ({ cups, oz }) => pkg(cups != null ? cups / 2 : oz != null ? oz / 8 : 1, 'bag', '8 oz') },
  { re: /\bbacon\b/i, plan: ({ oz, n, unit }) => pkg(oz != null ? oz / 16 : /slice|strip/.test(unit) ? n / 14 : 1, 'pack', '16 oz') },
  { re: /\b(frozen)\b/i, plan: ({ cups, oz }) => pkg(cups != null ? cups / 2.5 : oz != null ? oz / 12 : 1, 'bag', '12 oz') },
  { re: /\b(spinach|arugula|spring mix|salad greens|kale)\b/i, plan: ({ oz, cups }) => pkg(oz != null ? oz / 5 : cups != null ? cups / 5 : 1, 'bag', '5 oz') },
  { re: /\b(tortillas?|buns?|rolls?|bread|pita|naan)\b/i, plan: ({ n, unit }) => pkg(COUNT_UNITS.has(unit) && n > 1 ? n / 8 : 1, 'pack') },
  { re: /\bcelery\b/i, plan: ({ n, unit }) => ({ count: /stalk|rib/.test(unit) ? ceil(n / 8) : ceil(n || 1), kind: 'each', label: `${/stalk|rib/.test(unit) ? ceil(n / 8) : ceil(n || 1)} bunch` }) },
  { re: /\b(cherry tomatoes|grape tomatoes|blueberries|strawberries|raspberries)\b/i, plan: ({ cups }) => pkg(cups != null ? cups / 2 : 1, 'container', '1 pint') },
  { re: /\bgarlic\b/i, plan: ({ n, unit, name }) => (/clove/.test(unit) || /clove/.test(name) ? { count: ceil(n / 10), kind: 'each', label: `${ceil(n / 10)} head` } : { count: ceil(n || 1), kind: 'each', label: `${ceil(n || 1)} head` }) },
  { re: /\b(ginger)\b/i, plan: () => ({ count: 1, kind: 'each', label: '1 piece' }) },
  { re: /\b(cilantro|parsley|basil leaves|mint|dill|green onions?|scallions?)\b/i, plan: ({ n, unit }) => (/bunch/.test(unit) ? { count: ceil(n), kind: 'each', label: `${ceil(n)} bunch` } : { count: 1, kind: 'each', label: '1 bunch' }) },
  // Meat & fish: sold by weight.
  { re: /\b(beef|steak|sirloin|chuck|pork|chicken|turkey|lamb|salmon|cod|tilapia|shrimp|fish|sausage|ham|chorizo|ground)\b/i,
    plan: ({ oz, n, unit }) => { const lb = oz != null ? oz / 16 : COUNT_UNITS.has(unit) ? n * 0.5 : 1; const r = Math.ceil(lb * 4 - 1e-9) / 4; return { count: r, kind: 'lb', label: `${r} lb` } } },
  // Weighed produce.
  { re: /\b(broccoli|cauliflower|potatoes?|sweet potatoes?|carrots?|green beans|brussels sprouts|grapes|apples?|mushrooms?|zucchini|squash)\b/i,
    plan: ({ oz, n }) => (oz != null ? { count: Math.ceil((oz / 16) * 4 - 1e-9) / 4, kind: 'lb', label: `${Math.ceil((oz / 16) * 4 - 1e-9) / 4} lb` } : { count: ceil(n || 1), kind: 'each', label: `${ceil(n || 1)} each` }) },
]

/** Turn one grocery-list line into a store purchase. */
export function toPackages(line: ListLine): PackagePlan {
  const name = (line.searchTerm || line.name || '').trim()
  const unit = (line.unit ?? '').trim().toLowerCase()
  const n = parseQuantity(line.quantity ?? null) ?? 1
  const cups = VOL_TO_CUPS[unit] != null ? n * VOL_TO_CUPS[unit] : null
  const oz = WT_TO_OZ[unit] != null ? n * WT_TO_OZ[unit] : null
  for (const r of RULES) {
    if (!has(name, r.re)) continue
    const p = r.plan({ n, unit, cups, oz, name })
    const size = (p as { size?: string }).size
    const sized = /\d+\s*(oz|lb|ct|count|pack)\b/i.test(name)
    const label = sized && size ? p.label.replace(`${size} `, '') : p.label
    return { search: size && p.kind === 'package' && !sized ? `${name} ${size}` : name, count: p.count, kind: p.kind, label }
  }
  // Fallbacks: countable produce and anything else.
  if (COUNT_UNITS.has(unit)) return { search: name, count: ceil(n), kind: 'each', label: `${ceil(n)} each` }
  if (oz != null) return { search: name, count: Math.ceil((oz / 16) * 4 - 1e-9) / 4, kind: 'lb', label: `${Math.ceil((oz / 16) * 4 - 1e-9) / 4} lb` }
  if (/^(bag|box|pack|package|jar|can|bottle|carton|container|bunch|head|\d+-pack|case|tub|loaf)s?$/.test(unit)) return { search: name, count: ceil(n), kind: 'package', label: `${ceil(n)} × ${unit.replace(/s$/, '')}` }
  return { search: name, count: 1, kind: 'package', label: '1 × package' }
}
