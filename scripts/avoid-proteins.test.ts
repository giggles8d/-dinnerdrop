// npx tsx scripts/avoid-proteins.test.ts
import { avoidProteinWords } from '../lib/avoid-proteins'
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const hits = (hay: string, words: string[]) => words.some((w) => hay.toLowerCase().includes(w.toLowerCase()))

// Nov 19 2026: salmon, shrimp, fish, tofu avoided; Sheet Pan Chili-Lime Tilapia got through.
const family = avoidProteinWords(['salmon', 'shrimp', 'fish', 'tofu'])
eq('tilapia', hits('Sheet Pan Chili-Lime Tilapia with Corn and Peppers tilapia fillets frozen corn', family), true)
eq('cod', hits('Baked Cod with Lemon Butter cod fillets', family), true)
eq('mahi', hits('Blackened Mahi Mahi Sandwiches mahi mahi fillets', family), true)
eq('halibut', hits('Baked Halibut with Tomato Herb Sauce halibut fillets', family), true)
eq('prawns', hits('Garlic Prawn Pasta prawns', family), true)
eq('tofu still', hits('Crispy Tofu Stir-Fry tofu', family), true)
eq('chicken ok', hits('Sheet Pan Street Corn Chicken Thighs chicken thighs cotija cheese', family), false)
eq('pork ok', hits('Oven-Fried Breaded Pork Chops with Corn on the Cob pork chops', family), false)
// Plain chips pass through unchanged; blanks and repeats drop.
eq('passthrough', avoidProteinWords(['chicken', 'beef', '', 'beef']), ['chicken', 'beef'])
eq('empty', avoidProteinWords(undefined), [])
eq('case', avoidProteinWords(['Fish']).includes('tilapia'), true)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('avoid-proteins: all passed')
