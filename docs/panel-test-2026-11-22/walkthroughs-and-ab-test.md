# Persona walk-throughs and A/B test: DinnerDrop vs eMeals (phone size)

Date: Sunday, November 22, 2026. Live production sites, read-only.

**Everything in this report is SIMULATED.** The five people below are synthetic personas from the user-testing-agent plugin, not real customers. Their reactions, quotes, timestamps and scores are a model's prediction of how such a person might behave. Nothing here predicts sign-up or paid rates. No reviews, testimonials, family counts or savings figures were invented; the only outside opinions cited are search results, with their URLs.

---

## 1. Method and rules followed

**Skills used, in order:** `synthetic-user-feedback` (purchase / message resonance mode, 390x844), `user-testing-agent:user-test` (five personas, mobile), `user-testing-agent:ab-test` (A = dinnerdrop.app control, B = emeals.com).

**Browser:** the plugin expects `claude --chrome`. Instead, Playwright (Chromium) from Node, run from the repo folder, with scripts kept in the session scratchpad. Context: viewport 390x844, `isMobile: true`, `hasTouch: true`, iPhone Safari 18.1 user agent, en-US. Each persona and each site got a fresh browser context (no shared cookies). Screenshots are viewport captures, 390 px wide.

**Personas:** loaded from the plugin's `personas/<id>.json`. Named variants: Kristin (distracted-parent, female), Jasmine (millennial-tech-skeptic, female), Linda (comparison-shopper, female), Ashley (impulse-buyer, female), Susan (boomer-tech-friendly, female). Their timing traits set the simulated clock: each step adds the persona's `clickDelay` plus the words on screen x a skim factor (fast 0.35, scanning 0.2, medium 0.6, thorough 0.8) / `baseReadingWPM`. Kristin's `interruptionFrequency` (30 s) adds an interruption. Patience and frustration thresholds decided when a persona gives up or stops hunting.

**Task (same for everyone):** find out what this is, whether it delivers food, what it costs and what happens after the free 14 days, then decide whether you would sign up.

**Hard rules followed:**
- Nothing was typed into any field, no form was submitted, no zip entered, no account, trial or checkout started.
- No "Start free / Sign up / Get started / Try free" button was tapped. `/signup` (DinnerDrop) was loaded directly by URL to look at it. On eMeals, the trial page (`/account/start.php`, which redirects to `/account/quiz/`) was loaded by URL to look, and its "Get Started" button was not tapped.
- Allowed actions only: page loads, scrolling, the "See a sample week" in-page anchor, the eMeals hamburger menu, FAQ / Help accordions, and ordinary links (About, Help, Privacy, DinnerDrop vs eMeals, eMeals support articles, eMeals reviews/contact pages, the App Store listing).
- **Ad and analytics tags were blocked** in the test browser (Meta/Facebook, Google Analytics/Tag Manager, TikTok, Pinterest, Bing, Clarity, Vercel insights and similar), so these visits did not add PageViews or events to DinnerDrop's (or eMeals') ad data.
- No site code, database, ads or emails were changed; nothing was committed.
- Web searches were run with the WebSearch tool where a persona would Google something. Results are reported as returned.

**Severity scale:** Critical = stops the task. Major = causes real doubt, extra hunting or a wrong belief. Minor = small friction.

---

## 2. Per-persona walk-throughs on dinnerdrop.app (Variant A)

### 2.1 Kristin, distracted parent (35, phone in one hand, interrupted every 30-60 s)

Simulated session 8:47 PM, about 1 min 40 s including one interruption.

> **[8:47:00 PM]** Opened from a Facebook ad (assumed). "Powered by Instacart"... "Dinner, handled." Okay so is this dinner showing up at my door? *(screenshot 1)*
>
> **[8:47:15]** Oh wait, the bold green line: "We don't deliver food. We plan your week and send your grocery list." Got it. It makes the list and puts it in my Instacart. Fine.
>
> **[8:47:27]** *scrolls fast* Texts the whole family the dinner ideas, they vote by number. My 9-year-old would love that, my husband would ignore it.
>
> **[8:47:27-8:47:47]** *interrupted, kid needs a snack* ... *returns* Where was I? Page is in the same spot, good.
>
> **[8:47:59]** Sample week: chicken tenders, taco night, $64 for five dinners for four. That's real food my kids eat. *(screenshot 2)*
>
> **[8:48:10]** How much is this? There's no menu up top, just Sign in and Start free. Keep scrolling... and scrolling. *(confusion: no pricing link)*
>
> **[8:48:22]** Found it way down. Free is $0. Family is $4.99 a month, first 14 days free, no card, and after that it just goes back to free unless I add a card. Okay, that I can live with. *(screenshot 3)*
>
> **[8:48:37]** Three buttons say three different things (Start free / Try Family free / Start free with 14 days of Family). Is that two different sign-ups? *taps the top one* Just an email. No password. I can do that before the next meltdown. *(screenshot 4, looked only)*

