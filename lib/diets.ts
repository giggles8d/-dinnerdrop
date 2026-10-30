import { ingredientAllergens } from '@/lib/allergens'

/**
 * Diets DinnerDrop can tag from a recipe's ingredients (deterministic rules; the model's own tags are checked
 * against these on save). These power Settings/onboarding choices and the library picks (`dietary @> family's diets`).
 *
 * Judged on what's bought, never the title ("Zucchini Noodle Bolognese" is fine for Low-carb).
 */
export const INFERRED_DIETS = ['Pescatarian', 'Low-carb', 'Paleo', 'Nut-free', 'Kosher-style', 'Low-sodium', 'Diabetic-friendly', 'Heart-healthy'] as const
export type InferredDiet = (typeof INFERRED_DIETS)[number]

type Ing = { name: string; searchTerm?: string | null }
type Lite = { name: string; ingredients: Ing[] | null; nutrition?: { sodium?: number; carbs?: number; sugar?: number; satFat?: number; fiber?: number } | null }

const LAND_MEAT = /\b(chicken|beef|steak|sirloin|brisket|chuck|ribeye|flank|skirt|pork|bacon|ham|sausages?|bratwurst|kielbasa|hot dogs?|pepperoni|salami|prosciutto|chorizo|turkey|lamb|veal|goat|meatballs?|meatloaf|ground (beef|turkey|pork|chicken|lamb)|rotisserie|deli (turkey|ham|roast beef)|corned beef|pastrami|duck)\b/i
const PORK_ONLY = /\b(pork|bacon|ham\b|bratwurst|kielbasa|pepperoni|salami|prosciutto|chorizo|lard|hot dogs?)\b/i
const SHELLFISH = /\b(shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?|calamari|squid|oyster sauce)\b/i
const DAIRY = /\b(milk|cheeses?|cheddar|mozzarella|parmesan|pecorino|ricotta|feta|cotija|queso|monterey jack|pepper jack|provolone|swiss|gruyere|brie|goat cheese|halloumi|paneer|butter|buttermilk|ghee|cream|sour cream|half[- ]and[- ]half|yogh?urt|alfredo|tzatziki|ranch|whey|crema|gouda|velveeta)\b/i
const NON_DAIRY = /\b(coconut (milk|cream)|almond (milk|butter)|oat milk|soy milk|cashew (milk|cream)|peanut butter|cocoa butter|cream of tartar|butternut|butter beans?|butter lettuce|dairy[- ]free [a-z]+|vegan [a-z]+|plant[- ]based [a-z]+)\b/gi
/** Starches that make a dinner not low-carb (corn and beans are allowed for Low-carb, not for Paleo). */
const STARCH = /\b(rice|pasta|spaghetti|penne|fettuccine|linguine|lasagna|macaroni|rigatoni|rotini|orzo|ziti|farfalle|gnocchi|ravioli|tortellini|noodles?|ramen|udon|soba|lo mein|couscous|quinoa|bulgur|farro|barley|polenta|grits|cornmeal|oats|potato(es)?|fries|tater tots|hash browns?|breads?|breadcrumbs?|bread crumbs|panko|buns?|rolls?|baguette|ciabatta|pita|naan|tortillas?|wraps?|crackers?|croutons?|flour|pizza dough|pie crust|puff pastry|phyllo|biscuits?|pancake mix|stuffing|sugar|honey|maple syrup|agave|molasses|jam|ketchup|hoisin|teriyaki|sweet chili|bbq sauce|barbecue sauce)\b/i
const STARCH_OK = /\b(cauliflower rice|riced cauliflower|zucchini noodles|zoodles|spaghetti squash|shirataki|kelp noodles|rice vinegar|rice wine vinegar|rice paper|corn ?starch|sugar[- ]free|no[- ]sugar[- ]added|lettuce wraps?|collard wraps?|almond flour|coconut flour|sweet potato noodles)\b/gi
/** Also out for Low-carb: legumes, corn and corn doughs (beans count; green beans don't). */
const LOW_CARB_NO = /\b(beans?|lentils?|chickpeas?|hummus|corn\b|hominy|masa( harina)?|plantains?|popcorn)\b/i
const LEGUME_SOY_GRAIN = /\b(beans?|lentils?|chickpeas?|hummus|edamame|tofu|tempeh|soy|miso|tamari|peanuts?|peanut butter|corn\b|popcorn|hominy|masa|dairy)\b/i
const LEGUME_OK = /\b(green beans|coconut aminos|cornstarch|corn ?starch)\b/gi
const SALTY = /\b(soy sauce|tamari|fish sauce|oyster sauce|hoisin|teriyaki|miso|bacon|ham\b|sausages?|chorizo|kielbasa|pepperoni|salami|prosciutto|deli|hot dogs?|canned soup|cream of \w+ soup|seasoning (mix|packet)|taco seasoning|ranch seasoning|onion soup mix|bouillon|pickles?|olives|capers|kimchi|sauerkraut|feta|parmesan|cotija|anchov\w*|velveeta|american cheese)\b/i
const LOW_SODIUM_OK = /\b(low[- ]sodium [a-z ]+|reduced[- ]sodium [a-z ]+|no[- ]salt[- ]added [a-z ]+|unsalted [a-z]+)\b/gi

