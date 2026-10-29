/**
 * The 9 major US food allergens (FALCPA + sesame), detected from ingredient names.
 * Conservative on purpose: hidden sources count (soy sauce = soy + wheat, Worcestershire = fish, pesto = tree nuts + milk),
 * while look-alikes don't (coconut milk, eggplant, nutmeg, butternut squash, tamari, "gluten-free …", "dairy-free …").
 * Brands vary, so the UI always says to check labels.
 */
export type AllergenKey = 'milk' | 'egg' | 'fish' | 'shellfish' | 'treenut' | 'peanut' | 'wheat' | 'soy' | 'sesame'

export const ALLERGENS: Array<{ key: AllergenKey; label: string; short: string }> = [
  { key: 'milk', label: 'Milk / dairy', short: 'Dairy' },
  { key: 'egg', label: 'Eggs', short: 'Eggs' },
  { key: 'wheat', label: 'Wheat / gluten', short: 'Gluten' },
  { key: 'peanut', label: 'Peanuts', short: 'Peanuts' },
  { key: 'treenut', label: 'Tree nuts', short: 'Tree nuts' },
  { key: 'soy', label: 'Soy', short: 'Soy' },
  { key: 'fish', label: 'Fish', short: 'Fish' },
  { key: 'shellfish', label: 'Shellfish', short: 'Shellfish' },
  { key: 'sesame', label: 'Sesame', short: 'Sesame' },
]
export const allergenLabel = (k: AllergenKey) => ALLERGENS.find((a) => a.key === k)?.label ?? k

const FREE = (what: string) => new RegExp(`\\b(${what})[- ]free\\b|\\bno[- ](${what})\\b|\\bwithout (${what})\\b`)

