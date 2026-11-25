# DinnerDrop competitor review (Nov 25, 2026)

**Review only.** Nothing live changed: no code, ads, emails, texts or data. Nothing was merged or deployed. This file and the screenshots sit on branch `research/competitor-review-2026-11`.

**How it was done.** Competitor sites, help pages, app stores, the Meta Ad Library and news were read on Nov 25. DinnerDrop was read in code (commit dcbdc10, the live commit) and on a Vercel preview of that same commit. Tracker tags were blocked in the test browser (160 blocked calls across two runs), and no form was submitted anywhere. Screenshots are in [competitor-screens/](competitor-screens/).

**What to trust.**
- Every fact has a source link or a file path. Anything not confirmed is marked UNVERIFIED.
- No competitor account was created. The helpers stopped at each signup screen. So "steps and minutes to first list" for competitors are estimates from their public screens and help pages.
- Scores from simulated people are marked SIMULATED. They are not customers and don't predict real rates.
- Google PageSpeed was over its daily quota, so speed numbers are lab estimates from local Chrome runs.
- Firecrawl ran out of credits partway, and Reddit blocked all reading. Reddit threads are not covered.


## Summary

1. **The market moved this fall.** Ollie shut down Nov 6 and Mealime Oct 21. Instacart (Clementine, Sep 9), Walmart (Sparky meal features, Oct 30) and Kroger (AI assistant, Jul 28) now plan meals for free inside their own carts. A planner that only hands a list to a store is now competing with the store itself.
2. **DinnerDrop still wins on the page.** In a SIMULATED 8-person panel it averaged 6.8 against eMeals 4.8, Plan to Eat 4.7 and Samsung Food 3.7. It is also faster on phones than most rivals. Trust is still its weakest score.
3. **The gap is in the first five minutes and in week two.** Most "ideas already raised" are built: shared-ingredient dinners, "Repeat last week", favorites, a partner invite, a weekly plan email, a Walmart cart. Several sit where a new family never meets them.
4. **Biggest week-one lesson:** the retailers' planners end at a cart that is already signed in. DinnerDrop's ends at an Instacart button that 90 families saw and none tapped (Nov 22 data). Find out why first. eMeals also asks how and where you shop before anything else; DinnerDrop asks on screen 8 of 9, and families who skip ahead never answer.
5. **Biggest week-two lesson:** the weekly message has to reach every family who has sent once, on their own day. DinnerDrop's Saturday email already has a one-tap cart, but the shop-day message only reaches families who answered the shop screen.
6. **Trust gap:** the DinnerDrop iPhone app has 0 ratings. Rivals show 4.6 to 4.9 stars from thousands. Nothing in the app asks for a rating.
7. **Safety gap found while testing:** the Meta pixel and the server-side Meta events fire on Vercel previews too. A test signup on a preview would count as a real signup.


## 1. Past findings: still true?

