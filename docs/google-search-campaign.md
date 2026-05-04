# DinnerDrop — Google Ads Search Campaign Structure
**Day 2, Hour 8 | 2026-05-04**
**References:** docs/keyword-research-v1.md, docs/google-ads-setup.md

---

## Campaign Overview

| Setting | Value |
|---|---|
| Campaign name | DinnerDrop Beta Launch — Search |
| Campaign type | Search (NOT Performance Max) |
| Campaign objective | Website conversions (beta_signup event) |
| Bid strategy | Maximize Conversions (switch to Target CPA $15 after 30+ conversions) |
| Budget | $5.00/day (Week 1) → $10/day (Week 3) |
| Network | Google Search only (uncheck Search partners and Display Network) |
| Location | United States |
| Language | English |
| Ad rotation | Optimize (prefer best-performing ads) |
| Start date | Day of Google Ads account activation |
| Conversion goal | beta_signup (primary), trial_start (secondary) |

**Why Search-only (not PMax):** Performance Max needs 50+ conversions/month to exit the learning phase. At launch, we have zero conversion history. Targeted Search campaigns with phrase/exact match keywords give us full visibility into which keywords drive signups at what CPC, which is critical data for week 2 optimization decisions.

---

## Ad Group Structure

Budget allocation across 3 ad groups:
- **Ad Group 1 — Meal Planning Apps:** 40% of budget ($2.00/day)
- **Ad Group 2 — AI Meal Planner:** 35% of budget ($1.75/day)
- **Ad Group 3 — Family Dinner Planning:** 25% of budget ($1.25/day)

---

## Ad Group 1: Meal Planning Apps

**Theme:** Users actively searching for a meal planning app — highest commercial intent, most competitive

### Keywords

| Keyword | Match Type | Notes |
|---|---|---|
| meal planning app | Phrase | Core term — highest volume |
| [meal planning app] | Exact | Add after first week if phrase is spending heavily |
| meal planner app | Phrase | Synonym — significant search volume |
| weekly meal planner | Phrase | High intent, planning mindset |
| weekly meal planning app | Phrase | Long-tail, high conversion intent |
| dinner planning app | Phrase | Maps directly to product name |
| grocery list app with meal planning | Phrase | Strong feature match |
| best meal planning app | Phrase | Comparison intent — beta offer angle works well |
| free meal planning app | Phrase | High volume; qualify with trial messaging in ad |

### Negative Keywords for This Ad Group
- recipe (informational, not app-seeking)
- excel (searching for template, not app)
- template (same)
- HelloFresh (competitive, different use case — meal kit delivery)
- Blue Apron (same)
- Paprika (competing app — avoid paying for brand comparison clicks)

### Ad Copy Direction
- Lead with "7-Day Free Trial" to pre-qualify clicks
- Headline 1 pin: "AI Dinner Planner App" (brand clarity)
- Headline 2 pin: "7-Day Free Trial — $0 to Start"
- Emphasize 5 dinners in 30 seconds speed angle
- Final URL: https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=search&utm_content=ag1-meal-planning

---

## Ad Group 2: AI Meal Planner

**Theme:** Tech-forward users searching for AI-powered solutions — lower competition, strong differentiation angle

### Keywords

| Keyword | Match Type | Notes |
|---|---|---|
| AI meal planner | Phrase | Primary differentiator keyword |
| [AI meal planner] | Exact | Add Week 2 if phrase converts |
| AI meal planning app | Phrase | Long-tail, very strong intent |
| smart meal planner | Phrase | Captures AI-adjacent searches |
| AI dinner planner | Phrase | Direct product description match |
| AI weekly meal plan | Phrase | Planning mindset + AI angle |
| automated meal planning | Phrase | Tech-forward framing |
| meal plan generator | Phrase | Tool-seeking language, AI fits naturally |
| AI grocery list | Phrase | Feature-level search — grocery handoff angle |

