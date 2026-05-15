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

- **Soy sauce** — the salt and umami base
- **Mirin** — sweet Japanese rice wine that adds depth and gloss
- **Sake** — dry rice wine that balances the sweetness (substitute dry sherry or rice vinegar)
- **Sugar** — brown sugar or honey adds caramelization

The ratio: 3 tablespoons soy sauce, 2 tablespoons mirin, 1 tablespoon sake or dry sherry, 1 tablespoon brown sugar. That is it. Simmer 2–3 minutes until slightly thickened. The cornstarch slurry approach (1 tsp cornstarch dissolved in 1 tbsp water) gives a thicker, glossier result — add it at the end if you want restaurant-style sauce.

**Bottled teriyaki sauce works fine.** Kikkoman and Soy Vay are both reliable. Homemade is better, but the difference is not worth the effort on a busy Tuesday.

---

## Method 1: Stovetop Glaze (Best Flavor — 25 Minutes)

**Best for:** Boneless chicken thighs or breasts sliced thin

### Ingredients
- 1.5 lbs boneless skinless chicken thighs (preferred) or breasts
- 3 tbsp soy sauce
- 2 tbsp mirin
- 1 tbsp sake or dry sherry
- 1 tbsp brown sugar
- 2 garlic cloves, minced
- 1 tsp fresh ginger, grated
- 1 tsp sesame oil
- Optional: 1 tsp cornstarch dissolved in 1 tbsp water (for thicker sauce)
- For serving: steamed white rice, sesame seeds, sliced green onions, steamed broccoli or edamame

### Instructions

**1. Make the sauce.** Whisk soy sauce, mirin, sake, brown sugar, garlic, and ginger in a small bowl. Set aside.

**2. Cook the chicken.** Pat chicken dry with paper towels. Heat 1 tablespoon oil in a large skillet over medium-high heat. Add chicken in a single layer (work in batches if needed). Cook 4–5 minutes without moving until golden brown. Flip and cook another 3–4 minutes until cooked through (internal temp 165°F).

**3. Glaze.** Reduce heat to medium. Pour sauce over chicken. Toss to coat. Cook 2–3 minutes, turning chicken frequently, until sauce reduces and glazes every piece. It should look sticky and lacquered. If using cornstarch slurry, add it now and stir constantly for 1 minute.

**4. Finish.** Add sesame oil, toss once more. Slice chicken against the grain if using breasts. Serve immediately over steamed rice.

**Why thighs over breasts:** Chicken thighs stay juicy under high-heat glazing. Breasts can dry out if overcooked by even a minute. If using breasts, slice them horizontally to create cutlets before cooking.

---

## Method 2: Oven-Baked Teriyaki Chicken (Easiest — 35 Minutes)

**Best for:** Bone-in thighs or a larger batch

### Ingredients
- 2–2.5 lbs bone-in skin-on chicken thighs (or boneless)
- 1/3 cup teriyaki sauce (homemade or bottled)
- 1 tbsp sesame oil
- Salt and pepper

### Instructions

**1. Marinate.** Combine chicken with half the teriyaki sauce and sesame oil. Marinate 30 minutes at room temperature or up to 8 hours in the refrigerator. The longer the better.

**2. Bake.** Preheat oven to 400°F. Arrange chicken skin-side up on a rimmed baking sheet or in a baking dish. Bake 30 minutes.

**3. Glaze and finish.** Brush with remaining teriyaki sauce. Return to oven for 8–10 minutes until chicken is cooked through (165°F internal) and the glaze is caramelized and slightly charred at the edges.

**4. Optional broil.** For extra caramelization, broil 2–3 minutes at the end. Watch closely — teriyaki sauce burns fast under direct heat.

**Make-ahead:** Marinate overnight, bake the next day. The longer marinade time significantly deepens the flavor.

---

## Method 3: Slow Cooker Teriyaki Chicken (Set and Forget)

**Best for:** Shredded teriyaki chicken over rice bowls

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

**2. Cook.** LOW 6–7 hours or HIGH 3–4 hours. Chicken is done when it shreds easily with a fork.

**3. Shred and thicken.** Remove chicken and shred with two forks. Whisk cornstarch slurry into the cooking liquid. Turn slow cooker to HIGH, cover, and cook 20–30 minutes until sauce thickens into a glaze consistency. Return shredded chicken to the pot and toss to coat.

**4. Serve.** Over steamed white rice with steamed broccoli, edamame, or snap peas. Top with sesame seeds and sliced green onions.

**Slow cooker teriyaki is the meal prep champion.** One batch feeds four people twice. The shredded chicken reheats in 90 seconds with a splash of water, making it the most forgiving leftover in the rotation.

---

## Teriyaki Chicken Bowl Build

The bowl format is what makes teriyaki a complete dinner:

**Base:** Steamed white rice (jasmine or medium-grain), brown rice, or rice noodles

**Protein:** Teriyaki chicken, sliced or shredded

**Vegetables:** Any combination of steamed broccoli, edamame, snap peas, sliced cucumber, shredded purple cabbage, or roasted carrots