const SUGARY = /\b(sugar|brown sugar|honey|maple syrup|agave|molasses|jam|jelly|sweet chili|teriyaki|hoisin|bbq sauce|barbecue sauce|ketchup|sweet and sour|glaze|candied|caramel|chocolate|cranberry sauce|sweetened)\b/i
const SAT_FAT_HEAVY = /\b(bacon|sausages?|chorizo|kielbasa|bratwurst|pepperoni|salami|prosciutto|hot dogs?|ribeye|ribs|pork belly|heavy cream|butter|cream cheese|velveeta|american cheese|lard|ghee|coconut oil|coconut cream)\b/i

const names = (r: Lite) => (r.ingredients ?? []).map((i) => i.name)
const hay = (r: Lite) => names(r).join(' | ')

export function dietViolation(diet: InferredDiet, r: Lite): string | null {
  const h = hay(r)
  switch (diet) {
    case 'Pescatarian':
      return LAND_MEAT.test(h) ? 'has meat or poultry' : null
    case 'Nut-free': {
      const hit = names(r).find((n) => ingredientAllergens(n).some((k) => k === 'treenut' || k === 'peanut'))
      return hit ? `has nuts (${hit})` : null
    }
    case 'Low-carb': {
      const m = h.replace(STARCH_OK, ' ').replace(LEGUME_OK, ' ').match(STARCH) || h.replace(LEGUME_OK, ' ').match(LOW_CARB_NO)
      if (m) return `has starch or sugar (${m[0]})`
      if (r.nutrition?.carbs != null && r.nutrition.carbs > 30) return `${r.nutrition.carbs} g carbs per serving`
      return null
    }
    case 'Paleo': {
      const h2 = h.replace(STARCH_OK, ' ').replace(LEGUME_OK, ' ').replace(/\bsweet potato(es)?\b/gi, ' ')
      const m = h2.match(STARCH) || h2.match(LEGUME_SOY_GRAIN) || h2.replace(NON_DAIRY, ' ').match(DAIRY)
      return m ? `not paleo (${m[0]})` : null
    }
    case 'Kosher-style': {
      if (PORK_ONLY.test(h)) return 'has pork'
      if (SHELLFISH.test(h)) return 'has shellfish'
      const meat = LAND_MEAT.test(h) && !/\b(turkey|chicken) (sausage|bacon)\b/i.test(h) ? true : LAND_MEAT.test(h)
      if (meat && DAIRY.test(h.replace(NON_DAIRY, ' '))) return 'mixes meat and dairy'
      return null
    }
    case 'Diabetic-friendly': {
      // Modest carbs, no sugary sauces/sweeteners; needs the nutrition fill to confirm.
      const m = h.match(SUGARY)
      if (m) return `added sugar (${m[0]})`
      if (r.nutrition?.carbs == null) return 'carbs not known yet'
      if (r.nutrition.carbs > 45) return `${r.nutrition.carbs} g carbs per serving`
      if ((r.nutrition.sugar ?? 0) > 15) return `${r.nutrition.sugar} g sugar per serving`
      return null
    }
    case 'Heart-healthy': {
      const m = h.replace(LOW_SODIUM_OK, ' ').match(SALTY) || h.match(SAT_FAT_HEAVY)
      if (m) return `heart-unfriendly ingredient (${m[0]})`
      if (r.nutrition?.sodium == null || r.nutrition?.satFat == null) return 'nutrition not known yet'
      if (r.nutrition.sodium > 600) return `${r.nutrition.sodium} mg sodium per serving`
      if (r.nutrition.satFat > 6) return `${r.nutrition.satFat} g saturated fat per serving`
      return null
    }
    case 'Low-sodium': {
      const m = h.replace(LOW_SODIUM_OK, ' ').match(SALTY)
      if (m) return `salty ingredient (${m[0]})`
      if (r.nutrition?.sodium == null) return 'sodium not known yet'
      if (r.nutrition.sodium > 600) return `${r.nutrition.sodium} mg sodium per serving`
      return null
    }
  }
}

/** The inferred diets a recipe qualifies for. */
export function inferDiets(r: Lite): InferredDiet[] {
  return INFERRED_DIETS.filter((d) => !dietViolation(d, r))
}

/** Merge the model's/family's diet tags with the inferred ones (inferred ones replace any stale copies of themselves). */
export function mergeDiets(existing: string[] | null | undefined, r: Lite): string[] {
  const keep = (existing ?? []).filter((d) => !(INFERRED_DIETS as readonly string[]).includes(d) && d !== 'Kosher')
  return Array.from(new Set([...keep, ...inferDiets(r)]))
}

/** Nightly: re-derive the inferred diets for every public recipe (cheap, no model). Low-sodium needs the nutrition fill first. */
export async function retagLibraryDiets(admin: { from: (t: string) => any }): Promise<{ checked: number; changed: number }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let changed = 0, checked = 0
  for (let from = 0; from < 10000; from += 1000) {
    const { data } = await admin.from('recipes').select('id, name, ingredients, dietary, nutrition').eq('is_public', true).order('id').range(from, from + 999)
    const rows = (data ?? []) as Array<{ id: string; name: string; ingredients: Ing[] | null; dietary: string[] | null; nutrition: Lite['nutrition'] }>
    for (const r of rows) {
      checked++
      const next = mergeDiets(r.dietary, r)
      const cur = r.dietary ?? []
      if (next.length !== cur.length || next.some((d) => !cur.includes(d))) {
        const { error } = await admin.from('recipes').update({ dietary: next }).eq('id', r.id)
        if (!error) changed++
      }
    }
    if (rows.length < 1000) break
  }
  return { checked, changed }
}