| Past finding | Now (Nov 25) | Source |
|---|---|---|
| Mealime shut down Oct 21; now "Meals Hub" in Albertsons/Safeway apps | Still true. Meals Hub is free, Albertsons stores only, servings fixed at 2/4/6. | [mealime.com/closing](https://www.mealime.com/closing); [Plan to Eat review of Meals Hub](https://www.plantoeat.com/blog/2026/09/meals-hub-review-pros-and-cons/) |
| eMeals $4.99/mo annual, 14-day trial, Walmart/Kroger/Instacart/Amazon Fresh | Still true ($59.99/yr). The store list is longer: also Albertsons, Safeway, H-E-B, Shipt. The 3-month price shows three ways ($29.99 App Store, $35.99 and $37.50 web). A card is likely needed for the trial (UNVERIFIED first-hand). | [emeals.com](https://emeals.com/); [eMeals cost](https://support.emeals.com/portal/en/kb/articles/emeals-cost) |
| Samsung Food free tier, Food+ $6.99/mo | Still true; $59.99/yr; 7-day trial through the app stores. No iPhone update since May 11. | [App Store](https://apps.apple.com/us/app/id1133637674) |
| Ollie "still sells meal planning by text" (Nov 22 panel note) | **No longer true.** Ollie shut down Nov 6. Its site still loads and still shows "Trusted by 90,000+ families". | [ollie.ai/farewell](https://ollie.ai/farewell/); [TechCrunch, Oct 30](https://techcrunch.com/2026/10/30/ollie-a-privacy-focused-ai-assistant-is-shutting-down/) |
| Idea: dinners that share ingredients | **Built.** | `lib/overlap.ts`; shared items shown while picking, `app/(app)/dashboard/page.tsx` L104-110 |
| Idea: "repeat last week" | **Built.** "Repeat last week" is on the dashboard. The Saturday email and reorder text already carry a one-tap cart for the new week. | `lib/repeat-plan.ts`; `dashboard/page.tsx` L816-825; `lib/plan-ready-email.ts` L44 |
| Idea: Walmart and Amazon carts | Walmart **built** (Free). Amazon Fresh **not built** (dead code only). | `lib/walmart.ts`; `lib/affiliate-links.ts` L12-14 |
| Idea: shared household list | **Built** (free partner invite; partner sees plan and list). Not offered in setup. | `app/api/household/invite/route.ts`; `lib/household.ts` |
| Idea: weekly "plan is ready" nudge | **Built.** Saturday auto-plan plus plan-ready email are on. The per-family Sunday Drop waits on an `app_kv` switch. No phone push. | `lib/reminders.ts` L182-224; `lib/sunday-drop.ts` |


## 2. Side-by-side table

Minutes to first list for competitors are estimates (no accounts made). Mobile score is a reviewer score from screenshots, not a measurement. Speed is a lab estimate (Lighthouse-style curves, local Chrome, mobile). Ratings are iOS unless noted.

| | Price | Trial | Card for trial | Steps / minutes to first list | Stores the list reaches | Week-two nudges | Mobile score /10 | Mobile speed (est.) | SEO strength | Meta ads now | App rating |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **DinnerDrop** | Free $0; Family $4.99/mo or $39/yr | 14 days of Family | **No** | Email + 9 skippable screens + pick + send. Fastest: 5 taps + email, 1-2 min. Full setup 3-5 min. | Instacart (any store on it), Walmart; Kroger on Family; text/email/print | Saturday auto-plan + plan-ready email; shop-day nudge (only if set in setup); day 1/3/7 emails; texts on Family | 6 (/start) | 81 (/start), 83 (/) | Low-Med | 3 angles (512, vote, texting) | **0 ratings** (iOS 1.0, Nov 14); no Android app |
| eMeals | $59.99/yr; 3-mo $29.99-$37.50 | 14 days (7-day variant in code) | Likely yes (UNVERIFIED) | ~10 quiz taps, account, payment; ~8-12 min to cart | Walmart, Kroger family, Instacart, Amazon Fresh, Albertsons, Safeway, H-E-B, Shipt | New menus every Wednesday; menu email on a day you pick | 6 | 58 | High | **~210**: cheaper than meal kits, one-click Walmart, mom creators, before/after | 4.6 (52.8K); Android 3.8 |
| Plan to Eat | $5.95/mo or $49/yr; 50% off Nov 27-30 | 14 days | No | Bring your own recipes; ~10-20 min | Walmart, Kroger, Instacart, Amazon Fresh, Albertsons, Safeway (appears to use eMeals' grocery partner, medium confidence) | Save week as a menu, swap week forward, staples, household sharing | 5 | 84 | High | 1: annual sale | 4.8 (6.1K) |
| Samsung Food | Free; Food+ $6.99/mo or $59.99/yr | 7 days (Food+) | Free: no; Food+: yes | Sample plan and list maker before signup; ~3-6 min | "23 retailers", US list UNVERIFIED | Food+ weekly plans, reusable plans, shared lists | 7 | 97 | High | 0 | 4.8 (6.5K); no update since May 11 |
| AnyList | Free; Complete $9.99/yr, household $14.99/yr | None | No | App only; list in ~2 min; meal calendar is paid | Instacart, Walmart, Kroger family, Safeway, Albertsons, Amazon Fresh, H-E-B (free tier) | Live shared list, favorites, widgets, calendar sync | 7 | 79 | Low-Med | 0 | 4.9 (81.7K) |
| Paprika | Free (50 recipes); Premium $14.99/yr | 7 days | Yes | Recipe manager; ~10-20 min | None found | Reusable menus, calendar feeds, email 3 days before charge | 6 | 85 | Low-Med | 0 | 4.9 (54.7K); many 1-star reviews since going subscription on Nov 6 |
| Cozi | Free; Gold $39/yr; Max $79/yr | 14 days Gold | UNVERIFIED | 1-screen signup; meals typed by hand; 5-15 min | None (email/text list) | Sunday weekly agenda email, shared list, calendar | 8 | 90 | Med-High | ~6 app-install ads | 4.8 (404K) |
| Prepear | Free; Gold $119.99/yr | 14 days | Likely (UNVERIFIED) | Save recipes or Gold plan; 3-20 min | Walmart | Gold creator plans | 7 | 49 | Med | 0 | 4.4 (503) |
| $5 Meal Plan | $5/mo | 14 days | Likely (UNVERIFIED) | ~10-field checkout before anything; 3-5 min | None | New plan and list emailed weekly | 4 | 69 | Low | 0 | No app |
| Meals Hub (Albertsons) | Free | n/a | No | Inside Safeway/Albertsons app; 3-5 min | Albertsons stores only | Weekly "build your plan" nudge | n/a (pages didn't render) | n/a | n/a | 0 | Host app 4.8 (1.3M) |
| Instacart (Clementine AI) | Free + fees; Instacart+ $9.99/mo | Instacart+ 14 days | Yes to order | Recipe → "Add # ingredients to cart" 1 tap; prompt → cart 3-5 taps | 80,000 stores | "Order my usuals", buy it again | 7 | 71 (content page) | High | 0 meal-plan ads | 4.8 (4.9M) |
| Walmart (Sparky) | Free; Walmart+ $98/yr | Walmart+ 30 days | Yes (W+) | Prompt → priced recipes → cart, 3-4 taps | Walmart | Restocks your go-tos, Reorder | 5 | blocked | n/a | 0 meal-plan ads | 4.8 (19.2M) |
| Kroger AI assistant (new) | Free | n/a | No | "5 meals, family of 4, under $100" → cart, under 2 min | Kroger family | Favorites, past purchases, coupons | 3 | n/a | n/a | n/a | n/a |
| Instacart in ChatGPT (new) | Free + fees | n/a | Pay in chat | Prompt → cart → checkout, under 3 min | Instacart | None of its own | n/a | n/a | n/a | n/a | n/a |
| Ollie | **Closed Nov 6** | | | | | | 5 | 32 | | 0 | Listing gone |

Sources: [competitors A](#sources), [competitors B](#sources), ratings from Apple's lookup API and Google Play pages, ads from the Meta Ad Library. Our row: `app/start/StartClient.tsx`, `components/Walkthrough.tsx`, `lib/reminders.ts`, `lib/shop-day.ts`, Apple lookup for app id 6824634810.


## 3. What they do better

Impact = expected effect on week-one (W1) or week-two (W2) sends. It is a judgment, not a measurement.

| # | What they do better | Evidence | Do we have it? | Effort | Impact |
|---|---|---|---|---|---|
| 1 | **Ask how and where you shop first.** eMeals' quiz asks "How do you prefer to shop?" and "Where do you grocery shop?" before the account screen, then tells in-store shoppers pickup saves "2 hours per week". | [emeals-signup-7-390](competitor-screens/emeals-signup-7-390.png), [emeals-signup-8-390](competitor-screens/emeals-signup-8-390.png) | Partly. The question is screen 8 of 9 (`components/Walkthrough.tsx` L403-427). Families who skip ahead keep the default store and get no shop day (`lib/settings.ts` L189; `lib/shop-day.ts` L47-51). Real skip rates are in the `walkthrough_step` events since Nov 21. | S | W1 high |
| 2 | **"Order my usuals" in one tap.** Clementine "order my usuals"; Sparky "restocks your go-tos"; Plan to Eat "Save as a Menu" and swap a week forward. | [TechCrunch](https://techcrunch.com/2026/09/09/instacart-launches-an-ai-grocery-shopping-assistant-called-clementine/), [walmart.com/cp/sparky](https://www.walmart.com/cp/sparky/5291783), Plan to Eat help pages | Mostly. The Saturday email has a one-tap cart for the new week ("Send my groceries to Instacart", `lib/plan-ready-email.ts` L44), and so does the reorder text (`lib/reorder.ts`). "Repeat last week" itself is dashboard-only (`dashboard/page.tsx` L816-825). 0 of 25 week-one senders used the existing links, so the gap is elsewhere. | S | W2 low until action 1 is done |
| 3 | **A weekly drop on a day the family picked.** eMeals posts new menus every Wednesday and emails them on your chosen day. $5 Meal Plan and Cozi email weekly. | support.emeals.com; [5dollarmealplan.com/join-mh-short](https://5dollarmealplan.com/join-mh-short/); [cozi.com](https://cozi.com/?p=38728) | Mostly. Plan-ready email is on (`lib/reminders.ts` L182-224). The shop-day nudge only reaches families who answered the shop screen (`lib/shop-day.ts` L46-51). Sunday Drop waits on `app_kv`. | S | W2 med-high |
| 4 | **Show value before asking for anything.** Samsung Food shows a sample week and a link-to-list tool with no account. eMeals runs its whole quiz before the account. Kroger plans a week from one sentence. | [samsungfood-home-390](competitor-screens/samsungfood-home-390.png), [emeals-signup-1-390](competitor-screens/emeals-signup-1-390.png), [ClickOnDetroit](https://www.clickondetroit.com/live-in-the-d/2026/08/25/krogers-new-ai-shopping-assistant-helps-ease-the-back-to-school-rush/) | No, but the parts exist. A no-account demo of setup runs at `/preview/onboarding` (`Walkthrough` `demo` prop), and answers already persist in the browser for 14 days (`Walkthrough.tsx` L122-158). | M | W1 high (needs a test) |
| 5 | **Star ratings everywhere.** 4.6-4.9 from 6K to 404K ratings on every rival homepage and listing. | Ratings table, [reviews section](#5-what-customers-say) | **No.** iOS app: 0 ratings (Apple lookup, id 6824634810). No review prompt in code (no `requestReview` anywhere). | S | W1 med (trust) |
| 6 | **The shared list is the habit.** AnyList and Cozi keep families weekly through a live shared list. Reviews: "Easy for the whole family!", "It's great we can both see it". | [anylist-home-390](competitor-screens/anylist-home-390.png); App Store review feeds | Yes, hidden. The app invite sits only in Settings (`app/(app)/settings/page.tsx` L258) and needs an account; a join-by-text link exists (`app/go/family/[code]`). Nothing offers either after a send. | S | W2 med |
| 7 | **One question per screen, payoff halfway.** eMeals auto-advances, puts "No preference" first, and shows a reward screen mid-quiz. | [emeals-signup-5-390](competitor-screens/emeals-signup-5-390.png), [emeals-signup-8-390](competitor-screens/emeals-signup-8-390.png) | No. Screen 2 asks names, adult/kid and a phone; phone again on screen 9; 15 style chips; "Gluten-free" twice; no dinner shown until the end. | S-M | W1 med |
| 8 | **Food first on the phone screen.** Cozi: one button, one proof row. eMeals and Prepear: big food photos. | [cozi-home-390](competitor-screens/cozi-home-390.png), [prepear-home-390](competitor-screens/prepear-home-390.png) | No. /start shows ~70 words and "free / no card" 4 times before any dinner; the app pictures have ~5px text. | S | W1 low-med |
| 9 | **One ad angle, one landing page.** eMeals runs ~210 Meta ads and sends each angle to its own page (tired-of-meal-kits, stress-free, Walmart discount, quiz). Angles: cheaper than a meal kit, real moms on camera, before/after, $10 off a first Walmart order. | [ads-emeals-1](competitor-screens/ads-emeals-1.png), [ads-emeals-2](competitor-screens/ads-emeals-2.png); Meta Ad Library | Partly. /start swaps the headline for 3 angles (`StartClient.tsx` L48-87). No meal-kit angle, no person on camera. | M | W1 med (better-matched signups) |
| 10 | **Phone push.** Meals Hub nudges inside the Safeway app; AnyList has widgets. | Plan to Eat's Meals Hub review; AnyList features page | No. Push plugin installed, never registered (`lib/native.ts`); only an opt-in local "Tonight" reminder. | M | W2 med (iPhone only) |
| 11 | **Android apps.** eMeals, Cozi, AnyList, Samsung Food and Paprika are all on Google Play. | Play listings | No. Android build exists, not published (`apps/mobile/README.md`). | M | Low-med |
| 12 | **Show up in AI answers and roundups.** eMeals came up in 5 of 10 buyer searches, Plan to Eat 4, DinnerDrop 0 (proxy test, not ChatGPT itself). eMeals has 7 store pages and 27 diet pages. | speed-seo notes; [emeals sitemap](https://emeals.com/emeals_sitemap.xml) | Partly. Good schema and 1,535 URLs; no `llms.txt`; /pricing redirects to /start; dinnerdrop.app to www is a 307; one store page (/walmart). | S-M | Acquisition, not sends |
| 13 | **Price-per-serving and a budget in one sentence.** Sparky shows "$7.12 per serving"; Kroger takes "under $100". | [walmart.com/cp/sparky](https://www.walmart.com/cp/sparky/5291783) | Yes. Budget bar, store compare and split (`components/StoreCompare.tsx`). We just don't lead with it. | S (copy) | W1 low |


## 4. What we do better (keep it, push it harder)

1. **Free planning and a free cart, no card.** Every advertiser with an offer sells a paid trial or a discount. eMeals' reviews are full of billing complaints ("I have been unknowingly billed for 3 years", Trustpilot, Nov 17). Ad line idea: "No card. We email you before anything costs money." `lib/trial-ending.ts` already sends that email.
2. **The family votes by text, and anyone can text an item onto the list.** No live ad from any rival uses this, and Ollie, the only text-first family planner, is gone. This lane is open.
3. **One plan, any store.** The retailers' new AI planners each work for one chain. DinnerDrop sends to Instacart (any store on it) and Walmart, and can price the list at several stores and split it (`components/StorePriceExample.tsx`). No rival ad says this.
4. **A week built to a budget you set.** eMeals talks about savings; nobody else lets you set a number.
5. **Speed.** /start is about 81 on mobile (lab estimate) vs eMeals 58 and Prepear 49. Nothing on the page jumps while it loads (layout shift score 0).
6. **A specific moment** ("It's 5:12pm") beats the generic "what's for dinner?" every rival uses.
7. **Honest pages.** A founder note instead of fake reviews, "We don't deliver food", and real screenshots. Keep these. The SIMULATED panel still picked DinnerDrop 6 of 8 times.
8. **Picky kids and per-person no-lists, on both plans.** Only one eMeals Google ad mentions picky kids.
9. **Search content depth.** 1,462 recipe pages with Recipe schema; bigger than any rival sitemap except Plan to Eat's blog and Instacart's content site.


## 5. What customers say

From about 300 recent app reviews and 15 Trustpilot reviews (Reddit was blocked). Quotes are under 15 words with links in the source notes.

**Why families stop in week one or two:**
- The plan doesn't fit the family: "Not a plan; just random recipes" (eMeals iOS).
- Week two doesn't arrive: "it never updates for me from week to week" (eMeals Play).
- The list reaches the store wrong: "doesnt add all my ingredients to the shopping list" (eMeals Play).
- Work first, then a charge: "says 14 day free trial, but charges you instantly" (eMeals Play).

**What keeps them weekly:** less new planning each week, the whole household using it, the cart filling itself, food the family likes, and a fixed place in the routine ("It's in my dock").

**Last 30 days:** Ollie closed (Nov 6). Paprika went subscription (Nov 6) and got a wave of 1-star reviews. eMeals' Android app crashed for much of November (fix Nov 18). Plan to Eat's only sale of the year runs Nov 27-30. Samsung Food hasn't shipped an iPhone update since May.


## 6. Top 10 actions, in order

Ranked by expected effect on first and second-week sends. The adversarial review (section 9) changed this list: it found that the weekly one-tap cart already exists and added actions 1 and 3. Effort: S = under a day, M = a few days.

### 1. Find out why nobody taps the Instacart button (S, week one)
In the Nov 22 data, 107 families opened their list and 90 of them saw the Instacart button. None tapped it. That is the sharpest leak, and the retailers' own planners have no such step: their cart is already signed in. Walk the hand-off on a real phone from a fresh account: what Instacart shows (sign-in wall, store picker, prices), and how long it takes. Then check the existing click and follow-up events (`followup_shop` by kind) to see where families stop. Fix what that shows before building anything else on the send.
Files: `components/InstacartButton.tsx`, `app/api/instacart/route.ts`, `app/api/go/shop/route.ts`, `lib/followup.ts`.
**Sarah: spend one session diagnosing the zero-tap Instacart button before other send changes? (yes/no)**

### 2. Shorter setup, with "How do you shop, and where?" first (S, week one)
eMeals asks how and where you shop before anything else. DinnerDrop asks on screen 8 of 9 (`components/Walkthrough.tsx` L403-427). A family that skips ahead never answers it: the store stays at the default 'instacart' (`lib/settings.ts` L189) and no shop day is saved, so the shop-day message never reaches them (`lib/shop-day.ts` L47-51, L69-73). Move the shop screen to first. Fold in the rough spots: phone asked on screens 2 and 9 (ask once); "Gluten-free" twice; "everyone" chips running under the footer; the unclear "Your weekly mix" screen; "Almost done" on the last screen; the $150 default budget that surprised both testers; grey text at 4.46:1 (`#5e7867` to `#587161` passes 4.5:1). Before and after, read the real `walkthrough_step` and `quick_setup_done` events (recorded since Nov 21) to see where families skip.
**Sarah: move the shop question to the first setup screen and make these fixes? (yes/no)**

### 3. After the first plan, land on the grocery list (S, week one)
350 of 519 families never opened their list (Nov 22). Families who pick from options go straight to the list (`app/(app)/dashboard/page.tsx` L584). Families who skip setup or get the starter week land on the dashboard and must find "Build my grocery list" (L962-968). Send everyone to the list with the store button on top. Instacart, Walmart and Kroger all end their planning at a filled cart.
**Sarah: send every family straight to the grocery list after their first plan? (yes/no)**

### 4. Test "plan first, email second" on /start (M, week one)
Run setup on /start with no account, show the family's 5 dinners and list, then ask "Where should we send your list?" for the email. Samsung Food and eMeals both show value before the account. The parts exist: a no-account demo at `/preview/onboarding` and setup answers saved in the browser for 14 days (`Walkthrough.tsx` L122-158). Risks: fewer emails captured, and Meta's signup event fires later in the funnel. Judge it only by first sends per ad dollar, as a 50/50 test on one ad angle. Needs action 9 first.
**Sarah: build a 50/50 test of setup before email? (yes/no)**

### 5. A weekly shop-day message for families who have sent once (S, week two)
eMeals emails each user's menu on a day the user picks; $5 Meal Plan and Cozi send a weekly email. DinnerDrop's Saturday plan-ready email already carries a one-tap cart ("Send my groceries to Instacart", `lib/plan-ready-email.ts` L44), and so does the reorder text (`lib/reorder.ts`). But the shop-day message only reaches families who answered the shop screen. For families who have sent at least once and have no shop day, use the weekday of that send. Leave never-sent families under the Nov 22 fatigue rule. Watch STOP replies and unsubscribes (texting STOP was 11% before).
**Sarah: give families who have sent a default shop day from their first send? (yes/no)**

### 6. After the first send, invite the family to join by text (S, week two)
Shared use was the strongest keep-using-it theme in rival reviews (AnyList, Cozi, Plan to Eat). DinnerDrop's app invite sits only in Settings (`app/(app)/settings/page.tsx` L258-267) and needs the partner to make an account. The family can already join by text (`app/go/family/[code]`). Offer that link once, right after the first send.
**Sarah: show a "add your family by text" link after the first send? (yes/no)**

### 7. Lead the /start phone screen with dinners (S, week one)
About 70 words and "free / no card" 4 times come before any dinner, and the app pictures have ~5px text. Use a headline, one line and one button, then real dinner photos (the three from setup screen 1) and one readable phone screen of the list. Say "free, no card" once. Hide the sticky button until the main one scrolls away.
File: `app/start/StartClient.tsx`.
**Sarah: redesign the /start first screen around dinner photos? (yes/no)**

### 8. Two new ad tests, judged by cost per first send (M, week one)
(a) "Cheaper than a meal kit": eMeals' biggest angle, which we never use. Give it its own /start variant. (b) A real parent on camera using the family vote: our open lane now that Ollie is gone. Keep "one plan, any store" in the copy; the retailers' new AI planners each work for one chain.
**Sarah: run these two ad tests? (yes/no)**

### 9. Keep test traffic out of Meta and the numbers (S, enables 4)
Load the Meta, Google, Pinterest and Reddit tags only on www.dinnerdrop.app (`app/layout.tsx` L111-162 has no host check). Send server-side Meta events only from production (`lib/meta-capi.ts` checks only that a token exists). Add an `is_test` flag that daily stats and the pixels skip (`app/api/admin/daily-stats/route.ts` has no internal-account filter). Today a signup on a preview sends a real CompleteRegistration and likely creates a real account in the live database.
**Sarah: turn off ad tags and Meta events on previews, and add a test-account flag? (yes/no)**

### 10. Ask for an App Store rating after a family's first send (S, trust)
The app has 0 ratings; rivals show 4.6-4.9. Nothing in the code asks for one. Ask in the iPhone app once a family has sent a list. Most signups come from web ads, so stars will build slowly. Don't show a rating on /start until real ones exist.
**Sarah: add a one-time rating prompt in the iPhone app after the first send? (yes/no)**

### Below the top 10
- A "same dinners as last week" choice in the Saturday email. The one-tap cart is already there; only the repeat option is missing. Do it after action 1 explains why no one taps.
- Phone push for the weekly plan in the iPhone app (M, week two, iPhone only).
- Publish the Android app (M; needs a 14-day, 12-tester closed test first; impact unclear).
- `llms.txt`, a 308 redirect from dinnerdrop.app to www, /instacart and /kroger pages, and pitches to the roundups AI answers cite (S-M; brings visitors, doesn't change sends).
- Fix stale copy: /walmart "Four taps... under a minute" (`app/walmart/page.tsx` L46); the dinners FAQ leaves out the free Walmart cart (`app/(marketing)/dinners/[topic]/page.tsx` L143); /ollie-alternatives lists 4 eMeals grocers vs 7 on /vs/emeals; the "over 500" code comment above the "700 families" line (`StartClient.tsx` L116).
- Load the Pinterest and Reddit tags after the page is interactive. /start's mobile blocking time is ~590 ms, the one weak speed number.
- `/signup`: add the logo and `autocomplete="email"`; add a `<main>` landmark; give the setup progress dots a role.

## 7. Simulated panel (SIMULATED)

8 people from the Nov 22 panel (3 skeptics, 2 who never used a meal app) compared /start with eMeals, Plan to Eat and Samsung Food on phone screenshots, then walked our 9 setup screens.

| Site | Average of 5 scores (SIMULATED) | Nov 22 (n=48) |
|---|---|---|
| DinnerDrop | 6.8 (±0.6) | 6.9 |
| eMeals | 4.8 (±1.0) | 4.6 |
| Plan to Eat | 4.7 (±0.6) | 5.5 |
| Samsung Food | 3.7 (±0.4) | not tested |

- DinnerDrop won 6 of 8 picks. Both losses went to eMeals, from people already paying for it.
- Trust: Plan to Eat 6.5 vs DinnerDrop 6.0.
- Setup: 3 of 8 finished all 9 screens, 5 skipped ahead, none quit. 4 of the 5 skipped before the budget and shop screens.
- Top reasons they held back: no ratings; Kroger and per-person safe foods on Family only; no food photos; no "switching from eMeals" line; missing words (celiac, EBT, 20-minute).

**Caution.** One model wrote all 8 voices and knew DinnerDrop was the client. These same people's Nov 22 objections already shaped today's copy. Simulated people read more carefully than real ad traffic. With 8 people, gaps under about 1 point are noise.


## 8. Marketing council (SIMULATED)

> Simulated council: each take is built from the advisor's published frameworks, not their actual review.

Seated: Claude Hopkins, Alex Hormozi, April Dunford, and Rory Sutherland as the dissenter.

- **Hopkins (test everything):** Judge every change by cost per first send, never signups. The no-account setup is his "sample": let the product prove itself. He'd fix the test tracking (action 9) before running anything.
- **Hormozi (value equation):** The weak terms are effort and time delay. An email, 9 screens, then a hand-off to another site. Cut effort at both ends: the store question first (action 2) and the list right after the plan (action 3).
- **Dunford (alternatives):** The real alternatives are now the store's own free AI planner and "whatever we ate last week". Don't sell "AI plans your week"; the stores do that free. Sell what they can't: one plan for any store, the family vote, a household that remembers everyone's no-list.
- **Sutherland (dissent):** The problem may be how sending feels. Tapping "Shop ingredients" feels like committing $150. Frame it as "save my list to Instacart", and treat "text me the list" as a full win. Effort can build commitment: don't cut setup to nothing.

**Where they disagree.** Hormozi wants setup shorter; Sutherland thinks finishing setup builds intent. The data can settle it: compare send rates for families who finished setup vs those who skipped, from `activation_events`. Hopkins and Dunford split on tactics vs positioning; the plan does both, small tests first.

**Chair's ranking:** actions 1 to 3 first (small, aimed straight at the first send), then 9 so 4 can be tested cleanly, then 5 and 6 for week two. Tripwire: if STOP replies or unsubscribes rise after action 5, pull it back (texting STOP was 11% before).


## 9. Adversarial review

Codex couldn't run: the account rejected both its default model and gpt-5.4-mini. A separate Claude reviewer, which hadn't seen my reasoning, checked the draft top 15 against the code and argued against each finding. It changed the ranking.

What it caught (all re-checked in code before changing the report):
- **A wrong finding.** The draft said no email or text offers a one-tap reorder. The Saturday plan-ready email has "Send my groceries to Instacart" (`lib/plan-ready-email.ts` L44, wired in `lib/reminders.ts` L211). The reorder text and Sunday Drop have one too, and commit d32a9d4 (Nov 22) widened the reorder text. 0 of 25 week-one senders used these links, so adding another link won't fix week two. Dropped from the top 10.
- **A wrong detail.** Families who skip setup don't get "I order online" saved. Nothing is saved: the store stays at the default and no shop day exists, so the shop-day message never reaches them (`lib/settings.ts` L189, `lib/shop-day.ts` L47-51, L69-73).
- **A risk in the shop-day idea.** Applying a default shop day to everyone would undo the Nov 22 fatigue rule for never-sent families. It's now limited to families who have sent once (action 5).
- **Two missing findings.** The zero-tap Instacart button (action 1), and families landing on the dashboard instead of the list after their first plan (action 3, `dashboard/page.tsx` L962-968).
- **Use real data before simulated data.** `walkthrough_step` and `quick_setup_done` events (since Nov 21) show real setup skips. The draft leaned on the SIMULATED "5 of 8".
- **Dropped from the top 10:** retailer AI planners (a strategy point, kept in sections 2 and 4), Android (impact unclear), AI search (brings visitors, doesn't change sends).
- **Small corrections:** /start has 3 angle variants plus a default; "519 signups" in the code comment is a 30-day subset, not a contradiction of "700 families". The Conversions API token may not be set anywhere yet (an open item from Nov 22), so server events may not fire on any host today.


## 10. Other findings

- **Preview safety.** `app/layout.tsx` loads all ad tags on every host; `lib/meta-capi.ts` has no environment check; `components/ConversionTracker.tsx` sends CompleteRegistration on `/dashboard?new=1`. Daily stats count test accounts. That's why this review didn't complete a signup anywhere (action 9).
- **Accessibility (preview, 390px).** No critical issues. Grey text is 4.46:1 against a 4.5:1 minimum on all 9 setup screens. Setup progress dots have a label but no role. No `<main>` on /, /signup or setup. Small tap targets: social icons 18px, "+ Add someone" 20px, header "Sign in" 20px.
- **Links.** 150 pages crawled on the preview: no broken internal links, no external 404s. Several blog posts hard-code full `https://www.dinnerdrop.app/` links.
- **Path timing.** /start to /signup is 1 tap. The full demo setup with defaults is 10 taps (about 45-90 seconds for a person). Skipping is 1 tap.
- **Our own ads already reach rival names.** The Google account gets small traffic on "emeals walmart", "emeals" and "ollie" terms (read-only check). The /ollie page already says Ollie closed.


## SKILLS USED

**Used (named in the prompt):**
- competitors: claim-audit rules; dated every fact; "not seen" is not "absent".
- competitor-profiling: per-competitor template; skipped its traffic phase (no SEO data source).
- reverse-engineer-marketing (quick mode): dated moves: Ollie closing, Plan to Eat's sale, eMeals' 7-day trial variant, Paprika going subscription.
- customer-research: churn and keep-using-it themes from ~300 app reviews and 15 Trustpilot reviews.
- aso: ratings, counts and update dates for every rival app; DinnerDrop iOS at 0 ratings.
- ads: angle-to-landing-page match; eMeals' one-page-per-angle setup.
- ad-creative: sorted rival hooks by type; found our unused angles (meal kit, real people).
- cro: hero and main-button review; only Plan to Eat shows price and no-card near its button.
- landing-page: "what is it, is it for me, what does it cost" test on every hero.
- copywriting: captured exact hero copy; "We Plan, They Shop, You Cook" is the most specific rival line.
- signup: field and sign-in-option counts; rivals offer Apple/Google/Facebook sign-in, we offer email only.
- onboarding: minimum path to value; the store question placement (action 2).
- retention: week-two hook inventory (weekly drop, chosen day, repeat, shared list, auto-plan).
- emails: eMeals' chosen-day menu email; Paprika's 3-day pre-charge email.
- pricing: category anchors ($10-15/yr list apps, $49-60/yr planners); annual-first framing everywhere.
- offers: only Plan to Eat has a guarantee (60 days) and a real, dated sale.
- paywalls: where each rival's paywall sits (eMeals before any access; AnyList at the meal calendar).
- marketing-psychology: endowed progress (eMeals' bar), real vs fake scarcity, card-up-front trial risk.
- seo-audit: 307 redirect, /pricing redirect, missing llms.txt.
- ai-seo: 0 of 10 buyer prompts (proxy test); roundups are the main lever.
- programmatic-seo: ranked page gaps (store pages, allergy pages, family-of-4 budget pages).
- playwright-cli: the CLI isn't installed, so all screenshots used the Playwright Node library (same engine).
- ui-radar: strong rival first screens have one button and one proof row; we have two buttons.
- impeccable (critique): /start sells "free" 4 times before showing a dinner; about 26/40.
- apple-design: buttons and frame take ~30% of each setup screen.
- web-design-guidelines: unreadable ~5px text in the /start app pictures; placeholder-only fields in setup.
- web-perf: lab speed runs; DinnerDrop's only weak metric is mobile blocking time.
- buyer-persona-generator: coverage check on the reused Nov 22 personas (skeptics and first-timers present).
- icp-website-review: head-to-head; DinnerDrop 6.8 vs eMeals 4.8 (SIMULATED).
- synthetic-user-feedback: 5 of 8 skipped setup early, none quit (SIMULATED).
- user-testing-agent (check-links, wcag-audit, critical-path, user-test): run on the preview with Playwright, since the skills need `claude --chrome`; results in section 10.
- marketing-council: ranked the top 10; Hormozi vs Sutherland split on setup length.
- writing-guidelines and humanizer: applied to this report.

**Added beyond the prompt:**
- searchfit-seo:ai-visibility: a scoring frame for the AI-search check (its ongoing tracking needs a paid account).
- verification-before-completion: checked every "do we have it?" claim against the code before calling anything a gap (this is how 4 of the 5 Oct 29 ideas turned out to be built).

**Skipped or blocked:**
- last30days: stopped at its first-run setup, which needs your own consent choices. Replaced with store data, the Ad Library and news search. X and Reddit not covered.
- codex /adversarial-review: failed twice. The Codex account rejects its default model and gpt-5.4-mini ("not supported when using Codex with a ChatGPT account"). An independent Claude reviewer did the same job (section 9).
- uizze-ui: not needed; ui-radar loaded.
- schema and site-architecture: structured data and sitemaps were read directly instead.
- seo-aeo-geo-ultimate: overlaps ai-seo; not run.
- sms: no rival SMS program to study now that Ollie is closed; our texts were covered in the Nov 22 week-two review.
- anti-ui-slop: optional, not run.
- Ahrefs, Semrush, Similarweb (marketing plugins): need authorization in /mcp, so no backlink or traffic data.
- nimble and hyper-marketing (Meta Ad Library): need authorization.
- Free competitor signups: allowed by the brief, but none were made. The helpers stopped at each account screen; several need an email link to finish.


## Sources

Working notes with every link are in the session scratchpad and summarized above. Key sources:
- Ollie closing: https://ollie.ai/farewell/ ; https://techcrunch.com/2026/10/30/ollie-a-privacy-focused-ai-assistant-is-shutting-down/
- Mealime closing: https://www.mealime.com/closing
- Instacart Clementine: https://techcrunch.com/2026/09/09/instacart-launches-an-ai-grocery-shopping-assistant-called-clementine/
- Walmart Sparky: https://www.walmart.com/cp/sparky/5291783 ; https://corporate.walmart.com/news/2026/10/sparky-shopping-assistant-expansion
- Kroger assistant: https://www.thekrogerco.com/ir-feed-item/kroger-helps-families-simplify-back-to-routine-season-with-fresh-convenient-meals-and-a-smarter-way-to-shop/
- Instacart in ChatGPT: https://openai.com/index/instacart-partnership/
- eMeals: https://emeals.com/ ; https://support.emeals.com/portal/en/kb/articles/emeals-cost ; App Store id575756462
- Plan to Eat sale ad: https://www.facebook.com/ads/library/?id=1677680937055846
- App ratings: Apple lookup API (https://itunes.apple.com/lookup?id=...), Google Play listing pages
- Review quotes: Apple review RSS feeds (https://itunes.apple.com/us/rss/customerreviews/page=1/id=<id>/sortby=mostrecent/json), Google Play review links, Trustpilot
- DinnerDrop data from earlier reviews: docs/REVIEW-2026-11-22.md (branch review/full-review-2026-11-22), docs/WATCH-PILOT-2026-11-22.md (branch research/watch-pilot-2026-11-22)