**Toppings:** Sesame seeds, sliced green onions, pickled ginger, a drizzle of sriracha mayo (mayo + sriracha + lime juice) for adults

The bowl format is also a picky eater solution — each component can be separated on the plate or divided into sections so nothing touches.

---

## Common Teriyaki Mistakes

**Using too much sauce before cooking.** Excess sauce burns before the chicken finishes cooking. Use a light coat for cooking; add more sauce in the last 2–3 minutes to build the glaze.

**Using chicken breasts without slicing them.** Whole chicken breasts cook unevenly. Slice horizontally into two thin cutlets, or pound to even thickness.

**Not patting the chicken dry.** Surface moisture creates steam, not browning. Dry chicken = better caramelization.

**Using low-sodium soy sauce.** Low-sodium works but results in a thinner, less complex sauce. Full-sodium soy sauce gives teriyaki its characteristic depth.

**Overcrowding the pan.** Chicken steams instead of sears when pieces touch each other. Cook in batches if your pan isn't large enough.

---

## Teriyaki Chicken Variations

**Teriyaki Salmon:** Substitute salmon fillets. Bake at 400°F for 12 minutes with teriyaki sauce brushed on at the start. Broil 2 minutes at the end.

**Teriyaki Shrimp:** Sauté shrimp in oil over high heat 2 minutes per side. Add teriyaki sauce and cook 2 minutes more until shrimp is coated and sauce thickens.

**Teriyaki Tofu:** Press extra-firm tofu, cube it, and pan-fry until crispy on all sides before adding sauce. The crispy exterior holds the glaze better than soft tofu.

**Teriyaki Beef:** Thin-sliced ribeye or sirloin, cooked in a hot skillet 2–3 minutes per side, glazed with teriyaki in the final minute. A faster, richer version.

---

## FAQ

**Can I make teriyaki chicken ahead?**
Yes. Cooked teriyaki chicken keeps 4 days in the refrigerator and 3 months frozen. Reheat gently in a skillet with a splash of water to loosen the sauce, or microwave with a damp paper towel over the top to prevent drying.

**Is teriyaki chicken healthy?**
By most metrics, yes. Chicken thighs are high protein. The sauce calories are moderate — about 60–80 calories per serving of homemade sauce. Serve with steamed vegetables instead of fried rice to keep the full meal balanced.

**What's the difference between teriyaki and soy sauce chicken?**
Teriyaki uses mirin and sugar, which caramelize into a glossy glaze during cooking. Plain soy sauce chicken is saltier and less sweet without the caramelized finish. The mirin is what makes teriyaki distinct.

**Can I use chicken breasts instead of thighs?**
Yes, but thighs are significantly more forgiving. Breasts cook faster and dry out more easily. If using breasts, cook at slightly lower heat and pull them at exactly 165°F.

**Why isn't my sauce getting glossy?**
Two reasons: either the heat is too low (sauce needs to actively bubble to reduce and caramelize) or there's too much liquid in the pan. Increase heat to medium-high and keep the chicken moving.

---

## How DinnerDrop Handles This

[DinnerDrop](https://dinnerdrop.app/beta) plans five personalized family dinners and your complete grocery list every week. Tell it your family's preferences — including whether you want quick weeknight dinners, slow cooker options, or both — and it builds the week automatically. The beta is free for six months.

**[Get your weekly dinner plan at DinnerDrop](https://dinnerdrop.app/beta)**
\`,
  },`;

// Find the array closing line and insert before it
const arrayClosePattern = '\r\n]\r\nexport function';
const arrayClosePatternLF = '\n]\nexport function';

if (content.includes(arrayClosePattern)) {
  content = content.replace(arrayClosePattern, '\r\n' + newPost + '\r\n]\r\nexport function');
  fs.writeFileSync('lib/blog-posts.ts', content, 'utf8');
  console.log('✅ teriyaki-chicken added (CRLF)');
} else if (content.includes(arrayClosePatternLF)) {
  content = content.replace(arrayClosePatternLF, '\n' + newPost + '\n]\nexport function');
  fs.writeFileSync('lib/blog-posts.ts', content, 'utf8');
  console.log('✅ teriyaki-chicken added (LF)');
} else {
  // Find the ] line manually
  const lines = content.split('\n');
  let arrIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].replace('\r','') === ']') { arrIdx = i; break; }
  }
  if (arrIdx >= 0) {
    console.log('Found ] at line', arrIdx+1, '— inserting before it');
    lines.splice(arrIdx, 0, newPost);
    fs.writeFileSync('lib/blog-posts.ts', lines.join('\n'), 'utf8');
    console.log('✅ teriyaki-chicken added (manual splice)');
  } else {
    console.log('❌ Could not find array close');
  }
}

// Verify
const lines2 = fs.readFileSync('lib/blog-posts.ts', 'utf8').split('\n');
const slugCount = lines2.filter(l => /^\s+slug:\s+'/.test(l)).length;
console.log('Slug count after add:', slugCount);
const hasTeriyaki = fs.readFileSync('lib/blog-posts.ts', 'utf8').includes("slug: 'teriyaki-chicken'");
console.log('teriyaki-chicken present:', hasTeriyaki);
