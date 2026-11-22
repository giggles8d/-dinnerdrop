# DinnerDrop simulated panel test: shared brief (Nov 22, 2026)

Repo: C:\Users\setzl\dinnerdrop (branch review/panel-test-2026-11-22). REVIEW ONLY.

## Hard rules (apply to every helper)
- Read-only on every website. Never submit a form, type into a form, create an account, start a trial, start a checkout, enter a zip code, or click "Start free"/"Sign up"/"Get started" buttons. Navigating and scrolling only. DinnerDrop's sign-up fires the live ad pixel, so a test sign-up corrupts real ad results.
- Do not change site code, the database, ads, emails, or anything live. Do not commit, merge, push or deploy (the lead does git).
- Simulated people are not real people. Every score is SIMULATED. Never predict sign-up or paid rates.
- No invented reviews, family counts, savings figures or testimonials. Quotes from real public reviews must carry their source URL; anything not sourced is labelled "assumed".
- Don't share the user's personal details with any outside service.

## What DinnerDrop is
dinnerdrop.app plans 5 weeknight dinners around family size, budget and diet, builds one grocery list, and puts it in the family's own Instacart or Walmart cart in one tap (Kroger cart on Family). It does NOT deliver food. Free plan: unlimited plans + one-tap cart, $0, no card. Family plan: $4.99/mo or $39/yr; adds texting the week's dinner ideas to everyone in the house (they vote by replying with numbers), per-person profiles (won't-eats, allergies), text-an-item-to-the-list, cook-night text reminders, Kroger cart. Every new family gets 14 days of Family free with no card; after day 14 they go back to Free unless they add a card. Founder: Sarah, a parent in upstate New York. "Over 500 families have signed up" is true. iPhone app exists.

## Sites in the test (all captured at 390x844 phone size)
- DD  = dinnerdrop.app (home /, pricing = /pricing which redirects to /start, sign-up /signup)
- EM  = eMeals (emeals.com): weekly meal plans, 15 food styles incl. Kid Friendly, sends list to Walmart, Kroger, Instacart, AmazonFresh, Albertsons, Safeway. "Try Free for 14 Days" (renews into a paid plan unless cancelled). No price on the home page; $59.99/year (shown as "as low as $4.99/mo") or $37.50 per 3 months (https://support.emeals.com/portal/en/kb/articles/emeals-cost).
- PTE = Plan to Eat (plantoeat.com): recipe saver + planner + grocery list with a "Deliver Groceries" button; 14-day free trial, no card; then $5.95/mo or $49/yr; 4.8 App Store / 4.7 Google Play shown.
- OL  = Ollie (ollie.ai/ai-meal-planning-for-families/): AI family meal planning by text, "Trusted by 90,000+ families", grocery list sent to Instacart, Walmart or Amazon Fresh. The brand home page is now a general "personal assistant for everyday life". Pricing: Free $0 (50 messages/month + 6/day), Everyday $25/month, Always-On $100/month (ollie.ai/pricing). Replaces Mealime, which shut down Oct 21, 2026 (mealime.com/closing, users sent to Meals Hub in Albertsons apps). Samsung Food was considered; Ollie is the closer match (texting, family, one-tap cart).
- HF  = HelloFresh (hellofresh.com): meal-kit delivery. Home opens with an "Open a box to reveal your offer" pop-up; "Free Breakfast for Life + 10 Free Meals" offer with long fine print; auto-renewing weekly; prices only after entering a zip code (not done: read-only). Third-party (NerdWallet, Jul 2026): about $10.99-$12.49 per serving, smallest box 2 meals for 2 at $49.96, shipping about $11.

## Captured files
Screenshots (phone size, first screen = what you see in 5 seconds; full = whole page):
C:\Users\setzl\dinnerdrop\docs\panel-test-2026-11-22\screenshots\<id>-390-first.png and <id>-390-full.png
Page text: C:\Users\setzl\AppData\Local\Temp\claude\892371aab147352f\b4d5bf10-12c9-4c08-9db3-94c4a01f3895\scratchpad\text\<id>.txt
ids: dinnerdrop-home, dinnerdrop-pricing, dinnerdrop-signup, emeals-home, emeals-mealplans, emeals-faq, plantoeat-home, plantoeat-pricing, ollie-mealplanning, ollie-home, ollie-pricing, samsungfood-home, samsungfood-pricing (not in test), hellofresh-home, hellofresh-plans (zip wall), mealime-home, mealime-closing, ollie-home, ollie-pricing.

## Known context from DinnerDrop's real data (for realism, do not quote as panel results)
Real customer texts/ads showed some sign-ups thought DinnerDrop delivers food. 2 paying Family customers. ~519 sign-ups in 30 days, most from Facebook ads.