const RULES: Record<AllergenKey, { yes: RegExp; not?: RegExp }> = {
  milk: {
    yes: /\b(milk|cheeses?|cheddar|mozzarella|parmesan|parmigiano|pecorino|ricotta|feta|cotija|queso|monterey jack|pepper jack|colby|provolone|swiss|gruyere|brie|goat cheese|halloumi|paneer|mascarpone|burrata|butter|buttermilk|ghee|cream|creme fraiche|crème fraîche|sour cream|half[- ]and[- ]half|yogh?urt|kefir|custard|alfredo|tzatziki|ranch|whey|casein|ice cream|condensed milk|evaporated milk|pesto|bechamel|béchamel|crema|gouda|velveeta|caesar)\b/,
    not: /\b(coconut (milk|cream|yogh?urt)|almond (milk|butter|yogh?urt)|oat (milk|cream)|soy (milk|yogh?urt)|rice milk|cashew (milk|cream|butter)|plant[- ]based [a-z]+|vegan [a-z]+|dairy[- ]free [a-z]+|non[- ]?dairy [a-z]+|peanut butter|sunflower (seed )?butter|apple butter|nut butter|cocoa butter|cream of tartar|butternut squash|butternut|butter beans?|butter lettuce)\b/,
  },
  egg: {
    yes: /\b(eggs?|egg yolks?|egg whites?|mayo|mayonnaise|aioli|meringue|egg noodles?|hollandaise|caesar)\b/,
    not: /\b(eggplants?|egg[- ]free|vegan mayo(nnaise)?|eggless)\b/,
  },
  fish: {
    yes: /\b(fish|salmon|tuna|cod|tilapia|halibut|mahi[- ]?mahi|catfish|trout|sea bass|bass|snapper|sardines?|anchov\w*|mackerel|haddock|pollock|swordfish|flounder|sole|branzino|white ?fish|fish sauce|worcestershire|caesar|kimchi|pad thai sauce)\b/,
    not: /\b(vegan worcestershire|vegetarian worcestershire|fish-free|vegan fish sauce|goldfish)\b/,
  },
  shellfish: {
    yes: /\b(shrimp|prawns?|crab|lobster|crawfish|crayfish|scallops?|clams?|mussels?|oysters?|oyster sauce|squid|calamari|langostinos?)\b/,
    not: /\b(vegan oyster sauce|mushroom oyster sauce|oyster mushrooms?|oyster crackers?)\b/,
  },
  treenut: {
    yes: /\b(almonds?|walnuts?|pecans?|cashews?|pistachios?|hazelnuts?|macadamias?|brazil nuts?|pine nuts?|pignoli|chestnuts?|praline|marzipan|nutella|almond (flour|milk|butter|extract)|pesto)\b/,
    not: /\b(water chestnuts?|nut[- ]free)\b/,
  },
  peanut: {
    yes: /\b(peanuts?|peanut butter|peanut sauce|satay|mole)\b/,
    not: /\b(peanut[- ]free)\b/,
  },
  wheat: {
    yes: /\b(wheat|flour|bread|breadcrumbs?|bread crumbs|panko|buns?|rolls?|baguette|ciabatta|pita|naan|tortillas?|wraps?|pasta|spaghetti|penne|fettuccine|linguine|lasagna|macaroni|rigatoni|rotini|orzo|ziti|farfalle|gnocchi|ravioli|tortellini|egg noodles?|lo mein|ramen|udon|noodles|couscous|bulgur|farro|barley|rye|seitan|croutons?|crackers?|pizza dough|pie crust|puff pastry|biscuits?|english muffins?|bagels?|crescent|soy sauce|teriyaki|hoisin|beer|stuffing|tempura|roux|graham|wrappers?|wontons?|potstickers?|dumplings?|pierog(i|ies)|phyllo|filo|lavash|pancake mix|biscuit mix|cornbread mix|(corn )?muffin mix|gochujang|chili bean (paste|sauce)|caesar salad kit|cream of (mushroom|chicken|celery) soup)\b/,
    not: /\b(gluten[- ]free|gf |corn tortillas?|rice noodles?|rice vermicelli( noodles)?|rice flour|tortilla chips|tortilla strips|rice paper wrappers?|almond flour|coconut flour|cornflour|corn flour|chickpea flour|cassava|tamari|buckwheat|soba \(100% buckwheat\)|rice paper|lettuce wraps?|collard wraps?|zucchini noodles?|zoodles|spaghetti squash|sweet potato noodles|glass noodles|cellophane noodles|bean thread|kelp noodles|shirataki|egg roll wrappers? \(gluten[- ]free\)|ginger beer|root beer)\b/,
  },
  soy: {
    yes: /\b(soy|soya|soybeans?|soyrizo|tofu|tempeh|edamame|miso|tamari|soy sauce|teriyaki|hoisin|shoyu|ponzu|natto|gochujang|black bean sauce|chili bean (paste|sauce)|textured vegetable protein|tvp)\b/,
    not: /\b(soy[- ]free|coconut aminos)\b/,
  },
  sesame: {
    yes: /\b(sesame|tahini|hummus|halva|za'?atar|furikake|everything bagel seasoning|benne|mole)\b/,
    not: /\b(sesame[- ]free)\b/,
  },
}

/** Which allergens an ingredient name points to. */
export function ingredientAllergens(name: string): AllergenKey[] {
  const n = ` ${name.toLowerCase()} `
  const out: AllergenKey[] = []
  for (const a of ALLERGENS) {
    const r = RULES[a.key]
    if (!r.yes.test(n)) continue
    // A "not" phrase only clears it when nothing else in the name still matches (e.g. "coconut milk and parmesan").
    if (r.not && r.not.test(n) && !r.yes.test(n.replace(new RegExp(r.not.source, 'g'), ' '))) continue
    if (FREE(a.key === 'milk' ? 'dairy|milk|lactose' : a.key === 'wheat' ? 'gluten|wheat' : a.key === 'treenut' ? 'nut|tree nut' : a.key).test(n)) continue
    out.push(a.key)
  }
  return out
}

/** Allergens in a dinner, each with the ingredients that carry it. */
export function dinnerAllergens(ingredients: Array<{ name: string }>): Array<{ key: AllergenKey; items: string[] }> {
  const by = new Map<AllergenKey, string[]>()
  for (const i of ingredients ?? []) for (const k of ingredientAllergens(i.name ?? '')) by.set(k, [...(by.get(k) ?? []), i.name])
  return ALLERGENS.filter((a) => by.has(a.key)).map((a) => ({ key: a.key, items: by.get(a.key)! }))
}

/** What a family's typed allergy means: one of the 9 (dairy → milk, gluten → wheat, nuts → tree nuts + peanuts), or a plain word. */
export function allergyTargets(allergy: string): { keys: AllergenKey[]; word: string | null } {
  const a = allergy.toLowerCase().trim()
  if (!a) return { keys: [], word: null }
  if (/^(all )?nuts?$|^nut allerg|^tree ?nuts? and peanuts?/.test(a)) return { keys: ['treenut', 'peanut'], word: null }
  if (/dairy|milk|lactose|casein|whey|cheese/.test(a)) return { keys: ['milk'], word: null }
  if (/\beggs?\b/.test(a)) return { keys: ['egg'], word: null }
  if (/gluten|wheat|celiac|coeliac/.test(a)) return { keys: ['wheat'], word: null }
  if (/peanut/.test(a)) return { keys: ['peanut'], word: null }
  if (/tree ?nut|almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia|pine nut/.test(a)) return { keys: ['treenut'], word: null }
  if (/shellfish|shrimp|crab|lobster|crustacean|mollus|scallop|clam|mussel|oyster/.test(a)) return { keys: ['shellfish'], word: null }
  if (/^fish$|finned fish|\bfish\b|salmon|tuna|cod\b/.test(a)) return { keys: ['fish'], word: null }
  if (/\bsoy|tofu/.test(a)) return { keys: ['soy'], word: null }
  if (/sesame|tahini/.test(a)) return { keys: ['sesame'], word: null }
  return { keys: [], word: a.replace(/(ies)$/, 'y').replace(/(es|s)$/, '') }
}

export interface AllergyConflict { who: string[]; allergy: string; items: string[] }

/**
 * A dinner's conflicts with the family's allergies. `people` = [{ name, allergies }]; a household-wide list can be passed as one person.
 */
export function allergyConflicts(ingredients: Array<{ name: string }>, people: Array<{ name: string; allergies: string[] }>, dinnerName = ''): AllergyConflict[] {
  const found = dinnerAllergens(ingredients)
  const byAllergy = new Map<string, AllergyConflict>()
  for (const p of people) {
    for (const raw of p.allergies ?? []) {
      const t = allergyTargets(raw)
      let items: string[] = []
      if (t.keys.length) items = found.filter((f) => t.keys.includes(f.key)).flatMap((f) => f.items)
      else if (t.word && t.word.length > 2) {
        const w = t.word
        items = (ingredients ?? []).map((i) => i.name).filter((n) => n.toLowerCase().includes(w))
        if (!items.length && dinnerName.toLowerCase().includes(w)) items = [dinnerName]
      }
      if (!items.length) continue
      const key = raw.toLowerCase().trim()
      const c = byAllergy.get(key) ?? { who: [], allergy: raw.trim(), items: [] }
      if (p.name && !c.who.includes(p.name)) c.who.push(p.name)
      c.items = Array.from(new Set([...c.items, ...items]))
      byAllergy.set(key, c)
    }
  }
  return Array.from(byAllergy.values())
}
