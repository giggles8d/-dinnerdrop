# DinnerDrop simulated panel test (Nov 22, 2026)

**Review only.** No site code, content, database, ads or emails were changed. Nothing was merged or deployed. On every site we only loaded and scrolled pages: no form was filled or submitted, no account, trial or checkout was started, no zip code was entered. The live walk-throughs blocked ad and analytics tags in the test browser, so they sent nothing to DinnerDrop's Meta pixel.

**Every score and quote below is SIMULATED.** The 48 panelists are made-up people built from real public complaints; they are not customers. Nothing here predicts sign-up or paid rates.

Supporting files (all in `docs/`):
- Panels: `panels/panel-1-busy-working-parents.{json,md}`, `panels/panel-2-budget-families.{json,md}`, `panels/panel-3-households-with-a-complication.{json,md}`
- Each panelist's answers, one file per person: `panel-test-2026-11-22/responses/P1-01.json` … `P3-16.json`
- Live walk-throughs (5 plugin personas) and the A/B test vs eMeals: `panel-test-2026-11-22/walkthroughs-and-ab-test.md`
- Design critique: `panel-test-2026-11-22/impeccable-critique.md`
- Method, site order per person, competitor fact table, scoring script: `panel-test-2026-11-22/method/`
- Screenshots at 390x844: `panel-test-2026-11-22/screenshots/`

## How it was run

**Sites.** dinnerdrop.app (home `/`, pricing `/pricing`, which redirects to `/start`, and `/signup`, looked at only) against four competitors:

| Started from | Live? | Used | Why |
|---|---|---|---|
| Mealime | Shut down Oct 21, 2026 ([mealime.com/closing](https://www.mealime.com/closing); users sent to Meals Hub inside Albertsons apps) | **Ollie** ([family meal-planning page](https://www.ollie.ai/ai-meal-planning-for-families/)) | Closest live match: texts the family, plans the week, sends the list to Instacart, Walmart or Amazon Fresh. Samsung Food was considered and set aside (recipe saver first). |
| eMeals | Live | eMeals ([emeals.com](https://emeals.com/)) | Closest paid planner; sends lists to Walmart, Kroger, Instacart and others |
| Plan to Eat | Live | Plan to Eat ([plantoeat.com](https://www.plantoeat.com/)) | Live; recipe planner with grocery list |
| A meal kit | Live | HelloFresh ([hellofresh.com](https://www.hellofresh.com/)) | The service people confuse us with |

**Panels.** Three panels of 16 (48 people), built with `buyer-persona-generator` (B2B fields removed). Each panel has ages 24 to 66, households of 2 to 9, incomes from under $35k to over $150k, rural/suburban/urban, and low/medium/high tech comfort.

| Panel | Sceptics | Pay for a kit/app now | Never used one | Grounding |
|---|---|---|---|---|
| 1 Busy working parents | 6 | 4 | 7 | 14 sourced, 2 partly assumed |
| 2 Budget-watching families | 5 | 5 | 5 | 15 sourced, 1 partly assumed |
| 3 Households with a complication | 7 | 4 | 6 | 13 sourced, 3 partly assumed |

Sources are Reddit threads, App Store and Trustpilot reviews and parenting forums, listed per person in the panel files. Most quotes were taken from search-result excerpts rather than full pages; the panel files mark which.

**Runs.** Six batches of 8 people, each person written to their own file before the next started. Everyone saw identical captures of the five sites, in their own mixed order (DinnerDrop was shown 1st to 10 people, 2nd to 10, 3rd to 10, 4th to 9, 5th to 9). `icp-website-review` scorecard mode per site, then head-to-head mode. Separately, five `user-testing-agent` personas walked dinnerdrop.app live at 390x844 and ran `/ab-test` against eMeals.

**Read this with three cautions.**
1. **Client bias.** The people running the panels knew DinnerDrop was the client and were given a fuller description of it than of the competitors. Treat DinnerDrop's lead as softer than it looks; the reasons people held back are more useful than the win count.
2. **Careful readers.** Simulated panelists read the page. Real ad traffic skims. That matters most for the food-delivery question (section 3).
3. **Pages only.** Panelists judged what each page says, not how the products work. Ollie's page, for example, lost badly here, but it claims 90,000+ families.

**Order check.** DinnerDrop's average by position shown was 6.8 (1st), 7.3 (2nd), 7.0 (3rd), 7.1 (4th), 6.5 (5th): no strong order effect.

---

## 1. Score table (simulated)

Each cell: average (± spread as standard deviation, lowest-highest). Scale 1-10.

### Panel 1: Busy working parents (n=16)

| Site | Clarity | Trust | Value | Ease | Want to sign up | Average of 5 |
|---|---|---|---|---|---|---|
| **DinnerDrop** | 7.4 (±0.9, 5-9) | 6.3 (±0.9, 5-8) | 7.6 (±0.8, 6-9) | 7.2 (±1.3, 4-9) | 6.5 (±1.5, 4-9) | **7.0** (±1.0, 5-8.4) |
| eMeals | 5.2 (±0.7, 4-6) | 5.0 (±1.4, 2-7) | 4.2 (±1.0, 2-6) | 5.1 (±0.9, 3-7) | 3.4 (±1.4, 1-6) | 4.6 (±1.0, 2.8-6.2) |
| Plan to Eat | 7.2 (±0.8, 6-8) | **7.5** (±0.9, 6-9) | 4.4 (±1.3, 3-8) | 4.2 (±0.9, 3-6) | 3.2 (±1.9, 1-8) | 5.3 (±1.1, 3.8-7.8) |
| Ollie | 5.1 (±0.9, 3-6) | 4.2 (±1.7, 1-7) | 2.3 (±1.2, 1-6) | 5.5 (±1.2, 3-7) | 2.8 (±1.5, 1-6) | 4.0 (±1.2, 2-6.4) |
| HelloFresh | 5.5 (±0.6, 4-6) | 3.2 (±1.1, 1-5) | 1.9 (±0.7, 1-3) | 4.5 (±1.1, 2-6) | 1.6 (±0.5, 1-2) | 3.4 (±0.7, 2-4.2) |

### Panel 2: Budget-watching families (n=16)

| Site | Clarity | Trust | Value | Ease | Want to sign up | Average of 5 |
|---|---|---|---|---|---|---|
| **DinnerDrop** | 7.5 (±0.9, 5-8) | 6.2 (±0.7, 5-7) | 7.3 (±1.2, 4-9) | 6.8 (±1.4, 3-9) | 6.4 (±1.5, 3-8) | **6.8** (±1.0, 4-7.8) |
| eMeals | 5.9 (±0.5, 5-7) | 5.2 (±1.6, 1-8) | 4.2 (±1.3, 3-7) | 5.8 (±0.9, 4-8) | 3.4 (±1.7, 1-8) | 4.9 (±1.1, 3-7.6) |
| Plan to Eat | 6.9 (±0.7, 6-8) | **7.3** (±1.2, 4-9) | 4.2 (±1.6, 2-7) | 4.9 (±0.8, 3-6) | 3.7 (±1.8, 1-8) | 5.4 (±1.1, 3.4-7.6) |
| Ollie | 4.6 (±0.8, 3-6) | 4.2 (±1.3, 2-6) | 1.9 (±0.8, 1-4) | 4.9 (±1.3, 2-7) | 1.9 (±1.1, 1-5) | 3.5 (±0.9, 1.8-5.4) |
| HelloFresh | 4.1 (±0.8, 3-5) | 3.4 (±1.2, 1-5) | 1.8 (±0.8, 1-4) | 4.8 (±1.6, 2-7) | 1.4 (±0.7, 1-3) | 3.1 (±0.8, 1.8-4.4) |

### Panel 3: Households with a complication (n=16)

| Site | Clarity | Trust | Value | Ease | Want to sign up | Average of 5 |
|---|---|---|---|---|---|---|
| **DinnerDrop** | 7.4 (±0.7, 6-8) | 6.6 (±0.7, 5-8) | 7.2 (±1.0, 5-9) | 7.3 (±1.2, 4-8) | 6.3 (±1.4, 3-8) | **7.0** (±0.8, 5-8) |
| eMeals | 5.4 (±0.8, 4-6) | 4.8 (±1.1, 2-6) | 3.6 (±1.1, 2-6) | 4.9 (±1.0, 3-7) | 2.6 (±1.4, 1-6) | 4.2 (±0.9, 2.6-6.2) |
| Plan to Eat | **7.6** (±0.8, 6-9) | **7.2** (±1.0, 5-9) | 4.8 (±1.9, 2-9) | 5.6 (±1.2, 3-7) | 4.2 (±2.0, 2-9) | 5.9 (±1.3, 3.6-8.6) |
| Ollie | 4.9 (±0.9, 3-6) | 4.3 (±1.4, 2-6) | 2.5 (±0.8, 1-4) | 5.2 (±1.4, 2-7) | 2.2 (±1.1, 1-4) | 3.8 (±0.9, 1.8-5.4) |
| HelloFresh | 5.6 (±0.5, 5-6) | 2.8 (±1.1, 1-5) | 1.4 (±0.5, 1-2) | 4.5 (±0.9, 3-6) | 1.1 (±0.2, 1-2) | 3.1 (±0.5, 2.4-4.2) |

### All 48

| Site | Clarity | Trust | Value | Ease | Want to sign up | Average of 5 |
|---|---|---|---|---|---|---|
| **DinnerDrop** | 7.4 (±0.8, 5-9) | 6.4 (±0.8, 5-8) | 7.4 (±1.0, 4-9) | 7.1 (±1.3, 3-9) | 6.4 (±1.5, 3-9) | **6.9** (±0.9, 4-8.4) |
| eMeals | 5.5 (±0.7, 4-7) | 5.0 (±1.4, 1-8) | 4.0 (±1.2, 2-7) | 5.3 (±1.0, 3-8) | 3.1 (±1.5, 1-8) | 4.6 (±1.0, 2.6-7.6) |
| Plan to Eat | 7.2 (±0.8, 6-9) | **7.4** (±1.1, 4-9) | 4.5 (±1.6, 2-9) | 4.9 (±1.1, 3-7) | 3.7 (±2.0, 1-9) | 5.5 (±1.2, 3.4-8.6) |
| Ollie | 4.9 (±0.9, 3-6) | 4.2 (±1.5, 1-7) | 2.2 (±1.0, 1-6) | 5.2 (±1.3, 2-7) | 2.3 (±1.3, 1-6) | 3.8 (±1.0, 1.8-6.4) |
| HelloFresh | 5.1 (±0.9, 3-6) | 3.2 (±1.2, 1-5) | 1.7 (±0.7, 1-4) | 4.6 (±1.2, 2-7) | 1.3 (±0.6, 1-3) | 3.2 (±0.7, 1.8-4.4) |

### Other answers (all 48)

| Site | Would sign up: yes / maybe / no | Would pay per month: median (range) |
|---|---|---|
| DinnerDrop | 22 / 24 / 2 | $3.00 ($0-$10) |
| eMeals | 1 / 15 / 32 | $0 ($0-$5) |
| Plan to Eat | 6 / 17 / 25 | $0 ($0-$6) |
| Ollie | 0 / 11 / 37 | $0 ($0-$15) |
| HelloFresh | 0 / 0 / 48 | $0 ($0-$75) |

- DinnerDrop "would pay": 20 said $0, 14 said something under $4.99, 14 said $4.99 or more.
- Overall pick among the five: DinnerDrop 38, Plan to Eat 6, eMeals 3, Ollie 1 (Panel 1: DD 13; Panel 2: DD 13; Panel 3: DD 12).
- DinnerDrop head-to-head: beat HelloFresh 48-0, Ollie 47-1, eMeals 44-4, Plan to Eat 42-6.

### Where the spread is (who DinnerDrop loses)

| Group | DinnerDrop "want to sign up" |
|---|---|
| Not sceptics (30) | 7.0 |
| Sceptics (18) | 5.4 |
| High tech comfort (24) | 6.8 |
| Medium (17) | 6.6 |
| **Low tech comfort (7)** | **4.6** |
| Used a kit/app before (17) | 6.9 |
| Pay for one now (13) | 6.4 |
| Never used one (18) | 5.9 |

The lowest DinnerDrop scores were all low-tech or sceptical: Gloria (P2-04) 3, Miriam (P3-11, kosher) 3, Linda (P1-07) 4, Earl (P3-09) 4, Ben (P1-14, allergies) 4.

### The offer: "14 days of Family free, no card"
- Clear 32, partly clear 14, unclear 2.
- **10 of 48 got day 15 wrong.** Most expected "$4.99 starts unless I cancel" or "it stops working": Danielle P1-01, Linda P1-07, Carlos P1-11, Tasha P1-15, Gloria P2-04, Jasmine P2-05, Jose P2-09, Carol P2-14, Tamika P3-07, Earl P3-09. Seven of the ten are low or medium tech comfort.
- What confused them was two "frees" on one screen: "$0 forever" next to "14 days free" and "$4.99", plus "Already know you want to keep it? Add a card now. $0 today."
- The truth (they go back to the free plan; nothing is charged unless they added a card) is on the page. It sits lower down, in the FAQ.

---

## 2. Where competitors beat us, and where we beat them

### Plan to Eat: beats us on trust (29 of 48 scored its trust higher than ours)
What earned it: "4.8 on the App Store · 4.7 on Google Play", "customer-funded since 2008", a plain line that it never sells data or shows ads, and recipes the family has vetted themselves. All 6 of its head-to-head wins came from people who wanted control over the recipes or a stated business model.
- "Pricing page is the most honest of the bunch: $49 a year, no surprise renewals. But 'an app for do-ers' means I'm still doing it." (Marcus, P1-02)
- "Verified-by-me beats 'respected on every plan' with no explanation." (Ben, P1-14, tree-nut and egg allergies)
- "My 200 recipes live there; DinnerDrop doesn't say I can bring them." (Kevin, P2-06)
- "Plan to Eat explains its business model and data policy in one line; DinnerDrop wants family phone numbers without a word on privacy." (Derek, P2-12)
- "Plan to Eat lets me control every recipe; DinnerDrop picks for me without knowing kosher." (Miriam, P3-11)

Where we beat it: we pick the dinners, and we have a free plan. "DD picks the dinners, Plan to Eat makes me do it." (Danielle, P1-01). "Plan to Eat has no free plan." (Keisha, P1-03)

Note: DinnerDrop already imports recipes from a link, pasted text or a photo, and exports your data (`app/api/recipes/import/route.ts`, `app/api/export/route.ts`). The pages don't say so.

### eMeals: beats us on track record and named diet plans (4 head-to-head wins)
- "Copyright 2002, two million customers, Kroger right in the logo list, and a Quick and Healthy plan. This company isn't going anywhere." (Jamal, P1-06; he lost his planner when Mealime closed)
- "Credit where due: 'professional food team and registered dietitians' is the only recipe source named on any of these pages." (Ben, P1-14)
- "eMeals has a whole Gluten Free plan; DinnerDrop's billing is kinder but it hasn't shown me the gluten-free is checked." (Laura, P3-02, celiac daughter)
- Brittany (P2-01) stays with eMeals because it already fills her Walmart+ pickup cart.

Where we beat it: price shown, no card, and the day-15 rule. "eMeals hides the price, DinnerDrop says $0." (Keisha, P1-03). "'Cancel in one tap from Account, no calls.' Screenshotted. eMeals could never." (Jenna, P3-12). eMeals shows no price on its home page; its trial pre-authorizes a card and renews into $59.99 a year unless cancelled ([eMeals help](https://support.emeals.com/portal/en/kb/articles/why), [cost](https://support.emeals.com/portal/en/kb/articles/emeals-cost)). The live A/B test agreed: DinnerDrop won 3 measures to 1 and 4 of 5 personas; the boomer persona picked eMeals for its 20-year history and findable reviews.

### Ollie: beats us on "decides for me" and polish (1 win)
- "'Ollie takes over the decision itself.' Yes. That's the job. I'd pay for it, I just want one price, not message top-ups." (Rachel, P1-04, who picked Ollie: "DinnerDrop's hero is a kids' vote and an upstate store chart.")
- Jess, Amanda and Kayla called Ollie's page the most modern-looking.

Where we beat it: price. "$3.25 a month with Kroger beats $25 a month in metered messages without it." (Marcus, P1-02). Ollie's meal page says "1-month trial, prices in the app" while its [pricing page](https://www.ollie.ai/pricing/) lists $0 / $25 / $100 a month by message count; two panelists noticed.

### HelloFresh: beats us on nothing in this panel
48 of 48 knew it delivers food. Its "Open a box to reveal your offer" pop-up and the zip-code wall before any price drew the harshest comments. "my own walmart groceries for $64 beats a 40-minute box" (Danielle, P1-01). Price per serving is only behind a zip code; third-party figure: about $10.99-$12.49 per serving ([NerdWallet, Jul 2026](https://www.nerdwallet.com/finance/learn/how-much-does-hello-fresh-cost)).

### What we win on everywhere
- The plain "no card" sentence. "'Your free Family days need no card, so there is nothing to cancel.' That's the sentence eMeals and HelloFresh never wrote. Now show me outside reviews." (Sherry, P1-13)
- A priced sample week. "Five dinners for $64 and Aldi coming up cheapest? That's what I'm talking about." (Keisha, P2-13)
- Saying how we make money. "'Instacart pays us a small commission.' Well, at least they said it." (Amber, P2-10)
- Family voting, for households with kids old enough to text. "Kids reply with numbers, top five become the week ... That's an actual workflow, not more recipes." (Marcus, P1-02)

---

## 3. How many thought DinnerDrop delivers food

**After 5 seconds: 0 of 48 said yes, 1 was unsure, 47 said no.** Almost everyone pointed to the green line "We don't deliver food. We plan your week and send your grocery list." That line, added on Nov 22, works for people who read it.

- The one "unsure" was **Linda (P1-07, 66, low tech)**: she read "We don't deliver food" and then "puts the whole list in your Walmart cart" and asked whether Walmart brings it. Words like "cart" are the cause for low-tech visitors.
- In the **live walk-through**, the impulse-buyer persona (Ashley) **partly believed it**: she scanned "Dinner, handled." and "Powered by Instacart", skipped the green line, and thought the groceries "just come."
- The design review found the same cues on the first screen: the "Powered by Instacart" carrot badge is the first thing on both pages, the headlines ("Dinner, handled.", "Your week of family dinners") read like a meal kit, and the line that says we don't deliver is smaller, secondary text under the paragraph.

For comparison: 26 of 48 were unsure whether eMeals delivers food and 18 of 48 were unsure about Ollie.

**What to take from it:** the page is no longer the main cause for careful readers. Real sign-ups who thought we deliver food most likely skimmed, like Ashley, or came from an ad. That has to be checked against real data (section 5) before more page changes are made for this reason alone.

---

## 4. Top 10 changes for DinnerDrop, ranked by how many panelists they would move

"Would move" counts panelists who named the issue as what stopped them, what was missing, or the one fix they asked for (keyword-coded, then checked by hand; see `responses/`). All "after" copy is checked against what the app does today (file references given). Copy marked **[CHECK]** needs a fact confirmed before it goes live. No invented reviews, counts or savings.

### 1. Say exactly which diets and allergies are handled (22 of 48, including 13 of the 16 in Panel 3)
**Pages:** `/start` FAQ "What if my family is picky?"; home "What you get" card "Picky-eater friendly"; home "See a week" tabs.

Before (`/start` FAQ):
> Swap any dinner in one tap and DinnerDrop learns what you keep and what you skip. Dietary needs (gluten-free, dairy-free, vegetarian, nut allergies, and more) are respected on every plan.

After:
> **Which diets and allergies does it handle?**
> Pick any of these for the whole table: vegetarian, vegan, pescatarian, gluten-free, dairy-free, nut-free, low-carb, keto, paleo, low-sodium, diabetic-friendly, heart-healthy, halal and kosher-style. Then add each person's allergies: peanuts, tree nuts, dairy, eggs, gluten, soy, shellfish, fish or sesame. Every dinner's ingredients are checked against them before it reaches your week, and you can swap any dinner in one tap. Store products can change, so read the label before you cook or check out.

Why it's true: the 14 options are `DIETARY_OPTIONS` in `lib/settings.ts:240`; the 9 allergens are matched ingredient by ingredient in `lib/allergens.ts:24-100`, applied in `lib/recipe-library.ts:261`. Diets and allergies are not relaxed when the week runs short (only low-carb/keto/paleo are; `app/api/generate-plan/route.ts:416-421`).
- Do **not** say "kosher" (the option is "kosher-style"; nothing separates meat and dairy) or "celiac-safe" (no cross-contact check). Miriam (P3-11) and Laura (P3-02) would test exactly that.
- **Needs Sarah's decision first:** the home page lists "a profile for each person: allergies" under Family, but the code applies per-person allergies on every plan and keeps them after day 14 (`app/(app)/settings/page.tsx:478-536`, no plan check). Ben (P1-14), Amanda (P1-10) and Greg (P3-15) all asked whether allergies survive day 15. Either say "allergies work on the free plan" (true today) or gate them in code; the page and the app should match.

### 2. Say what happens on day 15 in one sentence, once (19 of 48; 10 got it wrong)
**Pages:** home strip under the hero buttons, `/start` strip and sticky bar, both pricing cards, `/signup`.

Before (home strip):
> Family texting free for 14 days, no card · Works with Instacart and Walmart (Kroger cart on Family) · Then $4.99/month, or keep the free plan

After:
> Free forever: weekly plans, the list and your cart. Family texting is free for your first 14 days. On day 15 you simply stay on Free. We don't have your card, so nothing is charged.

Before (Family pricing card footer, home and `/start`):
> Already know you want to keep it? Add a card now. $0 today.

After: remove from both acquisition pages (keep it inside Account). The design review flagged it as the low point of the page, and Lola (P3-16) and Jenna (P3-12) both raised it next to the offer.

Before (`/signup`):
> Free forever for planning and your Instacart or Walmart cart. Family texting is free for your first 14 days, no card.

After:
> Free forever for planning and your cart. Family texting is free for 14 days, then you stay on Free unless you choose to add a card.

Then cut the other repeats: the design review counted about 10 versions of the trial line across `/` and `/start`.

### 3. Make the Kroger path clear on the free plan (19 of 48)
**Pages:** home and `/start` strips; Family card line "Push straight to your Kroger cart"; FAQ.

Before:
> Works with Instacart (and every store on it) and Walmart, free forever · Kroger cart on Family

After:
> Free: your list goes to Instacart (pick any store on it near you) or Walmart. Family adds a direct Kroger cart that finds the Kroger-family stores near your ZIP.

**[CHECK]** before naming stores: the Kroger store finder lists stores by ZIP with no chain filter (`lib/kroger.ts:98-105`) and the code names no banners. Once it is confirmed which banners come back (people asked for King Soopers, Fred Meyer, Harris Teeter, Fry's, Food 4 Less and Ralphs; Kevin's Giant Eagle is not a Kroger store), add: "Works with King Soopers, Fred Meyer, … too." Only name banners that are confirmed.

### 4. Show it works for big families (13 of 48)
**Page:** home "See a week" (every card says "serves 4"); `/start` "How it works" step 1.

Before:
> Example weeks for a family of four, in the same format the planner gives you

After:
> Example weeks for a family of four. Set anywhere from 1 to 8 people and every recipe and the grocery list scale to your table.

Plus a "Family of 6" tab built from a real library week. Why it's true: household size 1-8 in Settings (`app/(app)/settings/page.tsx:453`), servings scale (`lib/recipe-library.ts:65-70`). **[CHECK]** the first-run walkthrough allows up to 10 (`components/Walkthrough.tsx:253`) while Settings stops at 8; fix the mismatch or say 8.

### 5. Lead the home page with the free result, not the paid vote (10 of 48, plus the design review and the walk-through)
**Page:** home first screen.

Before:
> [badges] Powered by Instacart · Your family votes on dinner by text
> **Dinner, handled.**
> DinnerDrop texts everyone in your house the week's dinner ideas. They reply with the numbers they want — no app for the kids, no group chat — and the winners become your week. Then one tap puts the whole list in your Instacart or Walmart cart.
> We don't deliver food. We plan your week and send your grocery list.

After:
> **Five weeknight dinners, planned. The grocery list, in your own cart.**
> We don't deliver food. DinnerDrop plans your week around your budget, then puts the whole list in your Instacart or Walmart cart in one tap. You check out there.
> Kids old enough to text? Family lets everyone vote on the week by text (free for 14 days).
> [Plan my week free] · [See a sample week]
> [Powered by Instacart badge moves below the buttons]

Why: Danielle, Rachel, Keisha, Jamal, Jenna and others have kids too young to text or a two-person house, and the vote is a paid feature after day 14. Moving "We don't deliver food" up beside the headline and the Instacart badge down also answers the impulse-buyer misread in section 3. Kayla (P1-16) and Jess (P1-12) also asked how a partner sees the week on Free; inviting a partner and sharing the week are free in code (`app/api/household/invite/route.ts`, `app/api/share-week/route.ts`), so add: "Invite your partner free."

### 6. Give the sample week grown-up and diet tabs (10 of 48)
**Page:** home "See a week". Tabs today: Kid-friendly, Under 20 minutes, Under $75, Gluten-free.

Before: tabs above. Quotes: "'Sheet Pan Chicken Tenders' on Monday is exactly the rut I'm trying to get my kids out of." (Jamal, P1-06). "'One safe thing on every plate' … Then Wednesday is 'Hidden Veggies' pasta." (Keisha, P3-01, ARFID son).

After: add **Vegetarian**, **Lighter / lower-carb** and **Family of 6** tabs, each a real week from the recipe library with real prices (not written for the page), and drop "Hidden Veggies" from the kid-friendly week's dinner name. Keep the kid-friendly week first: Brittany (P2-01), Tamika (P3-07) and Danielle (P1-01) liked it exactly as it is.

### 7. Put track record, recipe source and "bring your recipes" near the pricing (10 of 48; Plan to Eat out-scored us on trust with 29)
**Page:** `/start` under the pricing cards; home founder section.

Before: "Over 500 families have signed up for DinnerDrop" is the only proof; nothing says who writes the recipes or that you can import or export.

After:
> **What's behind it.** DinnerDrop is run by Sarah, a parent in upstate New York. Our recipe library is written with AI, and every dinner is checked against your family's diets and allergies before it reaches your week. Bring your own recipes from a link, pasted text or a photo, and download all your data any time from Settings. Instacart pays us a small commission when you shop through DinnerDrop; that keeps the free plan free. We never sell your data.

Why it's true: AI-written library (`lib/library-grower.ts:261`, `lib/claude.ts:10`), import (`app/api/recipes/import/route.ts:10-17`), export (`app/api/export/route.ts`), commission line already on the page, "We never sell phone numbers" in `app/privacy/page.tsx:62`. **[CHECK]** "we never sell your data" against the full privacy policy before using it; otherwise say "We never sell phone numbers." **Needs Sarah's OK** on saying "written with AI" (honest, and sceptics asked; some will not like it). Add an App Store rating only once one shows publicly (none found today); do not add reviews or star counts until they are real.

### 8. Tell in-store shoppers they can use it too (7 of 48)
**Page:** home "How the cart works" box; `/start` same box.

Before:
> How the cart works: DinnerDrop fills the cart in your own Instacart, Walmart or Kroger account. …

After (add one line at the start):
> Shop in the store? Print your list or email it to yourself, free. Family can also text it to you.

Why it's true: print (`app/(app)/grocery-list/page.tsx:533`, `app/(app)/plan/print`), email the list (Nov 22 build, `components/InStoreSend.tsx`); texting it is Family-only (`lib/list-link.ts:123`). Gloria (P2-04), Earl (P3-09), Amber (P2-10, Aldi in person) and Marcus (P2-03) all said every button assumes online ordering.

### 9. Let people reach a person (7 of 48)
**Pages:** home "Why I built DinnerDrop" letter; `/signup`.

Before: Sarah's email appears only on `/start` ("Write to her at sarah@dinnerdrop.app").

After (end of the founder letter on the home page, and under the sign-up button):
> Questions? Write to me at sarah@dinnerdrop.app. I answer every email myself.

**[CHECK]** "I answer every email myself" with Sarah; if not, use "Questions? Email sarah@dinnerdrop.app." No phone number exists, so don't add one.

### 10. Say what happens to family phone numbers (5 of 48)
**Page:** home and `/start` Family section, under "Everyone gets the ideas by text."

Before: nothing next to the texting feature; "Privacy" link in the footer only.

After:
> We only use family numbers for dinner texts, never sell them, and send each person up to 4 texts a week (you can change that). Anyone can reply STOP.

Why it's true: default cap 4 a week, adjustable 2-15 (`lib/settings.ts:172`, `app/(app)/settings/page.tsx:832`); STOP handled (`lib/texting.ts:278-282`); "We never sell phone numbers" (`app/privacy/page.tsx:62`).

### Also worth doing (fewer panelists, but cheap)
- **A Pricing link in the phone header.** Pricing is hidden on phones (`app/page.tsx:27-32`); the price sits about 11 screens down. All 5 live walk-through personas hit this.
- **EBT/SNAP FAQ (4 of 48).** "Can I pay with EBT/SNAP? DinnerDrop never takes payment. Walmart.com accepts SNAP EBT for eligible items in participating states, and so do many stores on Instacart; you choose EBT at their checkout." Sources: [Walmart help](https://www.walmart.com/help/article/how-to-shop-with-your-snap-ebt-card-at-walmart/bcbc8d5d0e2d4e4583965cb04d79afdb), [Instacart help](https://www.instacart.com/help/article/ebt-snap-payments).
- **Separate the weekly email from the Terms line on `/signup`** (3 of 48 plus the tech-sceptic walk-through). Today: "By creating an account you agree to our Terms and Privacy Policy. We'll send a weekly email with your dinners, an easy recipe and the occasional kitchen pick." (`app/(auth)/signup/page.tsx:226-228`).
- **`/signup` header:** add the logo and a link back; announce errors with `role="alert"`.
- **`/start` sticky bar:** show it only after the hero button scrolls away (today two identical buttons are on the first screen and the bar covers the app screenshots).
- **Plain words for low-tech visitors:** "Deduplicated grocery list" and "Pantry scan" lost Linda (P1-07): "Sarah, honey, write it like you're talking to your mama."
- **Android:** 4 panelists asked. The site correctly says Android is browser-only today; keep the "Add to Home Screen" line but move it lower.

No Amazon links are suggested anywhere in this report. If any are added later, they must follow the `dinnerdrop-amazon-links` rule: product links `https://www.amazon.com/dp/<ASIN>?tag=dinnerdrop-20`, never search links.

---

## 5. Check against real numbers before acting

These are simulated findings. Before spending build time, check each against real data. (Vercel Web Analytics and the Meta Conversions API token were still pending on Nov 22, so visit-level data may not exist yet.)

| Finding (simulated) | Check against | What would confirm it |
|---|---|---|
| Food-delivery confusion is low on the page (0 of 48) | Real texts and help emails saying "when does my food arrive", by sign-up source (`utm_content`), before vs after Nov 22 | Confusion drops after the Nov 22 line went live, and what's left comes from specific ads |
| 10 of 48 misread day 15 | First families to reach day 15 under the new rule (about Dec 6): add-card rate, help emails, unsubscribes | Questions like "will I be charged?" or drop-off right before day 15 |
| Median "would pay" was $3, and 14 of 48 said $4.99 or more | The 2 paying Family families; Stripe trial-to-paid after Dec 6 | Do not change the price on this panel alone (pricing is decided) |
| Diet/allergy detail is the top ask | Which diets and allergies real families set in Settings | Many households set any diet or allergy |
| Big families (5+) | Household size distribution in Supabase | A real share of households above 4 |
| Kroger on the free plan | Clicks on the Kroger button and Kroger-locked messages; Instacart store choice | Free families hitting the Family gate |
| In-store shoppers | Use of print and email-the-list (new Nov 22) vs cart sends | In-store sends are a real share of first sends |
| Low-tech and older visitors score lowest | Age of the Facebook audience actually reached | If few are over 55, items aimed at them (phone number, plainer words) rank lower |
| Ollie looks weak here | Ollie claims 90,000+ families; panel judged its page only | Don't read the panel as Ollie losing in the market |
| Plan to Eat trust lead | Whether DinnerDrop has an App Store rating to show | Add the rating only once it is real |

Also check on our own pages:
- **Blog post `hellofresh-alternative-cheaper` (`lib/blog-posts.ts:666`)** tells a first-person story ("we canceled HelloFresh … saving $280 a month"). If that is not Sarah's own family's experience, it is an invented testimonial and should come out.
- **`/about` says about 400 families** while other pages say over 500 (walk-through finding); make them match.
- **Fonts:** `tailwind.config.ts` names Playfair Display and DM Sans, but the phone screenshots look like Times/Arial fallbacks (design review). Unconfirmed.
- **Family texting phone clip** rendered as an empty thread in the captures (home and `/start`); check it loads on phones.
- `/vs/emeals` says eMeals has a "card-required trial": **confirmed** by eMeals' own help article on pre-authorization ([support.emeals.com](https://support.emeals.com/portal/en/kb/articles/why)).

---

## 6. Screenshots at phone size (390x844)

All in `docs/panel-test-2026-11-22/screenshots/`. `-first` is the first screen (the 5-second view); `-full` is the whole page.

| Site | Page | First screen | Full page |
|---|---|---|---|
| DinnerDrop | Home `/` | `dinnerdrop-home-390-first.png` | `dinnerdrop-home-390-full.png` |
| DinnerDrop | Pricing (`/pricing` → `/start`) | `dinnerdrop-pricing-390-first.png` | `dinnerdrop-pricing-390-full.png` |
| DinnerDrop | Sign-up (look only) | `dinnerdrop-signup-390-first.png` | `dinnerdrop-signup-390-full.png` |
| eMeals | Home | `emeals-home-390-first.png` | `emeals-home-390-full.png` |
| eMeals | Meal plans | `emeals-mealplans-390-first.png` | `emeals-mealplans-390-full.png` |
| eMeals | Help (cost) | `emeals-faq-390-first.png`, `emeals-cost-help-390-first.png` | `-full` versions |
| Plan to Eat | Home | `plantoeat-home-390-first.png` | `plantoeat-home-390-full.png` |
| Plan to Eat | Pricing | `plantoeat-pricing-390-first.png` | `plantoeat-pricing-390-full.png` |
| Ollie | Family meal planning | `ollie-mealplanning-390-first.png` | `ollie-mealplanning-390-full.png` |
| Ollie | Home, pricing | `ollie-home-390-first.png`, `ollie-pricing-390-first.png` | `-full` versions |
| HelloFresh | Home (offer pop-up) | `hellofresh-home-390-first.png` | `hellofresh-home-390-full.png` |
| HelloFresh | Plans (zip wall, not entered) | `hellofresh-plans-390-first.png` | `hellofresh-plans-390-full.png` |
| Mealime | Home and closing notice | `mealime-home-390-first.png`, `mealime-closing-390-first.png` | `-full` versions |
| Samsung Food | Home, Food+ (considered, not used) | `samsungfood-home-390-first.png`, `samsungfood-pricing-390-first.png` | `-full` versions |

Live walk-through and A/B screenshots: `walkthrough-<persona>-<n>.png` and `ab-emeals-<persona>-<n>.png` (41 files), listed in `walkthroughs-and-ab-test.md`.

---

## Skills used

| Skill | Used? | How |
|---|---|---|
| `buyer-persona-generator` | Used | Built the three 16-person panels, B2B fields removed |
| `icp-website-review` | Used | Scorecard mode per site, then head-to-head mode, by every batch (its five B2B dimensions replaced by the five measures asked for) |
| `synthetic-user-feedback` | Used | Live walk-throughs at 390x844 (purchase/message resonance mode) |
| `user-testing-agent:user-test` | Used | `distracted-parent`, `millennial-tech-skeptic`, `comparison-shopper`, `impulse-buyer`, `boomer-tech-friendly`, read-only, Playwright instead of `--chrome`; no forms, so no Stripe or form tests |
| `user-testing-agent:ab-test` | Used | dinnerdrop.app vs eMeals (the closest paid competitor) at phone size |
| `competitors` | Used | Live claims check of every competitor price and feature, with links (`method/competitor-facts.md`) |
| `cro` | Used | Page diagnosis and fix ranking |
| `copywriting` | Used | All after-copy (diagnosis: B, real voice present; claims checked against code) |
| `signup` | Used | `/signup` review (consent line, header, errors) |
| `pricing` | Used, partly | Presentation fixes only. Its advice to drop the free plan was not applied: the pricing decision is closed |
| `paywalls` | Used | Day-15 moment and the "Add a card now" line |
| `impeccable` | Used | `critique` with two isolated assessments (design review + detector). `init` skipped: no project files are changed in a review, so no PRODUCT.md was written |
| `dinnerdrop-amazon-links` | Used as a rule check | No Amazon links are suggested in this report |
