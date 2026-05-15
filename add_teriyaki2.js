const fs = require('fs');
let content = fs.readFileSync('lib/blog-posts.ts', 'utf8');

const newPost = `  {
    slug: 'teriyaki-chicken',
    title: 'Teriyaki Chicken: The Easy Homemade Version Better Than Any Takeout',
    description: 'Make restaurant-quality teriyaki chicken at home in under 30 minutes. Includes the simple 4-ingredient sauce, oven, stovetop, and slow cooker methods, and tips for the glossy glaze families love.',
    primaryKeyword: 'teriyaki chicken',
    publishDate: '2028-02-03',
    readingTimeMinutes: 9,
    content: \`# Teriyaki Chicken: The Easy Homemade Version Better Than Any Takeout

Teriyaki chicken is one of the most universally liked dinners in any family rotation. The flavor profile — sweet, salty, slightly sticky, deeply savory — hits every note that makes a meal feel satisfying. Kids love it. Adults love it. It reheats perfectly the next day. And homemade teriyaki sauce takes four ingredients and five minutes, which is less time than it takes to find the menu and order delivery.

This guide covers the stovetop glaze method, the oven bake method, the slow cooker version for set-and-forget dinners, and every tip for getting that glossy, lacquered finish that makes teriyaki so appealing.

> **Dinner planned and groceries listed in 60 seconds:** [DinnerDrop builds your 5-meal weekly plan and grocery list automatically — try it free for 7 days](/beta)

---

## What Makes Teriyaki Sauce Work

Authentic teriyaki sauce has four components:

- **Soy sauce** -- the salt and umami base
- **Mirin** -- sweet Japanese rice wine that adds depth and gloss
- **Sake** -- dry rice wine that balances the sweetness (substitute dry sherry or rice vinegar)
- **Sugar** -- brown sugar or honey adds caramelization

The ratio: 3 tablespoons soy sauce, 2 tablespoons mirin, 1 tablespoon sake or dry sherry, 1 tablespoon brown sugar. That is it. Simmer 2-3 minutes until slightly thickened. The cornstarch slurry approach (1 tsp cornstarch dissolved in 1 tbsp water) gives a thicker, glossier result -- add it at the end if you want restaurant-style sauce.

Bottled teriyaki sauce works fine. Kikkoman and Soy Vay are both reliable. Homemade is better, but the difference is not worth the effort on a busy Tuesday.

---

## Method 1: Stovetop Glaze (Best Flavor -- 25 Minutes)

Best for boneless chicken thighs or breasts sliced thin.

**Serves:** 4 | **Prep:** 5 min | **Cook:** 20 min

### Ingredients

- 1.5 lbs boneless skinless chicken thighs (preferred) or breasts
- 3 tbsp soy sauce
- 2 tbsp mirin
- 1 tbsp sake or dry sherry
- 1 tbsp brown sugar
- 2 garlic cloves, minced
- 1 tsp fresh ginger, grated
- 1 tsp sesame oil
- Optional: 1 tsp cornstarch dissolved in 1 tbsp water for thicker sauce
- For serving: steamed white rice, sesame seeds, sliced green onions, steamed broccoli or edamame

### Instructions

**1. Make the sauce.** Whisk soy sauce, mirin, sake, brown sugar, garlic, and ginger in a small bowl. Set aside.

**2. Cook the chicken.** Pat chicken dry with paper towels. Heat 1 tablespoon oil in a large skillet over medium-high heat. Add chicken in a single layer, working in batches if needed. Cook 4-5 minutes without moving until golden brown. Flip and cook another 3-4 minutes until cooked through (165 degrees F internal).

**3. Glaze.** Reduce heat to medium. Pour sauce over chicken. Toss to coat. Cook 2-3 minutes, turning chicken frequently, until sauce reduces and glazes every piece. It should look sticky and lacquered. If using cornstarch slurry, add it now and stir constantly for 1 minute.

**4. Finish.** Add sesame oil, toss once more. Slice chicken against the grain if using breasts. Serve immediately over steamed rice.

Why thighs over breasts: Chicken thighs stay juicy under high-heat glazing. Breasts can dry out if overcooked by even a minute. If using breasts, slice them horizontally to create cutlets before cooking.

---

## Method 2: Oven-Baked Teriyaki Chicken (Easiest -- 35 Minutes)

Best for bone-in thighs or a larger batch.

**Serves:** 4-6 | **Prep:** 5 min + 30 min marinating | **Cook:** 40 min

### Ingredients

- 2-2.5 lbs bone-in skin-on chicken thighs (or boneless)
- 1/3 cup teriyaki sauce (homemade or bottled)
- 1 tbsp sesame oil
- Salt and pepper

### Instructions

**1. Marinate.** Combine chicken with half the teriyaki sauce and sesame oil. Marinate 30 minutes at room temperature or up to 8 hours in the refrigerator.

**2. Bake.** Preheat oven to 400 degrees F. Arrange chicken skin-side up on a rimmed baking sheet or in a baking dish. Bake 30 minutes.

**3. Glaze and finish.** Brush with remaining teriyaki sauce. Return to oven for 8-10 minutes until chicken is cooked through (165 degrees F internal) and the glaze is caramelized at the edges.

**4. Optional broil.** For extra caramelization, broil 2-3 minutes at the end. Watch closely -- teriyaki sauce burns fast under direct heat.

Make-ahead tip: Marinate overnight, bake the next day. The longer marinade time significantly deepens the flavor.

---

## Method 3: Slow Cooker Teriyaki Chicken (Set and Forget)

Best for shredded teriyaki chicken over rice bowls. Feeds 6, makes excellent leftovers.

**Serves:** 6 | **Cook time:** 6-7 hours on LOW

### Ingredients

- 2 lbs boneless skinless chicken thighs
- 1/2 cup soy sauce
- 1/4 cup brown sugar
- 2 tbsp rice vinegar
- 3 garlic cloves, minced
- 1 tbsp fresh ginger, grated
- 2 tbsp cornstarch + 2 tbsp water (for thickening at end)

### Instructions

**1. Combine.** Place chicken in slow cooker. Whisk soy sauce, brown sugar, rice vinegar, garlic, and ginger. Pour over chicken.

**2. Cook.** LOW 6-7 hours or HIGH 3-4 hours. Chicken is done when it shreds easily with a fork.

**3. Shred and thicken.** Remove chicken and shred with two forks. Whisk cornstarch slurry into the cooking liquid. Turn slow cooker to HIGH, cover, and cook 20-30 minutes until sauce thickens into a glaze consistency. Return shredded chicken to the pot and toss to coat.

**4. Serve.** Over steamed white rice with steamed broccoli, edamame, or snap peas. Top with sesame seeds and sliced green onions.

Slow cooker teriyaki is the meal prep champion. One batch feeds four people twice. The shredded chicken reheats in 90 seconds with a splash of water, making it the most forgiving leftover in the rotation.

---

## Teriyaki Chicken Bowl Build

The bowl format makes teriyaki a complete dinner. Each component stands alone, which also makes it a picky eater solution.

**Base:** Steamed jasmine rice, brown rice, or rice noodles

**Protein:** Teriyaki chicken, sliced or shredded

**Vegetables:** Steamed broccoli, edamame, snap peas, sliced cucumber, shredded purple cabbage, or roasted carrots

**Toppings:** Sesame seeds, sliced green onions, pickled ginger, sriracha mayo (mayo + sriracha + lime juice) for adults who want heat

Serve each component separately for younger or pickier eaters -- everything is the same dinner, it just doesn't touch.

---

## Common Teriyaki Mistakes

**Using too much sauce before cooking.** Excess sauce burns before the chicken finishes cooking. Use a light coat for cooking and add more sauce in the last 2-3 minutes to build the glaze.

**Skipping the pat-dry step.** Surface moisture creates steam instead of browning. Dry chicken produces better caramelization.

**Overcrowding the pan.** Chicken steams instead of sears when pieces touch each other. Cook in batches if your pan is not large enough.

**Pulling it too soon.** The glaze needs those final 2-3 minutes to reduce and become sticky. Take it off too early and the sauce stays thin.

---

## Teriyaki Variations Worth Making

**Teriyaki Salmon:** Substitute salmon fillets. Bake at 400 degrees F for 12 minutes with teriyaki sauce brushed on at the start. Broil 2 minutes at the end. One of the fastest healthy dinners possible.

**Teriyaki Shrimp:** Saute shrimp in oil over high heat 2 minutes per side. Add teriyaki sauce and cook 2 minutes more until shrimp is coated and sauce thickens.

**Teriyaki Beef:** Thin-sliced ribeye or sirloin, cooked in a hot skillet 2-3 minutes per side, glazed with teriyaki in the final minute. Faster and richer than chicken.

**Teriyaki Tofu:** Press extra-firm tofu, cube it, and pan-fry until crispy on all sides before adding sauce. The crispy exterior holds the glaze better than soft tofu.

---

## FAQ

**Can I make teriyaki chicken ahead?**
Yes. Cooked teriyaki chicken keeps 4 days in the refrigerator and 3 months frozen. Reheat gently in a skillet with a splash of water to loosen the sauce, or microwave with a damp paper towel over the top to prevent drying out.

**Is teriyaki chicken healthy?**
By most measures, yes. Chicken thighs are high protein. The sauce adds about 60-80 calories per serving for homemade. Serve with steamed vegetables instead of fried rice to keep the full meal balanced.

**What is the difference between teriyaki and soy sauce chicken?**
Teriyaki uses mirin and sugar, which caramelize into a glossy glaze during cooking. Plain soy sauce chicken is saltier and less sweet without the caramelized finish. The mirin is what makes teriyaki distinct.

**Can I use chicken breasts instead of thighs?**
Yes, but thighs are significantly more forgiving. Breasts cook faster and dry out more easily. If using breasts, slice horizontally into thin cutlets and cook at slightly lower heat.

**Why is my sauce not getting glossy?**
Two reasons: either the heat is too low (sauce needs to actively bubble to reduce and caramelize) or there is too much liquid in the pan. Increase heat to medium-high and keep the chicken moving.

---

## How DinnerDrop Uses This

[DinnerDrop](https://dinnerdrop.app/beta) plans five personalized family dinners and your complete grocery list every week. Tell it your family preferences -- including quick weeknight dinners, slow cooker options, or both -- and it builds the week automatically. The beta is free for six months.

**[Get your weekly dinner plan at DinnerDrop](https://dinnerdrop.app/beta)**
\`,
  },`;

// Insert before "] as BlogPost[]"
const closePattern = '\r\n] as BlogPost[]';
const closeLF = '\n] as BlogPost[]';

if (content.includes(closePattern)) {
  content = content.replace(closePattern, '\r\n' + newPost + '\r\n] as BlogPost[]');
  fs.writeFileSync('lib/blog-posts.ts', content, 'utf8');
  console.log('✅ teriyaki-chicken added (CRLF)');
} else if (content.includes(closeLF)) {
  content = content.replace(closeLF, '\n' + newPost + '\n] as BlogPost[]');
  fs.writeFileSync('lib/blog-posts.ts', content, 'utf8');
  console.log('✅ teriyaki-chicken added (LF)');
} else {
  console.log('❌ Could not find ] as BlogPost[]');
}

const lines = fs.readFileSync('lib/blog-posts.ts', 'utf8').split('\n');
const slugCount = lines.filter(l => /^\s+slug:\s+'/.test(l)).length;
const hasTeriyaki = fs.readFileSync('lib/blog-posts.ts', 'utf8').includes("slug: 'teriyaki-chicken'");
console.log('Slug count:', slugCount, '| teriyaki present:', hasTeriyaki);
