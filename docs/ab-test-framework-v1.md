# DinnerDrop A/B Test Framework — Version 1
**Created:** 2026-05-04 (Day 2, Hour 13)
**Status:** Ready to launch (blocked on Sarah's ad account setup)
**Purpose:** Single reference document for all Week 1 and Week 2 paid ad tests

---

## OVERVIEW

We are running two simultaneous A/B tests at launch:

| Test | Platform | What We're Testing | Budget |
|------|----------|--------------------|--------|
| Test M1 | Meta Ads | Creative angle: Problem-Aware vs Benefit-Led | $5/day (shared) |
| Test G1 | Google Search | Ad group framing: Speed vs AI Authority | $5/day (shared) |

Both tests run Week 1 only. Decision at Day 3 checkpoint (Meta) and Day 7 checkpoint (Google).

---

## META TEST M1 — Creative Angle

### Hypothesis
**We are testing whether pain-point framing (A1) or speed-benefit framing (A2) drives more beta signups from the Busy Parent audience.**

- **A1 (Problem-Aware)** will have higher CTR because the Sunday dinner-planning dread is universally relatable and stops the scroll
- **A2 (Benefit-Led)** will have higher CVR because "5 dinners in 30 seconds" makes the value proposition immediately concrete
- Expected winner: A1 for CTR, A2 for CVR — overall CPA comparison determines the winner

### Variant A1 — Problem-Aware (LAUNCH)
**Creative concept:** Split-screen — left half shows chaotic Sunday planning (sticky notes, browser tabs, stressed person), right half shows the clean DinnerDrop meal plan UI
**Headline:** Every. Single. Sunday. / Not anymore.
**Primary text:**
> You open 12 browser tabs. Write a grocery list on a Post-it. Forget it at home.
> DinnerDrop plans 5 dinners in 30 seconds and pushes the grocery list straight to your store.
> 100 beta spots. 6 months free. No credit card needed.

**CTA:** Get Early Access
**Destination URL:** https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid_social&utm_campaign=beta_launch_w1&utm_content=a1_problem_aware
**Format:** Feed (1080x1080) + Story crop (1080x1920, key text in center 1080x1350)
**Status:** Blocked on logo.png/og-image.png Canva session


### Variant A2 — Benefit-Led (LAUNCH — produces faster, no photo needed)
**Creative concept:** Type-only — bold white text on forest green (#1a5c38) background, no photo required
**Headline:** 5 dinners. 30 seconds.
**Primary text:**
> AI plans your full week of dinners. One tap sends the grocery list to Walmart, Kroger, or Amazon Fresh.
> No more "what's for dinner?" DinnerDrop handles it.
> 100 beta spots open — 6 months free, no credit card needed.

**CTA:** Claim Your Free Spot
**Destination URL:** https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid_social&utm_campaign=beta_launch_w1&utm_content=a2_benefit_led
**Format:** Feed (1080x1080) + Story crop
**Status:** UNBLOCKED — can produce in Canva now without logo.png

### Ad Set Configuration
- **Campaign objective:** Sales → Conversions (Purchase event)
- **Ad set name:** A — Busy Parent — Week 1
- **Audience:** Detailed targeting — Meal preparation + Parents with children (6–12) + Age 28–45 + US
- **Daily budget:** $5/day (both ads share this; Meta allocates based on performance)
- **Schedule:** Start immediately after ad account creation; run 7 days minimum before pausing

### Meta Decision Rules — Day 3 Checkpoint

Check performance at 48–72 hours after launch. Apply these rules:

| Metric | Pause Variant | Scale Variant | No Action |
|--------|--------------|---------------|-----------|
| CTR (link) | < 0.5% | > 1.5% | 0.5%–1.5% |
| CPA | > $25 | < $12 | $12–$25 |
| CPM | > $18 | — | < $18 |
| Spend | < $2 (under-delivery) | — | Normal pacing |

**If both variants perform poorly (CPA > $25 and CTR < 0.5%):** Pause both, review audience targeting, switch to broader interest set.
**If A1 wins CTR but A2 wins CVR:** Keep both; declare A2 winner at Day 7 if CPA is ≤15% lower.
**If one variant has < $3 spend at Day 3:** Insufficient data — let run to Day 7 before deciding.

---

## GOOGLE TEST G1 — Ad Group Framing

### Hypothesis
**We are testing whether speed-framing (Group 1 — "5 Dinners in 30 Seconds") or AI-authority framing (Group 2 — "AI Meal Planner") generates more beta signups from Google Search.**

- **Group 1 (Speed/Convenience)** will have higher volume because "meal planning app" is the broadest, highest-traffic keyword cluster
- **Group 2 (AI Framing)** will have higher intent because searchers for "AI meal planner" are actively researching AI tools and more likely to try a new product
- Expected outcome: Group 1 higher volume, Group 2 higher CVR — CPA comparison at Day 7 determines budget allocation


### Variant G1 — Ad Group 1: Meal Planning Apps (40% of budget = ~$2/day)
**Launch variant:** RSA 1-A
**Pinned H1:** DinnerDrop Meal Planner
**Pinned H2:** 5 Dinners Planned in 30 Sec
**Rotating headlines (H3–H15):** Free 7-Day Trial | AI Plans Your Week | One-Tap Grocery List | 100 Beta Spots Open | No Credit Card Needed | Works With Kroger & Walmart | Dinner Stress Ends Here | Plan a Week in 30 Seconds | Save $40/Week on Groceries
**Description 1:** AI builds your full dinner plan in seconds. Grocery list auto-fills and sends to your store. Free trial — no card needed.
**Description 2:** Stop Googling recipes every Sunday. DinnerDrop plans 5 dinners, makes your grocery list, and pushes it to Kroger or Walmart. Try free.
**Final URL:** https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=search_meal_planning&utm_content=rsa1a_speed
**Keywords (phrase match):** "meal planning app", "meal planner app", "weekly meal planner", "dinner planning app", "grocery list app", "meal plan generator", "weekly dinner planner", "meal prep app", "dinner planner app"

### Variant G2 — Ad Group 2: AI Meal Planner (35% of budget = ~$1.75/day)
**Launch variant:** RSA 2-A
**Pinned H1:** DinnerDrop — AI Meal Planner
**Pinned H2:** 5 Dinners Planned by AI
**Rotating headlines (H3–H15):** Free 7-Day Beta Trial | Smart Weekly Meal Plans | AI Picks Dinners for You | One-Tap Grocery Delivery | 100 Beta Spots — Join Free | Works With Kroger & Walmart | No More Dinner Decisions | Personalized to Your Family | Save Hours Every Week
**Description 1:** DinnerDrop's AI plans 5 dinners your family will love in 30 seconds. Grocery list syncs straight to your store. Try free — no credit card.
**Description 2:** Skip the Sunday planning stress. AI builds your week of dinners, generates the full grocery list, and sends it to Kroger or Walmart with one tap.
**Final URL:** https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=search_ai_meal_planner&utm_content=rsa2a_ai_authority
**Keywords (phrase match):** "AI meal planner", "AI meal planning app", "smart meal planner", "automated meal planning", "AI dinner planner", "meal plan generator AI", "AI weekly meal plan", "meal planning with AI", "AI grocery list generator"

### Google Decision Rules — Day 7 Checkpoint

| Metric | Reallocate Budget Away | Scale | No Action |
|--------|----------------------|-------|-----------|
| CTR | < 2% | > 5% | 2%–5% |
| CPA | > $20 | < $12 | $12–$20 |
| Conversions | 0 after $15 spent | 3+ conversions | 1–2 conversions |
| Impression share | < 30% (bid too low) | — | 30%–70% |

**If G1 wins:** Increase to 60% budget, activate RSA 1-B (urgency/scarcity variant) Week 3
**If G2 wins:** Increase to 55% budget, activate RSA 2-B (speed/simplicity variant) Week 3
**If neither converts after $30 total spend:** Pause and audit landing page CVR — issue is likely post-click, not the ads

---

## WEEK 2 ADDITIONS (activate after Week 1 data)

### Meta — Ad Set B: Budget Family ($3/day)
- Audience: Broad targeting, women 25–45, Reels placement prioritized
- Creative: B1 (Urgency/Scarcity — progress bar "97 of 100 spots remain")
- B1 Destination URL: https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid_social&utm_campaign=beta_launch_w2&utm_content=b1_urgency
- Only activate if Week 1 Meta CPA < $20
- Note: Pull real spot count from /api/stripe/beta-spots before producing B1 creative

### Google — Ad Group 3: Family Dinner Planning (~$1.25/day)
- Keywords: "meal planner for busy parents", "easy weeknight dinners app", "family dinner planner"
- RSA 3-A: busy parent pain framing
- Only activate if Week 1 Google CPA < $20


---

## FULL UTM PARAMETER MAP

| Source | Medium | Campaign | Content | When |
|--------|--------|----------|---------|------|
| meta | paid_social | beta_launch_w1 | a1_problem_aware | Week 1 |
| meta | paid_social | beta_launch_w1 | a2_benefit_led | Week 1 |
| meta | paid_social | beta_launch_w2 | b1_urgency | Week 2+ |
| google | cpc | search_meal_planning | rsa1a_speed | Week 1 |
| google | cpc | search_ai_meal_planner | rsa2a_ai_authority | Week 1 |
| google | cpc | search_family_dinner | rsa3a_family | Week 2+ |
| reddit | organic_social | community_launch | mealplanning_founder | Day 3+ |
| reddit | organic_social | community_launch | eatcheap_value | Day 60+ (warmup) |
| facebook | organic_social | community_launch | fb_beta_offer | Day 3+ |

---

## LAUNCH CHECKLIST — What Must Happen Before Ads Go Live

### Sarah's Auth Gate Tasks (in order)
1. [ ] Create BETA100 Stripe coupon — https://dashboard.stripe.com/coupons/create (100% off, 6 months, repeating)
2. [ ] Create og-image.png + logo.png in Canva — brief at docs/social-assets-brief.md — upload to /public/ in GitHub
3. [ ] Create Meta Business Manager — https://business.facebook.com (guide: docs/meta-bm-setup.md)
4. [ ] Create DinnerDrop Facebook Page (content: docs/facebook-page-content.md)
5. [ ] Create Meta Ad Account (USD, correct timezone — PERMANENT) + Meta Pixel → share Pixel ID with Cowork
6. [ ] Create Google Ads account in Expert Mode — https://ads.google.com (guide: docs/google-ads-setup.md)
7. [ ] Create 2 Google conversion actions → share Conversion ID + labels with Cowork
8. [ ] Authorize ad spend: $5/day Meta + $5/day Google = $10/day Week 1

### Cowork Executes After Sarah Provides IDs
- [ ] Build Analytics + Meta Pixel tracking code (gtag.js + fbq.js per docs/conversion-tracking-plan.md)
- [ ] Enter Meta campaign in Ads Manager (per docs/meta-campaign-structure.md)
- [ ] Enter Google Search campaign + 2 ad groups + RSA copy (per docs/google-search-campaign.md + docs/google-ad-copy.md)
- [ ] Monitor Day 3 Meta checkpoint (apply rules from Test M1 section above)
- [ ] Monitor Day 7 Google checkpoint (apply rules from Test G1 section above)

---

## CURRENT BLOCKER SUMMARY (Day 2, Hour 13)

| # | Blocker | Impact | Owner |
|---|---------|--------|-------|
| 1 | BETA100 Stripe coupon not confirmed | Community posts + ads can't launch | Sarah |
| 2 | og-image.png + logo.png missing from /public/ | All ad creatives except A2 blocked; blank social previews | Sarah |
| 3 | Meta BM + Ad Account not created | Meta campaigns can't launch | Sarah |
| 4 | Meta Pixel ID not shared | Conversion tracking code unbuilt | Sarah |
| 5 | Google Ads account not created | Google campaigns can't launch | Sarah |
| 6 | Google Conversion ID/Labels not shared | gtag tracking code unbuilt | Sarah |
| 7 | Creative A2 (type-only) | UNBLOCKED — produce in Canva now | Cowork |

**Estimated Sarah time to clear all blockers: ~90 minutes total (can be split across 2–3 sessions)**

---

*Source documents: docs/meta-campaign-structure.md | docs/meta-ad-creatives.md | docs/meta-audience-research.md | docs/google-ads-setup.md | docs/google-search-campaign.md | docs/google-ad-copy.md | docs/google-display-assets.md | docs/conversion-tracking-plan.md | docs/ad-copy-v1.md | docs/keyword-research-v1.md*
