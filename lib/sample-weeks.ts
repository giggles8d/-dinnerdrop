import type { Meal } from '@/types'

/**
 * Example weeks shown on the homepage and the dietary landing pages.
 * Same shape the planner produces (types/index.ts Meal), authored for a
 * household of 4 at a $100 weekly dinner budget, 2026-10-18. Costs are
 * recipe-level estimates at typical US grocery prices; the live planner
 * shows the family's own numbers.
 */

export interface SampleWeek {
  key: string
  label: string
  tagline: string
  household: string
  budget: string
  cookTime: string
  dietary: string
  meals: Meal[]
}

const sw = (meals: Meal[]) => meals

export const SAMPLE_WEEKS: SampleWeek[] = [
  {
    key: 'kid',
    label: 'Kid-friendly',
    tagline: 'Familiar flavors, one safe thing on every plate.',
    household: 'Family of 4',
    budget: '$100/week',
    cookTime: '35 min or less',
    dietary: 'none',
    meals: sw([
      {
        day: 'Monday', name: 'Sheet Pan Chicken Tenders & Roasted Carrots', cuisine: 'American', protein: 'chicken',
        cookTime: 22, prepTime: 8, servings: 4, estimatedCost: 14.5,
        ingredients: [
          { name: 'chicken tenders', quantity: '1 1/2', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'chicken tenders' },
          { name: 'panko breadcrumbs', quantity: '1', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'panko breadcrumbs' },
          { name: 'eggs', quantity: '2', unit: 'whole', category: 'Dairy & Eggs', searchTerm: 'eggs' },
          { name: 'carrots', quantity: '1', unit: 'lb', category: 'Produce', searchTerm: 'carrots' },
          { name: 'olive oil', quantity: '2', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'olive oil' },
          { name: 'honey', quantity: '1', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'honey' },
        ],
        steps: [
          'Heat oven to 425F. Toss carrot sticks with 1 tbsp oil and honey on one side of a sheet pan.',
          'Dip tenders in beaten egg, then panko mixed with salt and pepper. Lay on the other side; drizzle with remaining oil.',
          'Bake 18-20 minutes, flipping tenders once, until golden and carrots are tender.',
        ],
      },
      {
        day: 'Tuesday', name: 'Build-Your-Own Taco Night', cuisine: 'Mexican', protein: 'beef',
        cookTime: 15, prepTime: 10, servings: 4, estimatedCost: 16.0,
        ingredients: [
          { name: 'ground beef', quantity: '1', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'ground beef' },
          { name: 'taco seasoning', quantity: '1', unit: 'package', category: 'Pantry & Dry Goods', searchTerm: 'taco seasoning' },
          { name: 'flour tortillas', quantity: '1', unit: 'package', category: 'Bakery', searchTerm: 'flour tortillas' },
          { name: 'shredded cheddar', quantity: '1 1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded cheddar cheese' },
          { name: 'romaine lettuce', quantity: '1', unit: 'head', category: 'Produce', searchTerm: 'romaine lettuce' },
          { name: 'roma tomatoes', quantity: '3', unit: 'whole', category: 'Produce', searchTerm: 'roma tomatoes' },
          { name: 'sour cream', quantity: '1', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'sour cream' },
        ],
        steps: [
          'Brown the beef in a skillet over medium-high, 6-7 minutes; drain. Stir in seasoning and 1/2 cup water; simmer 3 minutes.',
          'Shred lettuce, dice tomatoes, warm tortillas in a dry pan or the microwave.',
          'Set everything out in bowls. Everyone builds their own; plain cheese tacos count.',
        ],
      },
      {
        day: 'Wednesday', name: 'Creamy Tomato Pasta with Hidden Veggies', cuisine: 'Italian', protein: 'vegetarian',
        cookTime: 20, prepTime: 5, servings: 4, estimatedCost: 9.75,
        ingredients: [
          { name: 'penne pasta', quantity: '1', unit: 'lb', category: 'Pantry & Dry Goods', searchTerm: 'penne pasta' },
          { name: 'marinara sauce', quantity: '1', unit: 'jar', category: 'Pantry & Dry Goods', searchTerm: 'marinara sauce' },
          { name: 'frozen cauliflower', quantity: '1', unit: 'bag', category: 'Frozen', searchTerm: 'frozen cauliflower florets' },
          { name: 'cream cheese', quantity: '4', unit: 'oz', category: 'Dairy & Eggs', searchTerm: 'cream cheese' },
          { name: 'parmesan cheese', quantity: '1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'grated parmesan' },
        ],
        steps: [
          'Boil pasta; add cauliflower for the last 5 minutes. Drain, keeping 1/2 cup pasta water.',
          'Blend cauliflower with marinara and cream cheese until smooth (an immersion blender in the pot works).',
          'Toss pasta with the sauce, loosening with pasta water. Top with parmesan.',
        ],
      },
      {
        day: 'Thursday', name: 'Honey Garlic Meatballs with Rice & Broccoli', cuisine: 'Asian', protein: 'turkey',
        cookTime: 25, prepTime: 10, servings: 4, estimatedCost: 13.25,
        ingredients: [
          { name: 'ground turkey', quantity: '1', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'ground turkey' },
          { name: 'breadcrumbs', quantity: '1/2', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'breadcrumbs' },
          { name: 'eggs', quantity: '1', unit: 'whole', category: 'Dairy & Eggs', searchTerm: 'eggs' },
          { name: 'honey', quantity: '1/4', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'honey' },
          { name: 'soy sauce', quantity: '3', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'soy sauce' },
          { name: 'garlic', quantity: '3', unit: 'clove', category: 'Produce', searchTerm: 'garlic' },
          { name: 'white rice', quantity: '1 1/2', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'white rice' },
          { name: 'broccoli florets', quantity: '4', unit: 'cup', category: 'Produce', searchTerm: 'broccoli florets' },
        ],
        steps: [
          'Start rice. Mix turkey, breadcrumbs, egg, salt; roll into 16 meatballs.',
          'Brown meatballs in an oiled skillet 8 minutes, turning. Add honey, soy, minced garlic and 2 tbsp water; simmer 5 minutes until glossy.',
          'Steam broccoli 4 minutes (microwave with a splash of water). Serve meatballs over rice with sauce spooned on top.',
        ],
      },
      {
        day: 'Friday', name: 'English Muffin Pizzas & Cucumber Sticks', cuisine: 'American', protein: 'vegetarian',
        cookTime: 12, prepTime: 8, servings: 4, estimatedCost: 10.5,
        ingredients: [
          { name: 'English muffins', quantity: '1', unit: 'package', category: 'Bakery', searchTerm: 'english muffins' },
          { name: 'pizza sauce', quantity: '1', unit: 'jar', category: 'Pantry & Dry Goods', searchTerm: 'pizza sauce' },
          { name: 'shredded mozzarella', quantity: '2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded mozzarella' },
          { name: 'pepperoni', quantity: '1', unit: 'package', category: 'Meat & Seafood', searchTerm: 'pepperoni' },
          { name: 'cucumber', quantity: '2', unit: 'whole', category: 'Produce', searchTerm: 'cucumber' },
        ],
        steps: [
          'Heat oven to 400F. Split muffins and lay cut side up on a sheet pan.',
          'Spread sauce, top with mozzarella and pepperoni (kids pick their own toppings).',
          'Bake 10-12 minutes until bubbling. Serve with cucumber sticks.',
        ],
      },
    ]),
  },
  {
    key: 'fast',
    label: 'Under 20 minutes',
    tagline: 'Home at 5:30, eating by 5:50.',
    household: 'Family of 4',
    budget: '$100/week',
    cookTime: '20 min or less',
    dietary: 'none',
    meals: sw([
      {
        day: 'Monday', name: 'Garlic Shrimp Stir-Fry with Snap Peas', cuisine: 'Asian', protein: 'shrimp',
        cookTime: 12, prepTime: 6, servings: 4, estimatedCost: 18.0,
        ingredients: [
          { name: 'frozen peeled shrimp', quantity: '1', unit: 'lb', category: 'Frozen', searchTerm: 'frozen peeled shrimp' },
          { name: 'snap peas', quantity: '8', unit: 'oz', category: 'Produce', searchTerm: 'sugar snap peas' },
          { name: 'garlic', quantity: '4', unit: 'clove', category: 'Produce', searchTerm: 'garlic' },
          { name: 'soy sauce', quantity: '3', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'soy sauce' },
          { name: 'microwave jasmine rice', quantity: '2', unit: 'package', category: 'Pantry & Dry Goods', searchTerm: 'microwave jasmine rice' },
          { name: 'sesame oil', quantity: '1', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'sesame oil' },
        ],
        steps: [
          'Thaw shrimp under cold water 5 minutes; pat dry. Heat rice per package.',
          'Stir-fry garlic and snap peas in sesame oil 2 minutes; add shrimp and cook 3-4 minutes until pink.',
          'Splash in soy sauce, toss, serve over rice.',
        ],
      },
      {
        day: 'Tuesday', name: 'Rotisserie Chicken Quesadillas', cuisine: 'Mexican', protein: 'chicken',
        cookTime: 12, prepTime: 5, servings: 4, estimatedCost: 15.5,
        ingredients: [
          { name: 'rotisserie chicken', quantity: '1', unit: 'whole', category: 'Meat & Seafood', searchTerm: 'rotisserie chicken' },
          { name: 'flour tortillas', quantity: '1', unit: 'package', category: 'Bakery', searchTerm: 'large flour tortillas' },
          { name: 'shredded Mexican cheese', quantity: '2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded mexican cheese' },
          { name: 'salsa', quantity: '1', unit: 'jar', category: 'Pantry & Dry Goods', searchTerm: 'salsa' },
          { name: 'avocado', quantity: '2', unit: 'whole', category: 'Produce', searchTerm: 'avocado' },
        ],
        steps: [
          'Shred half the chicken (save the rest for Thursday).',
          'Fill tortillas with chicken and cheese; cook in a dry skillet 2-3 minutes per side until crisp.',
          'Cut into wedges; serve with salsa and sliced avocado.',
        ],
      },
      {
        day: 'Wednesday', name: 'Tortellini with Spinach & Brown Butter', cuisine: 'Italian', protein: 'vegetarian',
        cookTime: 10, prepTime: 3, servings: 4, estimatedCost: 12.0,
        ingredients: [
          { name: 'cheese tortellini', quantity: '20', unit: 'oz', category: 'Dairy & Eggs', searchTerm: 'refrigerated cheese tortellini' },
          { name: 'baby spinach', quantity: '5', unit: 'oz', category: 'Produce', searchTerm: 'baby spinach' },
          { name: 'butter', quantity: '4', unit: 'tbsp', category: 'Dairy & Eggs', searchTerm: 'butter' },
          { name: 'parmesan cheese', quantity: '1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'grated parmesan' },
          { name: 'lemon', quantity: '1', unit: 'whole', category: 'Produce', searchTerm: 'lemon' },
        ],
        steps: [
          'Boil tortellini 3-4 minutes; drain.',
          'Melt butter in the same pot until it smells nutty; add spinach and wilt 1 minute.',
          'Toss tortellini back in with parmesan and a squeeze of lemon.',
        ],
      },
      {
        day: 'Thursday', name: 'BBQ Chicken Flatbreads', cuisine: 'American', protein: 'chicken',
        cookTime: 10, prepTime: 5, servings: 4, estimatedCost: 9.5,
        ingredients: [
          { name: 'naan or flatbread', quantity: '4', unit: 'whole', category: 'Bakery', searchTerm: 'naan bread' },
          { name: 'bbq sauce', quantity: '1/2', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'bbq sauce' },
          { name: 'shredded mozzarella', quantity: '1 1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded mozzarella' },
          { name: 'red onion', quantity: '1/2', unit: 'whole', category: 'Produce', searchTerm: 'red onion' },
          { name: 'bagged salad kit', quantity: '1', unit: 'bag', category: 'Produce', searchTerm: 'caesar salad kit' },
        ],
        steps: [
          'Heat oven to 425F. Spread bbq sauce on flatbreads; top with the rest of Tuesday’s chicken, cheese, and thin onion slices.',
          'Bake 8-10 minutes until the cheese bubbles.',
          'Toss the salad kit and serve alongside.',
        ],
      },
      {
        day: 'Friday', name: 'Black Bean & Corn Burrito Bowls', cuisine: 'Mexican', protein: 'vegetarian',
        cookTime: 10, prepTime: 8, servings: 4, estimatedCost: 9.0,
        ingredients: [
          { name: 'canned black beans', quantity: '2', unit: 'can', category: 'Pantry & Dry Goods', searchTerm: 'canned black beans' },
          { name: 'frozen corn', quantity: '1', unit: 'bag', category: 'Frozen', searchTerm: 'frozen corn' },
          { name: 'microwave brown rice', quantity: '2', unit: 'package', category: 'Pantry & Dry Goods', searchTerm: 'microwave brown rice' },
          { name: 'shredded cheddar', quantity: '1', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded cheddar cheese' },
          { name: 'salsa', quantity: '1', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'salsa' },
          { name: 'lime', quantity: '2', unit: 'whole', category: 'Produce', searchTerm: 'lime' },
        ],
        steps: [
          'Heat rice. Warm drained beans and corn in a pan with a pinch of cumin, 4 minutes.',
          'Build bowls: rice, beans and corn, cheese, salsa, squeeze of lime.',
        ],
      },
    ]),
  },
  {
    key: 'budget',
    label: 'Under $75',
    tagline: 'Five dinners, one list, under $75 at the register.',
    household: 'Family of 4',
    budget: '$75/week',
    cookTime: '40 min or less',
    dietary: 'none',
    meals: sw([
      {
        day: 'Monday', name: 'One-Pot Chicken Thighs & Rice', cuisine: 'American', protein: 'chicken',
        cookTime: 30, prepTime: 8, servings: 4, estimatedCost: 11.0,
        ingredients: [
          { name: 'boneless chicken thighs', quantity: '1 1/2', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'boneless skinless chicken thighs' },
          { name: 'white rice', quantity: '1 1/2', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'long grain white rice' },
          { name: 'chicken broth', quantity: '3', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'chicken broth' },
          { name: 'yellow onion', quantity: '1', unit: 'whole', category: 'Produce', searchTerm: 'yellow onion' },
          { name: 'frozen peas', quantity: '1', unit: 'cup', category: 'Frozen', searchTerm: 'frozen peas' },
          { name: 'paprika', quantity: '1', unit: 'tsp', category: 'Pantry & Dry Goods', searchTerm: 'paprika' },
        ],
        steps: [
          'Season thighs with paprika, salt, pepper. Brown 3 minutes per side in an oiled pot; set aside.',
          'Soften diced onion 3 minutes; stir in rice, add broth, nestle chicken on top. Cover and simmer 18 minutes.',
          'Stir in peas, rest 5 minutes off heat.',
        ],
      },
      {
        day: 'Tuesday', name: 'Spaghetti with Turkey Meat Sauce', cuisine: 'Italian', protein: 'turkey',
        cookTime: 25, prepTime: 5, servings: 4, estimatedCost: 10.5,
        ingredients: [
          { name: 'ground turkey', quantity: '1', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'ground turkey' },
          { name: 'spaghetti', quantity: '1', unit: 'lb', category: 'Pantry & Dry Goods', searchTerm: 'spaghetti' },
          { name: 'marinara sauce', quantity: '1', unit: 'jar', category: 'Pantry & Dry Goods', searchTerm: 'marinara sauce' },
          { name: 'garlic', quantity: '2', unit: 'clove', category: 'Produce', searchTerm: 'garlic' },
          { name: 'parmesan cheese', quantity: '1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'grated parmesan' },
        ],
        steps: [
          'Boil spaghetti. Brown turkey with garlic 7 minutes.',
          'Add marinara, simmer 10 minutes. Toss with pasta; top with parmesan.',
        ],
      },
      {
        day: 'Wednesday', name: 'Loaded Baked Potatoes with Broccoli & Cheddar', cuisine: 'American', protein: 'vegetarian',
        cookTime: 25, prepTime: 5, servings: 4, estimatedCost: 8.5,
        ingredients: [
          { name: 'russet potatoes', quantity: '4', unit: 'whole', category: 'Produce', searchTerm: 'russet potatoes' },
          { name: 'broccoli florets', quantity: '4', unit: 'cup', category: 'Produce', searchTerm: 'broccoli florets' },
          { name: 'shredded cheddar', quantity: '1 1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded cheddar cheese' },
          { name: 'sour cream', quantity: '1', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'sour cream' },
          { name: 'canned black beans', quantity: '1', unit: 'can', category: 'Pantry & Dry Goods', searchTerm: 'canned black beans' },
        ],
        steps: [
          'Microwave pricked potatoes 10-12 minutes until soft; steam broccoli 4 minutes.',
          'Split potatoes; load with warm beans, broccoli, cheese. Microwave 1 minute to melt. Top with sour cream.',
        ],
      },
      {
        day: 'Thursday', name: 'Sheet Pan Sausage, Peppers & Potatoes', cuisine: 'American', protein: 'pork',
        cookTime: 28, prepTime: 7, servings: 4, estimatedCost: 12.0,
        ingredients: [
          { name: 'smoked sausage', quantity: '14', unit: 'oz', category: 'Meat & Seafood', searchTerm: 'smoked sausage' },
          { name: 'bell peppers', quantity: '3', unit: 'whole', category: 'Produce', searchTerm: 'bell peppers' },
          { name: 'baby potatoes', quantity: '1 1/2', unit: 'lb', category: 'Produce', searchTerm: 'baby potatoes' },
          { name: 'yellow onion', quantity: '1', unit: 'whole', category: 'Produce', searchTerm: 'yellow onion' },
          { name: 'olive oil', quantity: '2', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'olive oil' },
          { name: 'Italian seasoning', quantity: '1', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'italian seasoning' },
        ],
        steps: [
          'Heat oven to 425F. Halve potatoes; toss with oil and seasoning; roast 12 minutes.',
          'Add sliced sausage, peppers, onion. Roast 15 more minutes.',
        ],
      },
      {
        day: 'Friday', name: 'Egg Fried Rice with Frozen Veggies', cuisine: 'Asian', protein: 'eggs',
        cookTime: 15, prepTime: 5, servings: 4, estimatedCost: 7.0,
        ingredients: [
          { name: 'white rice', quantity: '2', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'long grain white rice' },
          { name: 'eggs', quantity: '4', unit: 'whole', category: 'Dairy & Eggs', searchTerm: 'eggs' },
          { name: 'frozen mixed vegetables', quantity: '1', unit: 'bag', category: 'Frozen', searchTerm: 'frozen mixed vegetables' },
          { name: 'soy sauce', quantity: '3', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'soy sauce' },
          { name: 'green onions', quantity: '1', unit: 'bunch', category: 'Produce', searchTerm: 'green onions' },
        ],
        steps: [
          'Cook rice (or use Monday’s leftover rice, which fries better).',
          'Scramble eggs in an oiled skillet; push aside. Add vegetables, cook 3 minutes; add rice and soy sauce, fry 4 minutes.',
          'Finish with sliced green onions.',
        ],
      },
    ]),
  },
  {
    key: 'glutenfree',
    label: 'Gluten-free',
    tagline: 'Naturally gluten-free dinners, no specialty aisle required.',
    household: 'Family of 4',
    budget: '$100/week',
    cookTime: '40 min or less',
    dietary: 'Gluten-free',
    meals: sw([
      {
        day: 'Monday', name: 'Sheet Pan Lemon Herb Salmon & Potatoes', cuisine: 'American', protein: 'salmon',
        cookTime: 22, prepTime: 8, servings: 4, estimatedCost: 19.5,
        ingredients: [
          { name: 'salmon fillets', quantity: '1 1/2', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'salmon fillets' },
          { name: 'baby potatoes', quantity: '1 1/2', unit: 'lb', category: 'Produce', searchTerm: 'baby potatoes' },
          { name: 'green beans', quantity: '1', unit: 'lb', category: 'Produce', searchTerm: 'green beans' },
          { name: 'lemon', quantity: '2', unit: 'whole', category: 'Produce', searchTerm: 'lemon' },
          { name: 'olive oil', quantity: '3', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'olive oil' },
          { name: 'dried dill', quantity: '1', unit: 'tsp', category: 'Pantry & Dry Goods', searchTerm: 'dried dill' },
        ],
        steps: [
          'Heat oven to 425F. Halve potatoes; toss with oil, salt; roast 12 minutes.',
          'Add green beans and salmon, drizzle with oil, dill, lemon juice. Roast 10 minutes more.',
        ],
      },
      {
        day: 'Tuesday', name: 'Chicken Fajita Bowls', cuisine: 'Mexican', protein: 'chicken',
        cookTime: 18, prepTime: 10, servings: 4, estimatedCost: 15.0,
        ingredients: [
          { name: 'chicken breast', quantity: '1 1/2', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'chicken breast' },
          { name: 'bell peppers', quantity: '3', unit: 'whole', category: 'Produce', searchTerm: 'bell peppers' },
          { name: 'yellow onion', quantity: '1', unit: 'whole', category: 'Produce', searchTerm: 'yellow onion' },
          { name: 'chili powder', quantity: '1', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'chili powder' },
          { name: 'white rice', quantity: '1 1/2', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'white rice' },
          { name: 'corn tortillas', quantity: '1', unit: 'package', category: 'Bakery', searchTerm: 'corn tortillas' },
          { name: 'lime', quantity: '2', unit: 'whole', category: 'Produce', searchTerm: 'lime' },
        ],
        steps: [
          'Start rice. Slice chicken, peppers, onion; toss with chili powder, salt, oil.',
          'Sear in a hot skillet 8-10 minutes until chicken is cooked and peppers char at the edges.',
          'Serve over rice with warm corn tortillas and lime.',
        ],
      },
      {
        day: 'Wednesday', name: 'Beef & Broccoli Stir-Fry', cuisine: 'Asian', protein: 'beef',
        cookTime: 15, prepTime: 10, servings: 4, estimatedCost: 17.0,
        ingredients: [
          { name: 'flank steak', quantity: '1', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'flank steak' },
          { name: 'broccoli florets', quantity: '5', unit: 'cup', category: 'Produce', searchTerm: 'broccoli florets' },
          { name: 'gluten-free tamari', quantity: '1/4', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'gluten free tamari' },
          { name: 'garlic', quantity: '3', unit: 'clove', category: 'Produce', searchTerm: 'garlic' },
          { name: 'cornstarch', quantity: '1', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'cornstarch' },
          { name: 'white rice', quantity: '1 1/2', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'white rice' },
        ],
        steps: [
          'Start rice. Slice steak thin against the grain; toss with cornstarch.',
          'Sear beef in batches 2 minutes; remove. Stir-fry broccoli with 2 tbsp water, covered, 3 minutes.',
          'Return beef, add tamari and garlic; toss 1 minute. Serve over rice.',
        ],
      },
      {
        day: 'Thursday', name: 'Turkey Chili', cuisine: 'American', protein: 'turkey',
        cookTime: 30, prepTime: 8, servings: 4, estimatedCost: 12.5,
        ingredients: [
          { name: 'ground turkey', quantity: '1', unit: 'lb', category: 'Meat & Seafood', searchTerm: 'ground turkey' },
          { name: 'canned kidney beans', quantity: '2', unit: 'can', category: 'Pantry & Dry Goods', searchTerm: 'canned kidney beans' },
          { name: 'canned diced tomatoes', quantity: '1', unit: 'can', category: 'Pantry & Dry Goods', searchTerm: 'canned diced tomatoes' },
          { name: 'yellow onion', quantity: '1', unit: 'whole', category: 'Produce', searchTerm: 'yellow onion' },
          { name: 'chili powder', quantity: '2', unit: 'tbsp', category: 'Pantry & Dry Goods', searchTerm: 'chili powder' },
          { name: 'shredded cheddar', quantity: '1', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded cheddar cheese' },
        ],
        steps: [
          'Brown turkey with diced onion 7 minutes. Stir in chili powder.',
          'Add beans (drained) and tomatoes with juice; simmer 20 minutes. Top with cheddar.',
        ],
      },
      {
        day: 'Friday', name: 'Baked Potato Nachos', cuisine: 'American', protein: 'vegetarian',
        cookTime: 25, prepTime: 8, servings: 4, estimatedCost: 9.0,
        ingredients: [
          { name: 'russet potatoes', quantity: '4', unit: 'whole', category: 'Produce', searchTerm: 'russet potatoes' },
          { name: 'canned black beans', quantity: '1', unit: 'can', category: 'Pantry & Dry Goods', searchTerm: 'canned black beans' },
          { name: 'shredded Mexican cheese', quantity: '1 1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'shredded mexican cheese' },
          { name: 'salsa', quantity: '1', unit: 'cup', category: 'Pantry & Dry Goods', searchTerm: 'salsa' },
          { name: 'sour cream', quantity: '1/2', unit: 'cup', category: 'Dairy & Eggs', searchTerm: 'sour cream' },
        ],
        steps: [
          'Heat oven to 450F. Slice potatoes into thin rounds; toss with oil and salt; roast 18 minutes, flipping once.',
          'Pile on a sheet pan with beans and cheese; bake 4 minutes to melt. Top with salsa and sour cream.',
        ],
      },
    ]),
  },
]

export function getSampleWeek(key: string): SampleWeek | undefined {
  return SAMPLE_WEEKS.find((w) => w.key === key)
}

export function sampleWeekTotal(week: SampleWeek): number {
  return Math.round(week.meals.reduce((sum, m) => sum + m.estimatedCost, 0) * 100) / 100
}

/** Deduplicated grocery list for a sample week, grouped by category. */
const UNIT_RANK: Record<string, number> = { tsp: 1, tbsp: 2, oz: 3, cup: 4, whole: 5, lb: 6, can: 6, jar: 6, package: 6, bag: 6 }
function toNumber(q: string): number {
  const m = q.trim().match(/^(\d+)?\s*(?:(\d)\/(\d))?$/)
  if (!m) return parseFloat(q)
  return (m[1] ? Number(m[1]) : 0) + (m[2] ? Number(m[2]) / Number(m[3]) : 0)
}

export function sampleGroceryList(week: SampleWeek): Record<string, Array<{ name: string; quantity: string; unit: string }>> {
  const out: Record<string, Array<{ name: string; quantity: string; unit: string }>> = {}
  const seen = new Map<string, { name: string; quantity: string; unit: string; category: string }>()
  for (const meal of week.meals) {
    for (const ing of meal.ingredients) {
      // One line per ingredient name. Same unit → quantities add; different units
      // (1 tbsp honey + 1/4 cup honey) → keep the larger measure, since the shopper
      // buys one jar either way.
      const k = ing.name.toLowerCase()
      const prev = seen.get(k)
      if (prev) {
        const a = toNumber(prev.quantity)
        const b = toNumber(ing.quantity)
        if (prev.unit === ing.unit) {
          if (!Number.isNaN(a) && !Number.isNaN(b)) prev.quantity = String(Math.round((a + b) * 4) / 4)
        } else if ((UNIT_RANK[ing.unit] ?? 0) > (UNIT_RANK[prev.unit] ?? 0)) {
          prev.quantity = ing.quantity
          prev.unit = ing.unit
        }
      } else {
        seen.set(k, { name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category })
      }
    }
  }
  seen.forEach((item) => {
    ;(out[item.category] ||= []).push({ name: item.name, quantity: item.quantity, unit: item.unit })
  })
  return out
}