### Negative Keywords for This Ad Group
- free recipes (content, not app)
- ChatGPT meal plan (chat interface, not app — different intent)
- diet plan AI (diet/weight loss framing, not DinnerDrop's audience)
- keto AI (diet-specific, poor fit)

### Ad Copy Direction
- Lead with the AI angle explicitly ("AI Builds Your Dinner Plan")
- Headline 1 pin: "AI-Powered Dinner Planner"
- Headline 2 pin: "5 Dinners Ready in 30 Seconds"
- Emphasize the "set your preferences once, get a plan instantly" value prop
- This audience responds to efficiency and novelty — avoid generic "meal planning" framing
- Final URL: https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=search&utm_content=ag2-ai-meal

---

## Ad Group 3: Family Dinner Planning

**Theme:** Long-tail, parent-focused searches — lower CPCs, higher conversion intent, best match for DinnerDrop's core user

### Keywords

| Keyword | Match Type | Notes |
|---|---|---|
| meal planning for families | Phrase | Core long-tail, high intent |
| family dinner planner | Phrase | Direct product match |
| meal planner for busy parents | Phrase | Pain-point framing, DinnerDrop's ideal user |
| weekly dinner ideas for family | Phrase | Problem-state search — solution angle |
| easy weeknight dinners app | Phrase | Solution-seeking, family context |
| family meal prep app | Phrase | Overlaps meal prep behavior |
| meal planner with grocery list | Phrase | Feature-match — DinnerDrop's store handoff |
| dinner ideas for the week app | Phrase | Problem-state with app intent |
| family meal planning made easy | Phrase | Pain + solution framing |

### Negative Keywords for This Ad Group
- single (mismatch — DinnerDrop targets families)
- diet (weight-loss framing, different audience)
- baby food (wrong segment)
- lunch (DinnerDrop is dinner-focused)
- breakfast (same)

### Ad Copy Direction
- Lead with the time-saving angle for busy parents ("30 Seconds to Solve Dinner")
- Headline 1 pin: "Family Dinner Planner App"
- Headline 2 pin: "5 Dinners Planned in 30 Seconds"
- Mention the grocery list handoff feature in description (unique differentiator)
- Social proof angle: "Built for busy families who hate the 'what's for dinner?' question"
- Final URL: https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=search&utm_content=ag3-family

---

## Campaign-Level Negative Keywords

These apply to all 3 ad groups:

| Negative Keyword | Reason |
|---|---|
| recipe | Informational intent, not app-seeking |
| recipes | Same |
| HelloFresh | Meal kit competitor |
| Blue Apron | Meal kit competitor |
| Sunbasket | Meal kit competitor |
| EveryPlate | Meal kit competitor |
| diet | Weight-loss framing, wrong audience |
| weight loss | Same |
| keto | Diet-specific, wrong audience |
| vegan meal plan | Too restrictive — DinnerDrop is general |
| restaurant | Wrong intent |
| food delivery | Wrong category |
| Instacart | Grocery delivery intent, not planning |
| DoorDash | Food delivery, wrong intent |
| calories | Diet tracking, wrong audience |
| macro | Fitness/diet, wrong audience |
| Excel template | Spreadsheet tool, not app |
| printable | Looking for paper-based resource |
| PDF | Same |
| free without signup | Poor quality traffic, no conversion intent |

---

## Ad Extensions

### Sitelink Extensions (4 required)
| Sitelink Text | Description 1 | Description 2 | URL |
|---|---|---|---|
| Start Free Trial | 7 days free, no commitment | Cancel anytime | /beta?utm_content=ext-trial |
| How It Works | 3 steps to dinner solved | Built for busy families | /beta?utm_content=ext-howitworks |
| Beta Offer | 6 months free for beta users | Only 100 spots total | /beta?utm_content=ext-beta |
| View Pricing | $9/month after free trial | Less than one takeout order | /subscribe?utm_content=ext-pricing |

### Callout Extensions
- "No credit card for 7 days"
- "One-tap grocery list"
- "Works with Walmart, Target & more"
- "Cancel anytime"
- "Built for busy families"
- "5 dinners in 30 seconds"

### Structured Snippet Extension
- Header: Features
- Values: AI meal planning, Grocery list builder, Store cart handoff, Family-friendly recipes, Weekly dinner plans

---

## Match Type Strategy

**Week 1:** Phrase match only for all keywords
- Phrase match gives reach while still controlling for intent
- Exact match is too narrow at launch with no conversion data
- Broad match will waste budget at $5/day — avoid entirely in weeks 1-3

**Week 3 (after 30+ conversions):**
- Add exact match versions of top 3 converting keywords
- Pause any phrase match keywords with 0 conversions and CPC > $3.00 over 100 impressions

---

## Bidding Strategy Roadmap

| Phase | Bid Strategy | Trigger |
|---|---|---|
| Week 1-2 | Maximize Conversions | Default at launch (no conversion history) |
| Week 3+ | Target CPA: $15 | After 30+ conversions recorded |
| Month 2 | Target CPA: $12 | After 60+ conversions, algorithm has enough data |

**Why Maximize Conversions first:** Target CPA requires sufficient conversion data to set an accurate target. Setting Target CPA too early (or setting it too low) will result in ad sets under-spending or not serving. Let Google optimize freely for the first 30 conversions, then constrain.

---

## Week 1 Performance Benchmarks

At $5/day Google Search budget with Maximize Conversions:

| Metric | Conservative | Target | Strong |
|---|---|---|---|
| Impressions/day | 80 | 150 | 250 |
| CTR | 4% | 6% | 8% |
| Clicks/day | 3-4 | 8-10 | 18-20 |
| CPC average | $1.75 | $1.50 | $1.25 |
| Weekly clicks | 21-28 | 56-70 | 126-140 |
| CVR (click-to-beta-signup) | 3% | 5% | 8% |
| Weekly beta signups | 1 | 3-4 | 8-11 |

**Day 3 checkpoint:** If CTR < 3% on any ad group, pause the weakest ad and swap in a new headline. If CPC > $2.50 on any ad group, add 5 more negative keywords from search terms report.

**Day 7 checkpoint:** If zero conversions from an ad group, pause it and shift budget to the converting groups.

---

## Campaign Launch Checklist (Cowork-owned)

- [ ] Sarah completes Google Ads account setup (docs/google-ads-setup.md steps 1-7)
- [ ] Sarah creates 2 conversion actions and shares Conversion ID + labels with Cowork
- [ ] Cowork adds gtag conversion tracking code to layout.tsx and beta/success page
- [ ] Cowork builds and pushes conversion tracking commit
- [ ] Sarah activates Search campaign (budget: $5/day)
- [ ] Cowork monitors search terms report on Day 3 and adds negatives
- [ ] Cowork runs Day 7 performance checkpoint and adjusts ad group budgets

---

## Budget Ramp Schedule

| Week | Daily Budget | Weekly Spend | Trigger to Increase |
|---|---|---|---|
| Week 1 | $5/day | ~$35 | Any paid conversion |
| Week 2 | $8/day | ~$56 | CPA ≤ $18 in Week 1 |
| Week 3 | $10/day | ~$70 | CPA ≤ $15 in Week 2 |
| Week 4 | $15/day | ~$105 | CPA ≤ $12 in Week 3 |

Month 1 estimated total Google spend: $266–$350 (above $150/month budget if fully ramped)
**Recommended:** Cap at $10/day for month 1 ($300 ceiling). Total Month 1 Google: ~$230.

---

*Next: docs/google-ad-copy.md — 9 responsive search ads (3 per ad group), 15 headlines + 4 descriptions each*
