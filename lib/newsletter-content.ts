// Biweekly newsletter content calendar.
// Deterministic: each calendar month has 2 issue slots (first/second half).
// No fabricated stats or testimonials — dinner ideas and tips are general
// culinary knowledge; product claims match the live feature set.

export interface NewsletterDinner {
  name: string
  note: string
}

export interface NewsletterIssue {
  themeTitle: string
  subject: string
  intro: string
  dinners: NewsletterDinner[]
  tip: { title: string; body: string }
}

export interface FeatureSpotlight {
  title: string
  body: string
  ctaLabel: string
  ctaUrl: string
}

export const FEATURES: FeatureSpotlight[] = [
  {
    title: 'One-tap meal swaps',
    body: "Don't love a meal in this week's plan? Tap swap and DinnerDrop replaces it with another dinner that still fits your budget, cook time, and preferences — and it learns what your family likes over time.",
    ctaLabel: 'Open your dashboard',
    ctaUrl: 'https://dinnerdrop.app/dashboard',
  },
  {
    title: 'The pantry tracker',
    body: "You don't have to rebuy salt, olive oil, or spices every week. Mark what you already have in your pantry and DinnerDrop subtracts it from your grocery list automatically.",
    ctaLabel: 'Set up your pantry',
    ctaUrl: 'https://dinnerdrop.app/pantry',
  },
  {
    title: 'Kroger cart push',
    body: 'Shop at Kroger? Link your Kroger account once and DinnerDrop can push your whole grocery list straight into your Kroger cart — same one-tap handoff as Instacart.',
    ctaLabel: 'Try the grocery list',
    ctaUrl: 'https://dinnerdrop.app/grocery-list',
  },
  {
    title: 'Weekly budget targeting',
    body: 'Set a weekly food budget and every plan is built to hit your number. Tighten it for a frugal week or loosen it for a special one — the plan adapts.',
    ctaLabel: 'Update your budget',
    ctaUrl: 'https://dinnerdrop.app/account',
  },
]

