// Tests for lib/list-build (the no-AI grocery list, Nov 25 2026). Run: node scripts/list-build.test.cjs
const path = require('path')
const root = path.join(__dirname, '..')
const jiti = require(path.join(root, 'node_modules/jiti'))(__filename, { alias: { '@': root } })
const { buildGroceryList, needsAi, prebuiltList } = jiti(path.join(root, 'lib/list-build.ts'))

let fail = 0
const eq = (name, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } else console.log('ok  ', name) }
const ing = (name, quantity, unit, category = 'Pantry & Dry Goods', searchTerm) => ({ name, quantity, unit, category, searchTerm })
const lines = (list) => Object.values(list).flat().map((x) => `${x.quantity} ${x.unit} ${x.name}`)
const meal = (...ingredients) => ({ name: 'test', servings: 4, ingredients })

eq('tsp + tbsp + cup add up, shown in tbsp under 1/2 cup',
  lines(buildGroceryList([meal(ing('butter', '2', 'tbsp', 'Dairy & Eggs')), meal(ing('butter', '1/4', 'cup', 'Dairy & Eggs'), ing('butter', '3', 'tsp', 'Dairy & Eggs'))])),
  ['7 tbsp butter'])
eq('1/2 cup and up shows cups',
  lines(buildGroceryList([meal(ing('heavy cream', '1/2', 'cup', 'Dairy & Eggs')), meal(ing('heavy cream', '1', 'cup', 'Dairy & Eggs'))])),
  ['1 1/2 cup heavy cream'])
eq('oz + lb add up, a pound and over shows lb (quarters, rounded up)',
  lines(buildGroceryList([meal(ing('chicken breast', '12', 'oz', 'Meat & Seafood')), meal(ing('chicken breast', '1/2', 'lb', 'Meat & Seafood'))])),
  ['1 1/4 lb chicken breast'])
eq('under a pound stays oz',
  lines(buildGroceryList([meal(ing('bacon', '6', 'oz', 'Meat & Seafood')), meal(ing('bacon', '6', 'ounces', 'Meat & Seafood'))])),
  ['12 oz bacon'])
eq('harmless descriptors merge (florets, cheese, yellow)',
  lines(buildGroceryList([meal(ing('broccoli', '1', 'cup', 'Produce'), ing('parmesan', '1/2', 'cup', 'Dairy & Eggs'), ing('onion', '1', 'count', 'Produce')), meal(ing('broccoli florets', '2', 'cups', 'Produce'), ing('parmesan cheese', '1', 'cup', 'Dairy & Eggs'), ing('yellow onion', '2', 'count', 'Produce'))])),
  ['3 cup broccoli', '3 count onion', '1 1/2 cup parmesan'])
eq('different things stay apart (green onion, sweet potato, red onion)',
  lines(buildGroceryList([meal(ing('onion', '1', 'count', 'Produce'), ing('potato', '1', 'lb', 'Produce')), meal(ing('green onion', '2', 'count', 'Produce'), ing('sweet potato', '1', 'lb', 'Produce'), ing('red onion', '1', 'count', 'Produce'))])),
  ['1 count onion', '1 lb potato', '2 count green onion', '1 lb sweet potato', '1 count red onion'])
eq('different unit families never merge (garlic cloves vs garlic powder)',
  lines(buildGroceryList([meal(ing('garlic', '4', 'cloves', 'Produce'), ing('garlic powder', '1', 'tsp'))])),
  ['4 clove garlic', '1 tsp garlic powder'])
eq('counts round up to whole',
  lines(buildGroceryList([meal(ing('lemon', '1/2', 'count', 'Produce')), meal(ing('lemon', '1', 'count', 'Produce'))])),
  ['2 count lemon'])
eq('no amount keeps the text', lines(buildGroceryList([meal(ing('salt', 'to taste', ''))])), ['to taste  salt'])
eq('missing section is guessed, search term defaults to the name',
  Object.values(buildGroceryList([meal({ name: 'milk', quantity: '1', unit: 'gallon' })])).flat()[0].searchTerm, 'milk')
eq('needsAi: structured week', needsAi([ing('a', '1', 'cup'), ing('b', '2', 'lb')]), false)
eq('needsAi: free-text week', needsAi([{ name: 'some chicken' }, { name: 'veg' }, ing('rice', '1', 'cup')]), true)
eq('prebuiltList: free-text week returns {} (page falls back to AI)', prebuiltList([meal({ name: 'stuff' }, { name: 'things' })], false), {})
eq('prebuiltList: empty week returns {}', prebuiltList([], false), {})

console.log(fail ? `\n${fail} FAILED` : '\nall passed')
process.exit(fail ? 1 : 0)
