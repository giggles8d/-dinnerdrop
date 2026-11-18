import { completePlates } from '../lib/full-plate'
import type { Meal } from '../types'
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const meal = (name: string, ings: string[]): Meal => ({ day: 'Monday', name, cookTime: 20, prepTime: 10, servings: 2, estimatedCost: 9, steps: [], tags: [], ingredients: ings.map((n) => ({ name: n, quantity: '1', unit: 'count', category: 'Produce' as const })) })
const side = (ms: Meal[]) => ms.map((m) => m.side?.name ?? '')

// Nov 17 2026: pork chops + beans + slaw for a gluten-allergy family came with "Garlic bread".
const chops = meal('Pork Chops with BBQ Beans and Ranch Slaw', ['boneless pork chops', 'cannellini beans', 'barbecue sauce', 'coleslaw mix'])
eq('no gluten side on a gluten allergy', side(completePlates([chops, chops, chops, chops], { dietaryNeeds: ['Nut-free'], allergies: ['Gluten'] })).some((s) => /bread|rolls|pita/i.test(s)), false)
eq('no gluten side on a gluten-free diet', side(completePlates([chops, chops, chops, chops], { dietaryNeeds: ['Gluten-free'] })).some((s) => /bread|rolls|pita/i.test(s)), false)
// Soup normally gets crusty bread; gluten-free gets rice instead.
const soup = meal('Chicken Soup', ['chicken', 'carrots', 'celery'])
eq('soup bread default', side(completePlates([soup], { dietaryNeeds: [] })), ['Crusty bread'])
eq('soup gluten-free', side(completePlates([soup], { dietaryNeeds: ['Gluten-free'] })), ['Steamed rice'])
// Dairy-free: no buttered corn as the vegetable on a taco night.
const tacos = meal('Chicken Tacos', ['chicken thighs', 'corn tortillas', 'salsa'])
eq('dairy-free veg side', /butter/i.test(side(completePlates([tacos], { dietaryNeeds: ['Dairy-free'] }))[0]), false)
// Won't-eats still skip sides (potatoes), and the fallback is rice.
const steak = meal('Garlic Butter Steak', ['sirloin steak', 'butter', 'garlic'])
const steakSides = side(completePlates([steak, steak, steak, steak], { dietaryNeeds: [], avoid: ['Potatoes'] }))
eq('no potato side on a potato won\'t-eat', steakSides.some((s) => /potato/i.test(s)), false)
// Nothing ruled out: behaviour unchanged (steak night gets mashed potatoes and green beans).
eq('default steak', side(completePlates([steak], { dietaryNeeds: [] })), ['Garlicky green beans and mashed potatoes'])
// A side already on the dinner is kept.
eq('existing side kept', side(completePlates([{ ...chops, side: { name: 'Steamed rice', minutes: 20, items: [] } }], { dietaryNeeds: [], allergies: ['Gluten'] })), ['Steamed rice'])

console.log(fail ? `${fail} failing` : 'full-plate: all good')
process.exit(fail ? 1 : 0)
