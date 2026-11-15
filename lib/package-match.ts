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
// Instacart only fills a quantity from a real amount (tested Nov 15 2026: "3 package", "3 each" and duplicate lines all
// became 1; "3 × 144 fl oz" Pepsi and "2 × 16 oz" salsa came through right). So several packages of something are
// sent as count × a typical package size. Single packages don't need one.
const SIZE_HINTS: Array<[RegExp, string]> = [
  [/\b(soda|pop|pepsi|coke|cola|dr\.? ?pepper|sprite|ginger ale|seltzer|sparkling water|la ?croix)\b/i, '12 pack 144 fl oz'],
  [/\b(gatorade|juice box(es)?|bottled water|water bottles?)\b/i, '192 fl oz'],
  [/\bice cream\b/i, '48 fl oz'],
  [/\b(pierogies|frozen (pizza|meals?|dinners?)|garlic (bread|toast)|texas toast)\b/i, '16 oz'],
  [/\bfrozen\b/i, '12 oz'],
  [/\b(salsa|queso)\b/i, '16 oz'],
  [/\b(marinara|pasta sauce|spaghetti sauce|alfredo)\b/i, '24 oz'],
  [/\b(tortillas?)\b/i, '16 oz'],
  [/\b(bread|buns?|rolls?)\b/i, '20 oz'],
  [/\b(mac (and|&|n) cheese)\b/i, '7.25 oz'],
  [/\b(lunchables)\b/i, '3.5 oz'],
  [/\b(pie crusts?)\b/i, '14 oz'],
  [/\b(yogurt)\b/i, '16 oz'],
  [/\b(pouch(es)?|ready rice|microwave rice)\b/i, '8.8 oz'],
  [/\b(seasoning mix|taco seasoning|gravy mix|packets?)\b/i, '1 oz'],
  [/\b(cereal)\b/i, '12 oz'],
  [/\b(chips|crackers|pretzels|cookies)\b/i, '10 oz'],
  [/\b(tuna)\b/i, '5 oz'],
  [/\b(beans|tomatoes|corn|peas|soup)\b/i, '15 oz'],
  [/\b(pasta|spaghetti|penne|noodles)\b/i, '16 oz'],
  [/\b(cheese)\b/i, '8 oz'],
  [/\b(salad|greens|spinach)\b/i, '10 oz'],
]
const PACKAGE_WORDS = /^(bag|box|pack|package|pkg|jar|can|bottle|carton|container|tub|loaf|loaves|block|case|pouch|sleeve|roll|tube|\d+-pack|half-gallon|jug)(e?s)?$/
/** Only borrow the rule's package size when it's the same kind of package ("bag" ↔ "12 oz bag", not "box" ↔ "8 oz bag"). */
const sameKind = (unit: string, label: string) => { const u = unit.replace(/e?s$/, ''); return u !== 'package' && label.includes(u) }
const ceil = (n: number) => Math.max(1, Math.ceil(n - 1e-9))

type Rule = { re: RegExp; plan: (q: { n: number; unit: string; cups: number | null; oz: number | null; name: string }) => Omit<PackagePlan, 'search'> & { size?: string } }
const pkg = (count: number, what: string, size?: string) => ({ count: ceil(count), kind: 'package' as const, label: `${ceil(count)} × ${size ? `${size} ` : ''}${what}`, size })

