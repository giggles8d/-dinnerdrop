# DinnerDrop recipe-writing brief

DinnerDrop is a weeknight dinner planner for busy families (https://www.dinnerdrop.app). You are writing ORIGINAL recipes for its shared recipe library. Each dish in your list is a well-known family dinner; write DinnerDrop's own version of it.

## Copyright rules (important)
- Do NOT fetch, copy, or paraphrase any specific website's recipe. Write the steps from your own cooking knowledge, in your own words. No web access is needed for this task.
- Ingredient lists are fine to be typical for the dish (they're facts).
- Never mention other brands, sites, restaurants (e.g. no "Olive Garden", "Big Mac" trademark claims in text — a dish NAME like "Big Mac Salad Bowls" may be renamed to a generic one such as "Cheeseburger Salad Bowls"; rename trademarked dish names to generic ones).

## Output
Write a single JSON array to the output file given to you. The names already in the library are in the existing-names file named in your prompt (default `existing.txt`). One object per dish, in this exact shape:

```json
{
  "name": "Classic Cottage Pie",
  "cuisine": "American",            // one of: American, Mexican, Asian, Mediterranean, Italian
  "protein": "ground beef",          // lowercase main protein (use "none" never; for veg use e.g. "black beans", "eggs", "tofu", "cheese", "chickpeas", "lentils")
  "cook_time": 30,                   // minutes of active+hands-off cooking (int). Slow cooker: real time e.g. 360
  "prep_time": 15,                   // minutes (int)
  "servings": 4,
  "estimated_cost": 14.5,            // realistic US grocery cost in USD for the whole recipe, 2026 prices, number
  "ingredients": [
    {"name": "ground beef", "quantity": "1.5", "unit": "lb", "category": "Meat & Seafood", "searchTerm": "85% lean ground beef"}
  ],
  "steps": ["...", "..."],           // 4-8 clear steps, each one or two sentences, include temps/times; family-friendly tips welcome (e.g. set plain portion aside for picky kids)
  "tags": ["one-pot", "kid-favorite"],
  "dietary": [],                     // only values from: Vegetarian, Vegan, Gluten-free, Dairy-free, Keto, Halal — include each that the recipe TRULY satisfies as written (e.g. Gluten-free only if no wheat pasta/flour/bread/soy sauce; use tamari if you want GF)
  "nutrition": {"calories": 520, "protein": 34}   // per serving estimates, ints
}
```

Field rules:
- `quantity` is a string number ("1", "0.5", "2"). `unit` from: lb, oz, cup, tbsp, tsp, count, cloves, can, package, bunch, head, slices, jar, pinch.
- `category` exactly one of: "Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry & Dry Goods", "Frozen", "Bakery", "Beverages".
- `searchTerm` is what you'd type into Instacart to find it (e.g. "boneless skinless chicken thighs", "shredded mozzarella cheese").
- 5-12 ingredients. Skip water. Salt/pepper/oil can be included as pantry items.
- Serves 4 by default. Keep weeknight-realistic: prep_time + cook_time ≤ 45 for most dishes; slow-cooker/oven-braise dishes may be longer and must have tag "slow-cooker" or "make-ahead".
- Tags from this set where true: quick (total ≤ 30 min), 20-min (total ≤ 20), one-pot, sheet-pan, slow-cooker, instant-pot, kid-favorite, budget (cost ≤ $15), freezer-friendly, make-ahead, meatless, high-protein, comfort-food, skillet, grill.
- `name`: clean title-case dish name; you may tidy the name from the list (e.g. drop parentheticals).
- Steps written plainly for a tired parent. No headnotes, no stories.

Validate the file is parseable JSON before you finish (e.g. `node -e "JSON.parse(require('fs').readFileSync(FILE,'utf8')).length"`). Report back only: the count written and any dish you renamed or skipped and why.

## Wave 2+ (you choose the dishes)
When your prompt gives you a THEME instead of a dish list: choose the dishes yourself. Pick dishes real US families actually cook on weeknights (well-known, recognizable, made with supermarket ingredients), within your theme. Each must be clearly different from every name in `existing.txt` in this folder (not just a reworded title — a different dish or a meaningfully different main protein/method). Avoid near-duplicates within your own batch too. Vary cuisines across the five allowed. Mark `kid-favorite` only where it's true.

## Dietary label precision
- Keto: under ~15 g net carbs per serving — no rice, pasta, bread, tortillas, potatoes, corn, beans, sugar/honey; cauliflower rice, zucchini noodles fine.
- Halal: only if no pork, no alcohol (incl. wine/mirin/beer), no gelatin, AND the dish is meatless or seafood-only (we can't guarantee meat sourcing).
- Vegan: no meat, fish, dairy, eggs, honey, fish sauce, Worcestershire (contains anchovy).
