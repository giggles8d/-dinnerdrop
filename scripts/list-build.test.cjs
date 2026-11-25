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
eq('no amount keeps the text (not a pantry basic)', lines(buildGroceryList([meal(ing('fresh parsley', 'for garnish', '', 'Produce'))])), ['for garnish  fresh parsley'])
const pantryLines = (list) => Object.values(list).flat().filter((x) => x.pantry).map((x) => `${x.quantity} ${x.unit} ${x.name}`.trim())
const buyLines = (list) => Object.values(list).flat().filter((x) => !x.pantry).map((x) => `${x.quantity} ${x.unit} ${x.name}`)
{
  const l = buildGroceryList([meal(ing('salt', '1', 'pinch'), ing('black pepper', 'to taste', ''), ing('olive oil', '', 'drizzle'), ing('water', '2', 'cups'), ing('ground cumin', '1', 'dash'), ing('salt and pepper, to taste', '', ''))])
  eq('trace amounts of salt, pepper, oil, water, spices are pantry lines', pantryLines(l), ['1 pinch salt', 'black pepper', 'olive oil', '2 cup water', '1 dash ground cumin', 'salt and pepper'])
  eq('trace amounts add nothing to the cart', buyLines(l), [])
}
eq('a trace folds into a real amount of the same thing',
  [buyLines(buildGroceryList([meal(ing('salt', '1', 'tsp')), meal(ing('salt', '1', 'pinch'), ing('kosher salt', 'to taste', ''))]))[0], pantryLines(buildGroceryList([meal(ing('salt', '1', 'tsp')), meal(ing('salt', '1', 'pinch'))]))],
  ['1 tsp salt', []])
eq('bought things marked optional or garnish stay normal lines (fresh herbs, sour cream, bare basil)',
  pantryLines(buildGroceryList([meal(ing('fresh thyme', '1', 'sprig', 'Produce'), ing('sour cream', 'optional', '', 'Dairy & Eggs'), ing('basil', '', 'for garnish', 'Produce'))])),
  [])
eq('cups of onion merge into the counted onions (1 medium ≈ 1 cup)',
  lines(buildGroceryList([meal(ing('onion', '3', 'count', 'Produce')), meal(ing('onion', '3/4', 'cup', 'Produce'), ing('yellow onion', '4', 'tbsp', 'Produce'))])),
  ['4 count onion'])
eq('a cups-only onion line becomes onions to buy; red onion and green onion stay their own',
  lines(buildGroceryList([meal(ing('onion', '1 1/2', 'cups', 'Produce'), ing('red onion', '1', 'count', 'Produce'), ing('green onions', '1/2', 'cup', 'Produce'))])),
  ['2 count onion', '1 count red onion', '1/2 cup green onions'])
eq('basil cups merge into the bunch; cherry tomato cups into pints (1 pint ≈ 2 cups)',
  lines(buildGroceryList([meal(ing('fresh basil', '1', 'bunch', 'Produce'), ing('cherry tomatoes', '1', 'pint', 'Produce')), meal(ing('fresh basil', '4', 'tbsp', 'Produce'), ing('cherry tomatoes', '1', 'cup', 'Produce'))])),
  ['1 bunch fresh basil', '2 pint cherry tomatoes'])
eq('a quarter or less on top of whole ones is absorbed (4 onions + 4 tbsp onion = 4); more rounds up',
  [lines(buildGroceryList([meal(ing('onion', '4', 'count', 'Produce')), meal(ing('onion', '4', 'tbsp', 'Produce'))])), lines(buildGroceryList([meal(ing('onion', '4', 'count', 'Produce')), meal(ing('onion', '1/2', 'cup', 'Produce'))]))],
  [['4 count onion'], ['5 count onion']])
eq('basil by the cup alone stays as it is (could be dried); no table entry keeps two lines',
  lines(buildGroceryList([meal(ing('basil', '1/4', 'cup', 'Produce'), ing('carrots', '2', 'count', 'Produce')), meal(ing('carrots', '1', 'cup', 'Produce'))])),
  ['4 tbsp basil', '2 count carrots', '1 cup carrots'])
eq('missing section is guessed, search term defaults to the name',
  Object.values(buildGroceryList([meal({ name: 'milk', quantity: '1', unit: 'gallon' })])).flat()[0].searchTerm, 'milk')
eq('a unit that names the item counts and merges ("3 avocados" avocado, "2 lime" lime, "3 peppers" bell peppers)',
  lines(buildGroceryList([meal(ing('avocados', '5', 'count', 'Produce'), ing('lime', '2', 'count', 'Produce'), ing('bell peppers', '3', 'count', 'Produce')), meal(ing('avocado', '3', 'avocados', 'Produce'), ing('lime', '2', 'lime', 'Produce'), ing('bell peppers', '3', 'peppers', 'Produce'), ing('onion', '2', 'onion', 'Produce'))])),
  ['8 count avocados', '4 count lime', '6 count bell peppers', '2 count onion'])
eq('fillets (6 oz each) become a weight and add to the same item by weight',
  lines(buildGroceryList([meal(ing('salmon', '2', 'fillets (6 oz each)', 'Meat & Seafood'), ing('strip steak', '12', 'oz', 'Meat & Seafood')), meal(ing('strip steak', '2', 'steaks (6 oz each)', 'Meat & Seafood'))])),
  ['12 oz salmon', '1 1/2 lb strip steak'])
eq('a bare whole-item noun unit counts (2 fillets halibut)',
  lines(buildGroceryList([meal(ing('halibut', '2', 'fillets', 'Meat & Seafood'))])),
  ['2 count halibut'])
eq('counted garlic cloves merge with garlic by the clove',
  lines(buildGroceryList([meal(ing('garlic', '3', 'cloves', 'Produce')), meal(ing('garlic cloves', '2', 'count', 'Produce')), meal(ing('garlic clove', '1', '', 'Produce'), ing('garlic cloves', '2', 'cloves', 'Produce'))])),
  ['8 clove garlic'])
eq('real store units are untouched (head of lettuce, can of beans, bunch of cilantro)',
  lines(buildGroceryList([meal(ing('lettuce', '1', 'head', 'Produce'), ing('black beans', '2', 'cans'), ing('cilantro', '1', 'bunch', 'Produce'))])),
  ['1 head lettuce', '1 bunch cilantro', '2 can black beans'])
eq('needsAi: structured week', needsAi([ing('a', '1', 'cup'), ing('b', '2', 'lb')]), false)
eq('needsAi: free-text week', needsAi([{ name: 'some chicken' }, { name: 'veg' }, ing('rice', '1', 'cup')]), true)
eq('prebuiltList: free-text week returns {} (page falls back to AI)', prebuiltList([meal({ name: 'stuff' }, { name: 'things' })], false), {})
eq('prebuiltList: empty week returns {}', prebuiltList([], false), {})

console.log(fail ? `\n${fail} FAILED` : '\nall passed')
process.exit(fail ? 1 : 0)