const RULES: Rule[] = [
  // Nov 15 2026 (Sarah's cart had a 3-pack of Dr Pepper sent as 1 jar of seasoning): drinks and ice cream before the
  // word rules, so "Dr Pepper", "zero sugar" and "mint chocolate chip" don't hit pepper / sugar / mint.
  { re: /\b(soda|pop|pepsi|coke|coca[- ]?cola|cola|dr\.? ?pepper|sprite|ginger ale|seltzer|sparkling water|la ?croix|gatorade|juice box(es)?|bottled water|water bottles?|energy drinks?)\b/i,
    plan: ({ n, unit }) => pkg(/pack|case|bottle|can/.test(unit) || COUNT_UNITS.has(unit) ? n : 1, 'pack') },
  { re: /\bice cream\b/i, plan: ({ n, unit }) => pkg(COUNT_UNITS.has(unit) || /container|tub|carton|pint|quart|gallon|box/.test(unit) ? n : 1, 'container') },
  { re: /\b(mac (and|&|n) cheese|macaroni (and|&) cheese)\b/i, plan: ({ n, unit }) => pkg(COUNT_UNITS.has(unit) || /box|pack/.test(unit) ? n : 1, 'box') },
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
  { re: /\bgarlic\b(?!\s*(powder|salt|bread|toast|pepper|seasoning))/i, plan: ({ n, unit, name }) => (/clove/.test(unit) || /clove/.test(name) ? { count: ceil(n / 10), kind: 'each', label: `${ceil(n / 10)} head` } : { count: ceil(n || 1), kind: 'each', label: `${ceil(n || 1)} head` }) },
  { re: /\b(ginger)\b(?!\s*(powder|ale|ground))/i, plan: () => ({ count: 1, kind: 'each', label: '1 piece' }) },
  { re: /\b(cilantro|parsley|basil leaves|mint(?! chocolate)|dill|green onions?|scallions?)\b/i, plan: ({ n, unit }) => (/bunch/.test(unit) ? { count: ceil(n), kind: 'each', label: `${ceil(n)} bunch` } : { count: 1, kind: 'each', label: '1 bunch' }) },
  // Meat & fish: sold by weight.
  { re: /\b(beef|steak|sirloin|chuck|pork|chicken|turkey|lamb|salmon|cod|tilapia|shrimp|fish|sausage|ham|chorizo|ground)\b/i,
    plan: ({ oz, n, unit }) => { const lb = oz != null ? oz / 16 : COUNT_UNITS.has(unit) ? n * 0.5 : 1; const r = Math.ceil(lb * 4 - 1e-9) / 4; return { count: r, kind: 'lb', label: `${r} lb` } } },
  // Weighed produce.
  // Not sold one at a time: "2 grapes" means 2 lb.
  { re: /\b(grapes|cherries)\b/i, plan: ({ oz, n }) => { const lb = oz != null ? oz / 16 : (n || 1); const r = Math.ceil(lb * 4 - 1e-9) / 4; return { count: r, kind: 'lb', label: `${r} lb` } } },
  { re: /\b(broccoli|cauliflower|potatoes?|sweet potatoes?|carrots?|green beans|brussels sprouts|apples?|mushrooms?|zucchini|squash)\b/i,
    plan: ({ oz, n }) => (oz != null ? { count: Math.ceil((oz / 16) * 4 - 1e-9) / 4, kind: 'lb', label: `${Math.ceil((oz / 16) * 4 - 1e-9) / 4} lb` } : { count: ceil(n || 1), kind: 'each', label: `${ceil(n || 1)} each` }) },
  // Seasonings last, so "pork tenderloin, garlic pepper" or "no-salt-added tomatoes" isn't bought as a spice jar.
  { re: /\b(?<!no-)(?<!no )(salt|pepper(corns)?|black pepper|powder|paprika|cumin|oregano|basil|thyme|rosemary|cinnamon|nutmeg|seasoning|flakes|bay leaves?|chili powder|curry|turmeric|ginger powder|allspice|cloves ground|sesame seeds)\b/i,
    plan: ({ name, n, unit }) => (/\b(bell|jalape\S*|serrano|poblano|habanero|fresh)\b/i.test(name) ? { count: COUNT_UNITS.has(unit) ? ceil(n) : 1, kind: 'each', label: `${COUNT_UNITS.has(unit) ? ceil(n) : 1} each` } : pkg(1, 'jar')) },
]

/** Turn one grocery-list line into a store purchase. */
export function toPackages(line: ListLine): PackagePlan {
  const name = (line.searchTerm || line.name || '').trim()
  const unit = (line.unit ?? '').trim().toLowerCase()
  const n = parseQuantity(line.quantity ?? null) ?? 1
  const cups = VOL_TO_CUPS[unit] != null ? n * VOL_TO_CUPS[unit] : null
  const oz = WT_TO_OZ[unit] != null ? n * WT_TO_OZ[unit] : null
  // The family (or the recipe) already said how many packages: "2 bag frozen corn", "3 box mac and cheese",
  // "2 jar salsa". Keep their count; rules only add a package size. (Nov 15 2026 audit: 23 lines lost packages.)
  const packaged = PACKAGE_WORDS.test(unit)
  // Match on the item's own name first; the search term can carry extra words ("pork tenderloin roasted garlic pepper").
  const own = (line.name || '').trim()
  const rule = RULES.find((r) => own && has(own, r.re)) ?? RULES.find((r) => has(name, r.re))
  if (packaged) {
    const count = ceil(n)
    const p = rule ? rule.plan({ n, unit, cups, oz, name }) : null
    const size = p && p.kind === 'package' ? (p as { size?: string }).size : undefined
    const sized = /\d+\s*(oz|lb|ct|count|pack)\b/i.test(name)
    const what = unit.replace(/s$/, '').replace(/^(\d+)-packs?$/, '$1-pack')
    const ruleSize = size && sameKind(unit, p!.label) ? size : undefined
    const hint = !sized && count > 1 ? SIZE_HINTS.find(([re]) => re.test(own) || re.test(name))?.[1] : undefined
    const use = sized ? undefined : (hint ?? ruleSize)
    return { search: use ? `${name} ${use}` : name, count, kind: 'package', label: `${count} × ${use ? use + ' ' : ''}${what}` }
  }
  for (const r of rule ? [rule] : []) {
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