- **Did she think it delivers food?** No, after a two-second wrong first guess. "Dinner, handled." plus the Instacart badge read like delivery; the bold "We don't deliver food" line right under it fixed it.
- **Issues:** Critical 0. Major 1: no menu or Pricing link on mobile; price is about screen 11 of 16 (y ≈ 9,500 of a 13,670 px page). Minor 2: very long home page for a two-minute attention window; three different CTA labels for one email form.
- **First impression:** 7/10 (simulated).
- **Would sign up?** Yes, for the Free plan (simulated). "Email only, no card, done in a minute" is exactly her bar.
- **Final word (simulated):** "Took me forever to find the price, but once I did, no card means I can't get burned."

### 2.2 Jasmine, millennial tech-skeptic (31, marketing, spots dark patterns)

Simulated session 9:12 PM, about 3 min on site plus 2 searches.

> **[9:12:00 PM]** "Powered by Instacart" badge. Is this Instacart's thing or someone using their logo? *(screenshot 1)*
>
> **[9:12:37]** "Built on the Instacart Developer Platform." Okay, that's a real API program, not an endorsement. Respect for wording it carefully.
>
> **[9:12:55]** Store comparison: "Cheapest store saved $66." Here we go... *(screenshot 2)*
>
> **[9:13:11]** ...the fine print says it's the founder's own list from today, Aldi's total leaves out 6 items it couldn't match, and it's an estimate. So the $66 gap is partly Aldi missing six things. At least they say so.
>
> **[9:13:26]** FAQ: "Instacart pays us a small commission when you shop through DinnerDrop." That's the business model, said out loud. I like that. "Will I be charged by surprise? No... free Family days need no card." Good, nothing to cancel. *(screenshot 3)*
>
> **[9:14:01]** About page: "Over 400 families have signed up." The home page said over 500. Which is it? *(screenshot 4, confusion)*
>
> **[9:14:36]** Sign-up: just email, no password, no card. But the small print: signing up also gets me "a weekly email with your dinners, an easy recipe and the occasional kitchen pick." No checkbox. That's marketing email bundled into account creation. *(screenshot 5, frustration trigger)*
>
> **[9:14:53]** Privacy policy: lists "Name, email address, and password" as collected. You just told me there's no password. Ad tags from Google, Meta, Pinterest and Reddit are disclosed, and they say meal plans and diet info never go to ad platforms. Account deletion is self-serve. Fine.
>
> **[9:15:10]** Let me see what Reddit thinks.