// Two issues per month: index 0 = days 1-15, index 1 = days 16-31.
export const ISSUES: Record<number, [NewsletterIssue, NewsletterIssue]> = {
  1: [
    {
      themeTitle: 'The January Reset Week',
      subject: 'Your January reset: 5 dinners that are cheap, fast, and actually filling',
      intro: 'New year, lighter wallet, zero appetite for complicated cooking. This week leans on pantry staples and one-pot comfort.',
      dinners: [
        { name: 'White bean & sausage soup', note: 'One pot, mostly pantry items' },
        { name: 'Sheet-pan chicken thighs with root vegetables', note: 'Winter produce is at its cheapest' },
        { name: 'Black bean quesadillas', note: '15 minutes, kid-approved' },
        { name: 'Baked ziti with hidden veggies', note: 'Makes lunch leftovers' },
        { name: 'Egg fried rice', note: 'Uses up whatever is in the crisper' },
      ],
      tip: { title: 'January is citrus season', body: 'Oranges, grapefruit, and clementines are at their cheapest and best right now — swap them in for berries (at their priciest) in lunches and snacks.' },
    },
    {
      themeTitle: 'The Slow-Cooker Week',
      subject: '5 set-and-forget dinners for the coldest weeks of the year',
      intro: 'Deep winter is slow-cooker territory: load it in the morning, come home to dinner.',
      dinners: [
        { name: 'Slow-cooker beef chili', note: 'Cheaper cuts shine here' },
        { name: 'Chicken and dumplings', note: 'Pure comfort, minimal effort' },
        { name: 'Pulled pork sandwiches', note: 'Pork shoulder is a budget hero' },
        { name: 'Lentil curry with rice', note: 'Meatless and under $2/serving' },
        { name: 'Slow-cooker baked potato bar', note: 'Everyone builds their own' },
      ],
      tip: { title: 'Buy roasts, not pre-cut', body: 'Whole pork shoulders and chuck roasts cost much less per pound than pre-cut stew meat — and the slow cooker does the knife work for you.' },
    },
  ],
  2: [
    {
      themeTitle: 'The 20-Minute Week',
      subject: '5 real dinners, 20 minutes each — for the weeks that get away from you',
      intro: 'February schedules fill up fast. Every dinner this week is on the table in about 20 minutes.',
      dinners: [
        { name: 'Garlic butter shrimp pasta', note: 'Frozen shrimp thaws while water boils' },
        { name: 'Smash burger tacos', note: 'Faster than the drive-thru' },
        { name: 'Pesto gnocchi with peas', note: 'Shelf-stable gnocchi cooks in 3 minutes' },
        { name: 'Teriyaki chicken stir-fry', note: 'Bagged slaw = zero chopping' },
        { name: 'Caprese grilled cheese + tomato soup', note: 'Upgrade the classic' },
      ],
      tip: { title: 'The frozen-shrimp trick', body: 'Frozen shrimp is often the same product as the "fresh" shrimp at the counter — already peeled, cheaper, and it thaws in 10 minutes under cold water.' },
    },
    {
      themeTitle: 'The Valentine Stay-In Week',
      subject: 'Skip the $200 dinner out — 5 dinners including one date night in',
      intro: 'Restaurant week pricing is no joke. One slightly fancy dinner at home, four easy ones around it.',
      dinners: [
        { name: 'Steak with garlic butter & roasted potatoes', note: 'Date night for a fraction of restaurant prices' },
        { name: 'Creamy tomato tortellini', note: 'Kids devour it' },
        { name: 'Honey-garlic salmon bowls', note: 'Fancy-feeling, 25 minutes' },
        { name: 'Chicken fajita night', note: 'Build-your-own keeps everyone happy' },
        { name: 'Breakfast-for-dinner', note: 'Pancakes earn you goodwill' },
      ],
      tip: { title: 'One splurge, four saves', body: 'Plan one premium dinner and keep the other four under budget — the weekly total stays on target and nobody feels deprived.' },
    },
  ],
  3: [
    {
      themeTitle: 'The Spring Refresh Week',
      subject: '5 lighter dinners as the weather (finally) turns',
      intro: 'Early spring produce starts showing up this month — time to lighten the rotation.',
      dinners: [
        { name: 'Lemon chicken orzo skillet', note: 'Bright, one-pan' },
        { name: 'Veggie-loaded fried rice', note: 'Spring peas and carrots' },
        { name: 'Turkey burgers with oven fries', note: 'Lighter than beef, just as fast' },
        { name: 'Pasta primavera', note: 'Whatever vegetables are on sale' },
        { name: 'Greek chicken pitas', note: 'Yogurt sauce does the heavy lifting' },
      ],
      tip: { title: 'Asparagus math', body: 'Asparagus drops in price through March and April. Thin spears cook faster and go further sliced into pastas and stir-fries than served whole.' },
    },
    {
      themeTitle: 'The Pantry Clean-Out Week',
      subject: 'Eat down the pantry: 5 dinners that cost almost nothing extra',
      intro: 'End of the month + end of winter = perfect week to cook what you already own.',
      dinners: [
        { name: 'Tuscan white bean pasta', note: 'Canned beans + pasta + garlic' },
        { name: 'Loaded rice bowls', note: 'Any protein, any frozen veg' },
        { name: 'Tomato-braised chicken thighs', note: 'Canned tomatoes, big payoff' },
        { name: 'Black bean soup with cornbread', note: 'Boxed cornbread counts' },
        { name: 'Clean-out-the-fridge frittata', note: 'Eggs rescue everything' },
      ],
      tip: { title: 'Shop your freezer first', body: 'Before building this week’s list, pull one forgotten protein from the freezer and plan a dinner around it. That’s one dinner at zero marginal cost.' },
    },
  ],
  4: [
    {
      themeTitle: 'The Under-$60 Week',
      subject: 'A full week of family dinners under $60 — here’s the plan',
      intro: 'Grocery bills creep. This week is built to prove a family week can still come in lean.',
      dinners: [
        { name: 'Spaghetti with meat sauce', note: 'The eternal budget anchor' },
        { name: 'Crispy chickpea & rice bowls', note: 'Pennies per serving' },
        { name: 'Chicken drumstick sheet-pan dinner', note: 'Drumsticks are the cheapest cut' },
        { name: 'Quesadilla night', note: 'Stretch one rotisserie chicken' },
        { name: 'Veggie lo mein', note: 'Cheaper and faster than takeout' },
      ],
      tip: { title: 'Unit price beats sale price', body: 'The shelf tag’s per-ounce price is the only number that matters. "Sale" multipacks are often pricier per ounce than the store-brand single.' },
    },
    {
      themeTitle: 'The Picky-Eater Week',
      subject: '5 dinners picky eaters actually eat (parents still enjoy)',
      intro: 'Every dinner this week has a built-in "plain version" so you cook once, not twice.',
      dinners: [
        { name: 'Build-your-own taco night', note: 'Everyone controls their toppings' },
        { name: 'Chicken tenders with honey mustard', note: 'Oven-baked, not fried' },
        { name: 'Mac and cheese with optional broccoli', note: 'Broccoli on the side, not hidden' },
        { name: 'Mini pizzas on naan', note: 'Each kid decorates their own' },
        { name: 'Meatball subs', note: 'Sauce on the side for the skeptics' },
      ],
      tip: { title: 'The deconstructed dinner', body: 'Serving components separately (plain pasta, sauce, protein, veg) costs nothing extra and ends most dinner-table standoffs.' },
    },
  ],
  5: [
    {
      themeTitle: 'The Grill-Season Opener',
      subject: 'First grill week of the year: 5 dinners, minimal cleanup',
      intro: 'May means the grill earns its keep — and grilling means almost no dishes.',
      dinners: [
        { name: 'Grilled chicken thighs with corn', note: 'Thighs stay juicy, forgive mistakes' },
        { name: 'Burger night with grilled onions', note: 'The classic, done right' },
        { name: 'Sausage & pepper skewers', note: 'Pre-cooked sausage = fast' },
        { name: 'Grilled flatbread pizzas', note: 'Store dough, 6 minutes a side' },
        { name: 'Foil-packet salmon & veggies', note: 'Zero cleanup, literally' },
      ],
      tip: { title: 'Buy proteins on Memorial-week deals early', body: 'Grilling cuts go on deep promotion in May. Buy ahead and freeze — your June self will thank you.' },
    },
    {
      themeTitle: 'The School-Sprint Week',
      subject: 'End-of-school-year chaos? 5 dinners that survive it',
      intro: 'Recitals, playoffs, field days. This week is built around 30-minute ceilings and leftovers on purpose.',
      dinners: [
        { name: 'Slow-cooker shredded chicken tacos', note: 'Morning prep, evening win' },
        { name: 'Double-batch pasta bake', note: 'Tonight + tomorrow’s lunch' },
        { name: 'Rotisserie chicken Caesar wraps', note: 'Assembly, not cooking' },
        { name: 'Fried rice with frozen veg', note: 'Faster than delivery' },
        { name: 'Snack-board dinner', note: 'One night off is a strategy, not a failure' },
      ],
      tip: { title: 'Cook once, eat twice', body: 'Doubling a casserole adds 5 minutes of effort and deletes an entire future dinner decision. Best ROI in home cooking.' },
    },
  ],
  6: [
    {
      themeTitle: 'The No-Oven June Week',
      subject: '5 dinners that won’t heat up your kitchen',
      intro: 'The oven gets a vacation this week: stovetop, grill, and no-cook only.',
      dinners: [
        { name: 'Cold sesame noodle bowls', note: 'Better cold, on purpose' },
        { name: 'Grilled chicken souvlaki plates', note: 'Cucumber salad, no stove' },
        { name: 'Shrimp tacos with mango slaw', note: '15 minutes of stovetop, tops' },
        { name: 'Caprese sandwiches with melon', note: 'Tomatoes are getting good' },
        { name: 'Steak salad with chimichurri', note: 'One pan, big reward' },
      ],
      tip: { title: 'Berries hit their floor in June', body: 'Strawberries and blueberries are at their cheapest of the year. Buy extra and freeze flat on a sheet pan for smoothie season.' },
    },
    {
      themeTitle: 'The Farmers-Market Week',
      subject: 'Build 5 dinners around whatever the market has cheap',
      intro: 'Peak produce, peak value. This week’s plan flexes around what looks best locally.',
      dinners: [
        { name: 'Zucchini & corn quesadillas', note: 'Summer squash is everywhere' },
        { name: 'Tomato-basil pasta', note: 'Five ingredients, ten minutes' },
        { name: 'Grilled veggie & halloumi skewers', note: 'Meatless without complaints' },
        { name: 'BLT night with peaches', note: 'Yes, that’s dinner' },
        { name: 'Summer minestrone', note: 'Clean out the market haul' },
      ],
      tip: { title: 'End-of-market discounts are real', body: 'Vendors discount steeply in the last 30 minutes rather than haul produce home. Shop late for the same food at a better price.' },
    },
  ],
  7: [
    {
      themeTitle: 'The Vacation-Month Week',
      subject: '5 low-effort dinners for a month nobody wants to cook',
      intro: 'July cooking should feel optional. This week keeps effort near zero.',
      dinners: [
        { name: 'Hot dog & burger night', note: 'It’s July. Lean in' },
        { name: 'Rotisserie chicken cobb salad', note: 'No-cook protein' },
        { name: 'Grilled quesadillas', note: 'The grill makes them better' },
        { name: 'Pasta salad with salami & mozzarella', note: 'Make once, eat twice' },
        { name: 'Foil-packet sausage & potatoes', note: 'Campfire-style, backyard convenience' },
      ],
      tip: { title: 'Corn is practically free right now', body: 'July sweet corn often drops to its yearly low. Grill extra ears and cut the kernels into tomorrow’s salads and quesadillas.' },
    },
    {
      themeTitle: 'The Big-Batch Week',
      subject: 'Cook 2 nights, eat 5: the big-batch week',
      intro: 'Two real cooking sessions, strategically stretched across the whole week.',
      dinners: [
        { name: 'Sunday: grilled chicken feast', note: 'Cook 3 lbs, use all week' },
        { name: 'Chicken burrito bowls', note: 'Sunday’s chicken, round two' },
        { name: 'Wednesday: big pot of bolognese', note: 'Tonight over spaghetti' },
        { name: 'Bolognese-stuffed baked potatoes', note: 'Round two, zero extra work' },
        { name: 'Chicken Caesar pitas', note: 'The last of the chicken' },
      ],
      tip: { title: 'Cook proteins naked, sauce later', body: 'Season batch proteins simply (salt, pepper, olive oil) so the same chicken works in tacos Tuesday and Caesar Friday.' },
    },
  ],
  8: [
    {
      themeTitle: 'The Back-to-School Tune-Up',
      subject: 'School’s coming: 5 dinners to get the routine back',
      intro: 'August is the dress rehearsal for the school-year dinner routine. Start easy.',
      dinners: [
        { name: 'Sheet-pan chicken fajitas', note: 'One pan, table in 30' },
        { name: 'Spaghetti night', note: 'The routine anchor' },
        { name: 'Slow-cooker pulled chicken sliders', note: 'Practice-night friendly' },
        { name: 'Stir-fry with whatever’s left', note: 'Use up summer produce' },
        { name: 'Homemade pizza Friday', note: 'Start the tradition now' },
      ],
      tip: { title: 'Theme nights kill decisions', body: 'Taco Tuesday and Pizza Friday aren’t cliches — they’re two fewer decisions a week, every week, forever.' },
    },
    {
      themeTitle: 'The Tomato-Peak Week',
      subject: 'Tomatoes peak this week — 5 dinners that take advantage',
      intro: 'Late August is the best tomato moment of the year. Build the week around it.',
      dinners: [
        { name: 'Fresh tomato pasta pomodoro', note: 'Now or never' },
        { name: 'Chicken parm with quick tomato sauce', note: 'Fresh sauce, big difference' },
        { name: 'Gazpacho + grilled cheese', note: 'No-cook starter, melty finish' },
        { name: 'Margherita flatbreads', note: 'Tomato, basil, done' },
        { name: 'Steak with tomato-corn salad', note: 'Summer on one plate' },
      ],
      tip: { title: 'Never refrigerate tomatoes', body: 'The fridge kills tomato flavor and texture. Counter-ripen them stem-side down and they’ll last most of the week.' },
    },
  ],
  9: [
    {
      themeTitle: 'The New-Routine Week',
      subject: 'Week one of the school routine: 5 dinners that hold the line',
      intro: 'Homework, practices, early bedtimes. This week is the routine, weaponized.',
      dinners: [
        { name: 'Slow-cooker chicken tacos', note: 'Monday survival mode' },
        { name: 'One-pot mac & cheese with peas', note: 'Real stovetop version, 20 minutes' },
        { name: 'Sheet-pan sausage & veggies', note: 'Zero attention required' },
        { name: 'Breakfast-for-dinner Thursday', note: 'Eggs, pancakes, victory' },
        { name: 'Pizza Friday', note: 'The reward at the end of the tunnel' },
      ],
      tip: { title: 'Prep produce the day you buy it', body: 'Washing and chopping vegetables right after shopping turns weeknight cooking into assembly — and produce you can see gets eaten.' },
    },
    {
      themeTitle: 'The Apple-Season Week',
      subject: 'Apples, squash, and the first cozy dinners of fall',
      intro: 'Fall produce arrives this month and it’s all cheap: apples, squash, sweet potatoes.',
      dinners: [
        { name: 'Pork chops with skillet apples', note: 'The fall classic' },
        { name: 'Butternut squash mac & cheese', note: 'Sneaky vegetables, happy kids' },
        { name: 'Sausage & sweet potato sheet pan', note: 'Maple glaze optional, recommended' },
        { name: 'Chicken & rice soup', note: 'First soup of the season' },
        { name: 'Harvest grain bowls', note: 'Roasted squash + whatever grain you have' },
      ],
      tip: { title: 'Buy the big bag of apples', body: 'Orchard-season apple bags cost far less per pound than loose apples, and they keep for weeks in the fridge crisper.' },
    },
  ],
  10: [
    {
      themeTitle: 'The Soup-Season Kickoff',
      subject: 'Soup season opens: 5 pots that feed you twice',
      intro: 'Every soup this week makes enough for tomorrow’s lunch. That’s the point.',
      dinners: [
        { name: 'Chicken tortilla soup', note: 'Topping bar = kid buy-in' },
        { name: 'Broccoli cheddar with bread bowls', note: 'Better than the cafe version' },
        { name: 'Beef & barley stew', note: 'Stew meat stretches far here' },
        { name: 'Creamy tomato basil + grilled cheese', note: 'The undefeated combo' },
        { name: 'White chicken chili', note: 'Mild base, hot sauce on the side' },
      ],
      tip: { title: 'Parmesan rinds are free flavor', body: 'Save parmesan rinds in the freezer and drop one into any simmering soup — it’s the depth restaurant soups have and box broth doesn’t.' },
    },
    {
      themeTitle: 'The Halloween-Week Plan',
      subject: 'Costume week: 5 dinners that fit between everything',
      intro: 'Parties, pumpkin patches, and one night of pure candy chaos. Dinner needs to stay out of the way.',
      dinners: [
        { name: 'Mummy dogs (crescent-wrapped)', note: 'Lean into the theme' },
        { name: 'One-pot chili', note: 'Trick-or-treat fuel, reheats all week' },
        { name: 'Jack-o-lantern quesadillas', note: 'Cut faces, instant delight' },
        { name: 'Sheet-pan chicken & potatoes', note: 'The normal-night anchor' },
        { name: 'Leftover-chili baked potatoes', note: 'Halloween night: fast and warm' },
      ],
      tip: { title: 'Feed them before the candy', body: 'A real dinner before trick-or-treating measurably slows the candy frenzy. Chili in the slow cooker means it’s ready whenever the costumes are.' },
    },
  ],
  11: [
    {
      themeTitle: 'The Pre-Thanksgiving Week',
      subject: 'Save your energy (and budget) for the big bird',
      intro: 'Thanksgiving is expensive and exhausting. The week before should be neither.',
      dinners: [
        { name: 'Red beans & rice with sausage', note: 'Pennies per plate' },
        { name: 'Baked potato soup', note: 'Potatoes are loss-leaders right now' },
        { name: 'Sheet-pan chicken thighs', note: 'Reliable, cheap, done' },
        { name: 'Pasta e fagioli', note: 'Pantry-powered comfort' },
        { name: 'Breakfast-for-dinner', note: 'Save the fancy for Thursday' },
      ],
      tip: { title: 'Turkey-week loss leaders go beyond turkey', body: 'Stores discount butter, broth, potatoes, and baking staples deeply before Thanksgiving. Stock up — these prices won’t return until next year.' },
    },
    {
      themeTitle: 'The Leftover-Genius Week',
      subject: 'Turkey round 2, 3, and 4 (without anyone complaining)',
      intro: 'The bird keeps giving. These dinners disguise it well enough that nobody minds.',
      dinners: [
        { name: 'Turkey pot pie', note: 'The highest use of leftover turkey' },
        { name: 'Turkey & wild rice soup', note: 'Make broth from the carcass' },
        { name: 'Turkey enchiladas', note: 'Completely different flavor lane' },
        { name: 'Cranberry-turkey melts', note: 'Lunch masquerading as dinner' },
        { name: 'Something that is not turkey', note: 'Pasta night. You’ve earned it' },
      ],
      tip: { title: 'The carcass is a meal', body: 'Simmer the turkey carcass with onion, carrot, and celery scraps for an hour — that’s free broth for two future soups.' },
    },
  ],
  12: [
    {
      themeTitle: 'The December-Crunch Week',
      subject: '5 dinners for the busiest, most expensive month of the year',
      intro: 'Between concerts, shopping, and parties, dinner needs to be cheap and automatic.',
      dinners: [
        { name: 'Slow-cooker pot roast', note: 'Comes home to a hero’s welcome' },
        { name: '15-minute lo mein', note: 'Faster than the takeout line' },
        { name: 'Baked rigatoni', note: 'Doubles for a party potluck' },
        { name: 'Rotisserie chicken ramen', note: 'Upgrade instant noodles, dramatically' },
        { name: 'Grilled cheese & soup night', note: 'Nobody has ever complained' },
      ],
      tip: { title: 'December’s hidden sales', body: 'Baking staples, butter, and roasts hit yearly lows in December. The freezer-friendly ones are worth buying double.' },
    },
    {
      themeTitle: 'The Week-Between Week',
      subject: 'That weird week between Christmas and New Year’s: dinner, solved',
      intro: 'Nobody knows what day it is. Cooking should match the energy: minimal.',
      dinners: [
        { name: 'Leftover-ham fried rice', note: 'The ham’s final form' },
        { name: 'Snack-board dinner', note: 'Holiday leftovers, arranged nicely' },
        { name: 'White bean & ham soup', note: 'The bone makes the broth' },
        { name: 'Frozen-pizza upgrade night', note: 'Add fresh toppings, feel fancy' },
        { name: 'New Year’s Eve appetizer dinner', note: 'Apps ARE the meal tonight' },
      ],
      tip: { title: 'Audit the freezer before January', body: 'Eat down the freezer this week — January’s reset goes better starting from a clean slate, and it’s a week of nearly free dinners.' },
    },
  ],
}

// Issue slot for a given date: month 1-12, first half (days 1-15) or second.
export function getIssueForDate(date: Date): NewsletterIssue {
  const month = date.getUTCMonth() + 1
  const half = date.getUTCDate() <= 15 ? 0 : 1
  return ISSUES[month][half]
}

export function getFeatureForDate(date: Date): FeatureSpotlight {
  // Rotate through features by issue number (2 issues/month)
  const issueIndex = (date.getUTCMonth() + 1) * 2 + (date.getUTCDate() <= 15 ? 0 : 1)
  return FEATURES[issueIndex % FEATURES.length]
}

// Biweekly gate: send only on even ISO week numbers.
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function isSendWeek(date: Date): boolean {
  return isoWeek(date) % 2 === 0
}