**Searches she ran (real results):**
- "DinnerDrop reviews": nothing about DinnerDrop. Every result was for **Dinnerly**, a meal-kit delivery company (e.g. [highya.com/dinnerly-reviews](https://highya.com/dinnerly-reviews), [Trustpilot dinnerly.com](https://nz.trustpilot.com/review/dinnerly.com), [Taste of Home Dinnerly review](https://www.tasteofhome.com/article/dinnerly-reviews/)).
- "dinnerdrop.app reddit": no mention of dinnerdrop.app anywhere; results were unrelated Product Hunt dinner apps (e.g. [producthunt.com/products/dinnerfy](https://producthunt.com/products/dinnerfy)).

> **[9:15:40]** Zero reviews anywhere, and Google thinks I mean a meal kit. New and small, not shady. I'd use my spare email for the free plan. Not paying until I've used it a month.

- **Did she think it delivers food?** No. She read the line and the FAQ.
- **Issues:** Critical 0. Major 2: marketing email bundled into sign-up with no separate opt-in; no third-party reviews anywhere (search returns Dinnerly). Minor 3: 500 vs 400 families; privacy policy says "password" for a passwordless sign-up; the $66 store-saving headline is from one list with 6 Aldi items unpriced (caveated honestly).
- **First impression:** 7/10 (simulated).
- **Would sign up?** Yes for Free, with a throwaway email; no to Family for now (simulated).
- **Final word (simulated):** "Most honest pricing I've seen on a subscription site. Fix the email opt-in and the numbers that don't match."

### 2.3 Linda, comparison shopper (52, family CFO, reads everything)

Simulated session 7:30 PM, about 8 min 30 s plus 2 searches.

> **[7:30:00 PM]** I typed dinnerdrop.app/pricing. It took me to /start, a different page that opens with "Over 500 families have signed up" and "planned free." Where's the price? *(screenshot 1)*
>
> **[7:30:44]** Two screens down: Free $0 forever; Family $4.99 a month or $39 a year. The year is $3.25 a month. "First 14 days free, no card." *(screenshot 2)*
>
> **[7:32:18]** Store comparison: Aldi $68 vs Price Chopper $135. But Aldi had 6 store-brand swaps not counted in its total. So the real gap is smaller than $66. They do say that, to their credit. *(screenshot 3, confusion)*
>
> **[7:34:42]** Home page sample week: $64 estimated for five dinners for four, 29 items. That's believable for chicken tenders and pasta. *(screenshot 4)*
>
> **[7:35:29]** Footer link "DinnerDrop vs eMeals" — a comparison table, written by DinnerDrop, so grain of salt. It says eMeals needs a card for the trial, no month-to-month, $59.99 a year. And it lists when to choose eMeals instead (Amazon Fresh, Android app, breakfast and lunch plans). A company telling me when to pick the competitor? That's rare. *(screenshots 5, 6)*
>
> **[7:38:34]** Help, "Billing, trial and cancelling": same story everywhere. Free forever; Family free 14 days, no card; then $4.99 or $39, email 3 days before, cancel from Account. Consistent. *(screenshot 7)*

**Searches she ran (real results):**
- "DinnerDrop vs eMeals": no independent comparison exists. Results were eMeals reviews and a CB Insights page comparing eMeals to The Dinner Daily ([cbinsights.com](https://www.cbinsights.com/compare/emeals-vs-the-dinner-daily), [healthline.com/nutrition/emeals-review](https://www.healthline.com:443/nutrition/emeals-review)). DinnerDrop's own /vs/emeals page did not appear.
- "DinnerDrop reviews": Dinnerly meal-kit reviews only (see 2.2).

- **Did she think it delivers food?** No. /start says it in the hero, and both FAQs say it.
- **Issues:** Critical 0. Major 1: no independent reviews or comparisons exist; only DinnerDrop's own claims. Minor 2: /pricing lands on a different landing page with the price two screens down; the $66 store-savings headline overstates the gap because Aldi's 6 unmatched items aren't in its total (disclosed).
- **First impression:** 8/10 (simulated).
- **Would sign up?** Yes, Free now; will decide on the $39 year after the 14 days (simulated).
- **Final word (simulated):** "Every page tells me the same price and the same rule. I just wish someone other than DinnerDrop had written about it."

### 2.4 Ashley, impulse buyer (24, scans, decides in under 30 seconds)

Simulated session 10:05 PM, 22 seconds.

> **[10:05:00 PM]** Ooh, "Dinner, handled." and Instacart. So I pick dinners and the groceries just come? Yes please. *(screenshot 1)*
>
> **[10:05:06]** *taps See a sample week* Taco night, meatballs, English muffin pizzas. Cute. *(screenshot 2)*
>
> **[10:05:14]** *goes for Start free* Just email? No password, no card? Love. No Apple sign-in though, ugh, I have to type my email. *(screenshot 3, looked only)*
>
> **[10:05:22]** Doing it.

- **Did she think it delivers food?** **Partly yes.** She scanned headline, badges and button, skipped the paragraph and the green line, and walked away believing the groceries "just come." What actually happens (she reviews an Instacart or Walmart cart, picks a store, pays the store and its fees) never reached her. This is the persona most likely to turn into a confused customer.
- **What it costs / after 14 days:** she knows "free" and "no card" (sign-up page). She never saw $4.99.
- **Issues:** Critical 0. Major 1: hero ("Dinner, handled." + "Powered by Instacart") reads as delivery to a scanner; the correction is in body copy she skipped, and the sign-up page doesn't repeat it. Minor 1: no Apple/Google sign-in.
- **First impression:** 8/10 (simulated).
- **Would sign up?** Yes, on the spot (simulated).
- **Final word (simulated):** "Easiest sign-up ever. Wait, I still have to check out on Instacart?"

### 2.5 Susan, boomer tech-friendly (64, Facebook and Pinterest, likes apps, reads About pages)

Simulated session Sunday 10:20 AM, about 6 min plus 2 searches.

> **[10:20:00 AM]** Alright, let's see. Where's the menu? Every site has three lines up in the corner. Here it's just "Sign in" and "Start free." *(screenshot 1, confusion)*
>
> **[10:21:48]** How it works: tell it about the family, get five dinners, one tap and it's in your Instacart cart. I use Instacart for Wegmans. Okay.
>
> **[10:22:23]** "Hi, I'm Sarah." A mom who built this. That's nice. Free forever, Family $4.99 a month. *(screenshot 2)*
>
> **[10:23:27]** The questions section answers my first question first: "Does DinnerDrop deliver food? No." Good. "Will I be charged by surprise? No." Good. *(screenshot 3)*
>
> **[10:24:03]** About page reads honestly. *(screenshot 4)* Is there a phone number? No, just an email and a "Write to Sarah" box.
>
> **[10:25:18]** Help, "Billing, trial and cancelling": clear. *(screenshot 5)*
>
> **[10:25:53]** There's an iPhone app. I prefer apps. App Store listing: free, Food & Drink, but "This app hasn't received enough ratings or reviews to display an overview." *(screenshot 6)*

**Searches she ran (real results):**
- "is DinnerDrop app legit": no results for DinnerDrop; similarly named apps only (Dinnerly, Meal Drop, DinnerStar), e.g. [justuseapp Dinnerly reviews](https://justuseapp.com/en/app/1415694682/dinnerly-meal-kit/reviews), [Meal Drop App Store](https://apps.apple.com/mx/app/meal-drop/id6751924080).
- "DinnerDrop" meal planner app: no listing named DinnerDrop came up; other meal planners did (e.g. [DinnerBrain](https://apps.apple.com/app/id6748664644)).

- **Did she think it delivers food?** No. The FAQ's first question settled it.
- **Issues:** Critical 0. Major 2: no visible menu or navigation on mobile; no reviews anywhere (App Store has too few ratings; Google returns other apps). Minor 1: no phone number.
- **First impression:** 7/10 (simulated).
- **Would sign up?** Probably, through the iPhone app, after asking a friend (simulated).
- **Final word (simulated):** "Seems like a nice lady with an honest little app. I'd like to see what other people say first."

---

## 3. Multi-persona comparison (dinnerdrop.app)

| Persona | Info found (of 4) | Thinks it delivers food? | Critical | Major | Minor | Confusion events | Frustration triggers | Simulated time | Would sign up? (simulated) |
|---|---|---|---|---|---|---|---|---|---|
| Kristin (distracted-parent) | 4/4 | No (brief wrong first guess) | 0 | 1 | 2 | 2 | 1 | 1:40 | Yes, Free |
| Jasmine (millennial-tech-skeptic) | 4/4 | No | 0 | 2 | 3 | 2 | 2 | 3:10 + search | Yes, Free (throwaway email); not Family yet |
| Linda (comparison-shopper) | 4/4 | No | 0 | 1 | 2 | 1 | 1 | 8:34 + search | Yes, Free; decide Family later |
| Ashley (impulse-buyer) | 2/4 | **Partly yes** | 0 | 1 | 1 | 1 | 1 | 0:22 | Yes, immediately |
| Susan (boomer-tech-friendly) | 4/4 | No | 0 | 2 | 1 | 2 | 2 | 6:00 + search | Probably, via iPhone app |

"Info found" = what it is, whether it delivers food, what it costs, what happens after 14 days.

**Found by several personas**
- No mobile menu or Pricing link (Kristin, Susan; Linda bypassed it by typing /pricing). Price is about 11 screens down the home page.
- No independent proof: zero search results for DinnerDrop; "DinnerDrop reviews" returns Dinnerly, a meal-kit delivery brand; the App Store has too few ratings to show (Jasmine, Linda, Susan).
- The delivery question: careful readers got it right from the green line and the FAQ; the scanner (Ashley) did not, and the fast skimmer (Kristin) needed a second look.

**What worked for everyone:** no card anywhere; the after-14-days rule ("you go back to Free unless you add a card") is stated the same way on home, /start, Help and /vs/emeals; email-only sign-up; the sample week with dollar figures; the commission disclosure.

**Persona-specific:** Jasmine: bundled marketing email, 500 vs 400 families, "password" in the privacy policy. Linda: $66 savings headline vs 6 unpriced Aldi items. Susan: no phone number. Ashley: no Apple/Google sign-in.

---

## 4. A/B test: dinnerdrop.app (A, control) vs emeals.com (B)

Same five personas, same task adapted to each site, 390x844, fresh context per site.

### 4.1 What the eMeals visits found (Variant B)

- **Home** (`/`): first screen is a video hero, "Less Stress, More Dinners", "Watch Video". No sign-up button and no price in the first screen; "Try Free for 14 Days" first appears after "How It Works". Hamburger menu: Try Free for 14-Days, Meal Plans, How it Works, Login. No Pricing item.
- **Delivery:** "How It Works" step 2 says shop yourself or send your list to grocers (Walmart, Amazon, Kroger, Instacart). The first FAQ answers it directly. Nobody thought eMeals delivers food.
- **Price:** only inside the 5th home-page FAQ accordion ("as low as $4.99 a month for a 12-month subscription", 3-month for $37.50). The support site shows dinner at $59.99 a year, with two articles giving different 3-month prices ($37.50 and $35.99) and different bundle prices ($56.48 and $39.98).
- **After 14 days:** not on the home page. Support articles say to cancel before your renewal date to avoid charges, and that eMeals pre-authorizes your card at trial sign-up, possibly up to the full subscription amount. So the trial needs a card and turns into a paid plan.
- **Sign-up (looked only):** `/account/start.php` redirects to a quiz screen ("The #1 Place to Plan & Shop", "Get Started"), not an email box.
- **Social proof:** "More than two million customers", named customer quotes, founder quote, in business since 2002. Contact page is a form, no phone number.
- **Search (Jasmine, "eMeals reviews cancel free trial charged"):** many Trustpilot pages (about 3,000 reviews). Several reviewers there say they were charged for a yearly renewal after the trial without a reminder or had trouble getting refunds; a few say support fixed charges quickly. Trustpilot does not verify these claims. Source: [Trustpilot eMeals](https://se.trustpilot.com/review/www.emeals.com), [page 2](https://nz.trustpilot.com/review/www.emeals.com?page=2).

### 4.2 Per-persona A/B narration excerpts (Variant B)

- **Kristin [8:52 PM]** "Nice video, but what is it? ... Okay, meal plans and a shopping list. Price? ... Price is hidden in the questions at the bottom. Four ninety-nine a month, but only if I buy a year? What happens after 14 days? Don't know. Kid's crying. Done." (0:54, gave up on the after-14-days question)
- **Jasmine [9:20 PM]** "'$4.99 a month' is really $59.99 up front. The help center says they pre-authorize my card, maybe for the full amount, and I have to cancel before renewal. Classic forced continuity. And their own help pages don't agree on the 3-month price."
- **Linda [7:45 PM]** "Three prices for the same 3-month plan across their home page and two help articles. $59.99 a year vs DinnerDrop's $39 and DinnerDrop's free plan. eMeals has 15 plans and 25,000 recipes, which is real depth, but I can't compare what I can't pin down." (5:16)
- **Ashley [10:08 PM]** "Pretty food, love the video. Where's the button? *menu* Try Free. *it's a quiz with Get Started*... more steps. Ugh. The other one was just my email." (0:17)
- **Susan [10:30 AM]** "Now this has a menu where I expect it. Since 2002, two million families, I've heard of them. The price is in the questions at the bottom. No phone number either, just a form. But they've been around."

### 4.3 Results matrix (simulated)

| Persona | A info found | B info found | A issues (C/M/m) | B issues (C/M/m) | A confusion | B confusion | A triggers | B triggers | Metric winner | Stated pick |
|---|---|---|---|---|---|---|---|---|---|---|
| Kristin | 4/4 | 3/4 | 0/1/2 | 0/1/2 | 2 | 2 | 1 | 2 | **A** | **A** |
| Jasmine | 4/4 | 4/4 | 0/2/3 | 0/3/1 | 2 | 1 | 2 | 3 | Tie | **A** |
| Linda | 4/4 | 4/4 | 0/1/2 | 0/3/1 | 1 | 2 | 1 | 2 | **A** | **A** |
| Ashley | 2/4 | 2/4 | 0/1/1 | 0/1/1 | 1 | 2 | 1 | 2 | **A** | **A** |
| Susan | 4/4 | 3/4 | 0/2/1 | 0/1/2 | 2 | 1 | 2 | 2 | A (tiebreak on info found) | **B** |

Plugin winner logic per persona: fewer issues per severity, more info found, fewer confusion events, fewer frustration triggers; tie broken by task completion.

**Aggregate (simulated), all five personas**

| Metric | Variant A (DinnerDrop) | Variant B (eMeals) | Winner |
|---|---|---|---|
| Info found (of 20) | 18 | 16 | A |
| Critical issues | 0 | 0 | Tie |
| Major issues | 7 | 9 | A |
| Minor issues | 9 | 7 | B |
| Confusion events | 8 | 8 | Tie |
| Frustration triggers | 7 | 11 | A |

**Overall winner: Variant A (DinnerDrop)**, 3 metrics to 1. Stated preference: A 4 of 5, B 1 of 5. DinnerDrop wins on price clarity, no card, and a plain after-14-days rule. eMeals wins on trust signals (menu, 20+ years, two million customers, findable reviews) and has fewer small rough edges.

**Issues in both variants:** no Pricing link in the mobile navigation; no phone number; the price is far down the home page (DinnerDrop about screen 11, eMeals in a collapsed FAQ).
**A only:** no independent reviews; hero can read as food delivery to a scanner; bundled marketing email at sign-up; 500 vs 400 families; privacy policy mentions a password.
**B only:** trial needs a card and auto-renews (stated only in the help center); price shown as "$4.99/mo" but billed $59.99 a year; inconsistent 3-month prices; no sign-up button in the first screen; quiz before sign-up; help center looks dated (copyright 2021, articles "updated 4 years ago").

### 4.4 Which would you pick, and the one reason (simulated)

- **Kristin: DinnerDrop.** "I could find out what happens after 14 days without digging, and the answer is nothing bad."
- **Jasmine: DinnerDrop.** "No card means no trial trap; eMeals pre-authorizes your card and makes you remember to cancel."
- **Linda: DinnerDrop.** "Free to test with no card, then $39 a year, versus a card-on-file trial that becomes $59.99 up front."
- **Ashley: DinnerDrop.** "One email box and I'm in; eMeals made me start a quiz."
- **Susan: eMeals.** "They've been around since 2002 and I can read what other people say; DinnerDrop has no reviews yet."

---

## 5. Top 5 recommendations

1. **Put the price and a menu in the mobile header.** Add a small menu (How it works, Pricing, Help, About) or at least a "Pricing" link, and move the existing line "Then $4.99/month, or keep the free plan" above the first CTA. Today the price is about 11 screens down a 13,670 px page and the footer has no Pricing link. Two of five personas went looking for a menu; eMeals' hamburger was the one thing Susan preferred.
2. **Make the hero impossible to read as food delivery, and repeat it at sign-up.** For scanners, "Dinner, handled." + "Powered by Instacart" says delivery. Lead with what it does (for example "Your week of dinners planned, and the grocery list in your own Instacart or Walmart cart"), keep the green "We don't deliver food" line, and add one line on /signup and the first onboarding screen: "You'll review the cart and pay the store on Instacart or Walmart." Ashley left believing the groceries "just come."
3. **Build real outside proof, and own the "DinnerDrop reviews" search.** Google returns Dinnerly (a meal kit) for "DinnerDrop reviews", nothing exists on Reddit, and the App Store shows too few ratings. Ask happy families for App Store ratings in the app, set up a Google Business or Trustpilot profile, and publish a page that ranks for "DinnerDrop reviews" quoting only real, sourced reviews. This was Susan's reason to pick eMeals and Jasmine's and Linda's main hold-out.
4. **Fix the small trust leaks the careful readers caught.** Make the weekly marketing email a separate opt-in (or an unchecked box) rather than bundled into "By creating an account"; change About's "Over 400 families" to match "Over 500"; drop "password" from the privacy policy's list for passwordless accounts; align the App Store contact email (info@) with the site (sarah@). Each is small; together they are what a skeptic screenshots.
5. **One name for one action, and a shorter phone page.** "Start free", "Try Family free for 14 days" and "Start free with 14 days of Family" all open the same email box, which made Kristin wonder if they were different sign-ups. Use one label everywhere (for example "Start free, no card") with the 14-day Family line underneath. Trim repeated sections on mobile (family texting is explained twice on /start), and consider Sign in with Apple for the fast-tappers.

Keep what is clearly working and what eMeals lacks: no card for anything free, the same after-14-days rule in every place, the commission disclosure, the sample week with prices, and the /vs/emeals page that says when to choose eMeals.

---

## 6. Screenshots

All in `C:\Users\setzl\dinnerdrop\docs\panel-test-2026-11-22\screenshots\`, 390 px wide, viewport captures at 390x844.

**DinnerDrop walk-throughs (Variant A)**
- walkthrough-distracted-parent-1.png: home first screen (headline + Instacart badge; "We don't deliver food")
- walkthrough-distracted-parent-2.png: sample week
- walkthrough-distracted-parent-3.png: Family plan card and after-14-days rule
- walkthrough-distracted-parent-4.png: /signup (looked only)
- walkthrough-millennial-tech-skeptic-1.png: home first screen
- walkthrough-millennial-tech-skeptic-2.png: store comparison ($66 claim)
- walkthrough-millennial-tech-skeptic-3.png: FAQ (delivery, commission)
- walkthrough-millennial-tech-skeptic-4.png: About, "Over 400 families"
- walkthrough-millennial-tech-skeptic-5.png: /signup small print (weekly email)
- walkthrough-comparison-shopper-1.png: /pricing redirected to /start
- walkthrough-comparison-shopper-2.png: /start pricing cards
- walkthrough-comparison-shopper-3.png: store comparison fine print
- walkthrough-comparison-shopper-4.png: sample week total ($64)
- walkthrough-comparison-shopper-5.png: /vs/emeals table
- walkthrough-comparison-shopper-6.png: /vs/emeals "Choose eMeals if" and billing
- walkthrough-comparison-shopper-7.png: Help, Billing accordion open
- walkthrough-impulse-buyer-1.png: home first screen
- walkthrough-impulse-buyer-2.png: after tapping "See a sample week"
- walkthrough-impulse-buyer-3.png: /signup (looked only)
- walkthrough-boomer-tech-friendly-1.png: home first screen (no menu)
- walkthrough-boomer-tech-friendly-2.png: founder note
- walkthrough-boomer-tech-friendly-3.png: FAQ "Does DinnerDrop deliver food?"
- walkthrough-boomer-tech-friendly-4.png: About page
- walkthrough-boomer-tech-friendly-5.png: Help, Billing accordion open
- walkthrough-boomer-tech-friendly-6.png: App Store listing

**eMeals (Variant B)**
- ab-emeals-distracted-parent-1.png: home first screen
- ab-emeals-distracted-parent-2.png: FAQ with cost answer open
- ab-emeals-millennial-tech-skeptic-1.png: home first screen
- ab-emeals-millennial-tech-skeptic-2.png: support, "Does eMeals have a free trial?"
- ab-emeals-millennial-tech-skeptic-3.png: support, pending charge / pre-authorization
- ab-emeals-comparison-shopper-1.png: home first screen
- ab-emeals-comparison-shopper-2.png: FAQ cost answer
- ab-emeals-comparison-shopper-3.png: support cost article ($37.50)
- ab-emeals-comparison-shopper-4.png: support cost article ($35.99)
- ab-emeals-impulse-buyer-1.png: home first screen
- ab-emeals-impulse-buyer-2.png: hamburger menu open
- ab-emeals-impulse-buyer-3.png: trial start page (quiz, "Get Started" not tapped)
- ab-emeals-boomer-tech-friendly-1.png: home first screen
- ab-emeals-boomer-tech-friendly-2.png: FAQ cost answer
- ab-emeals-boomer-tech-friendly-3.png: eMeals reviews page
- ab-emeals-boomer-tech-friendly-4.png: contact page (form, no phone)

Scripts (scratchpad, not in the repo): `common.mjs`, `walk.mjs`, `explore.mjs`, `em.mjs`, `em2.mjs`, `text2.mjs`, `extra.mjs` under the session scratchpad `wt` folder.
