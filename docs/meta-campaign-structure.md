# DinnerDrop — Meta Ads Campaign Structure
**Day 2, Hour 5 | Prepared by Cowork Operating Manager | 2026-05-04**

---

## Objective Decision: Conversions (Not Leads)

**Use: Sales — Conversions objective → Optimize for "Purchase"**

Reasoning:
- DinnerDrop's beta CTA goes directly to Stripe checkout (/subscribe?coupon=BETA100)
- "Lead" objective optimizes for form fills — not what we want (we want checkout page visits/completions)
- "Purchase" conversion event fires on successful Stripe checkout → subscription created
- Meta's algorithm trains on actual buyers, producing higher-quality traffic over time
- If Purchase conversion volume is too low in week 1 (<5/week), downgrade to "Add to Cart" or "Lead" temporarily to give Meta signal — re-evaluate at Day 7 review

**Conversion event to create (requires Meta Pixel + Next.js integration):**
- Event name: `Purchase`
- Trigger: After Stripe checkout session completes (success page or webhook)
- Value: 0 (beta is free — do not pass $0 as purchase value, omit value parameter)
- Implementation: `fbq('track', 'Purchase')` on `/subscribe/success` page

---

## Campaign Architecture Overview

```
CAMPAIGN: DinnerDrop Beta Launch
  └── AD SET A: Busy Parent (Detailed) — $5/day
        └── Ad A1: Problem-Aware ("Sunday dread")
        └── Ad A2: Benefit-Led ("5 dinners in 30 sec")
  └── AD SET B: Budget Family (Broad/Reels) — $3/day  [launch week 2]
        └── Ad B1: Savings Angle ("$1,500/year in wasted groceries")
  └── AD SET C: AI Early Adopter (Advantage+) — $2/day  [launch week 3]
        └── Ad C1: Tech-Forward ("AI builds your week")
```

**Week 1 active:** Ad Set A only ($5/day) — validate CPC, CPM, CPA before scaling

---

## Campaign Level Settings

| Setting | Value | Reason |
|---|---|---|
| Campaign name | `DD_Beta_Launch_May2026` | Dated for tracking |
| Objective | Sales — Conversions | Optimize for checkout completions |
| Special ad categories | None | Food/app — no housing/employment/credit category |
| Campaign budget optimization (CBO) | OFF | Manual per-ad-set budgets week 1 — too little data for CBO |
| A/B test | OFF at campaign level | Run A/B by duplicating ad sets manually |
| Bid strategy | Lowest cost (no cap) | Auto-bidding while learning; add bid cap at Day 7 if CPA > $15 |

---

## Ad Set A — "Busy Parent" (Week 1 Launch Set)

**Budget:** $5/day  
**Schedule:** Run all hours (do NOT restrict schedule — Meta needs full delivery window to learn)  
**Pixel event:** Purchase  

### Targeting
| Field | Value |
|---|---|
| Locations | United States |
| Age | 28–45 |
| Gender | All (skew female but let algorithm decide) |
| Detailed targeting | Interests: Meal preparation, Family-style cooking, Grocery shopping, Parenting; Behaviors: Parents with children 4–12, Engaged buyers |
| Detailed targeting expansion | OFF (keep tight in week 1 while learning) |
| Advantage+ audience | OFF |
| Custom audiences | None (no pixel data yet) |
| Lookalike audiences | None (need 100+ events first) |
| Placements | Manual — Facebook Feed, Instagram Feed, Instagram Stories, Instagram Reels only |
| Excluded placements | Audience Network, Messenger, Facebook Marketplace, Facebook Video Feeds |

**Why manual placements:** Automatic placements include Audience Network (low-quality traffic). In week 1, Feed + Stories + Reels only gives cleaner signal.

---

## Ad Level — Week 1 Ads (within Ad Set A)

### Ad A1 — Problem-Aware ("Sunday Dread")

| Field | Value |
|---|---|
| Ad name | `DD_A1_ProblemAware_Feed` |
| Format | Single image |
| Image | og-image.png (1200x630) — forest green, "Dinner, handled." headline |
| Primary text | "Every Sunday I'd spend an hour planning dinners. Searching recipes, checking what's in the fridge, building a grocery list by hand. DinnerDrop does all of it in 30 seconds — AI picks 5 dinners, builds your grocery list, and sends it straight to your store. 7-day free trial. 100 beta spots left." |
| Headline | Dinner, handled. |
| Description | AI meal planning for busy families — free trial |
| CTA button | Sign Up |
| Destination URL | https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid&utm_campaign=beta_launch&utm_content=a1_problem |
| Pixel tracking | Purchase event on checkout success |

### Ad A2 — Benefit-Led ("30 Seconds")

| Field | Value |
|---|---|
| Ad name | `DD_A2_BenefitLed_Feed` |
| Format | Single image |
| Image | Meta ad creative #2 from social-assets-brief.md (Canva brief) |
| Primary text | "5 dinners. 1 grocery list. 30 seconds. DinnerDrop uses AI to plan your whole week — then builds the list and pushes it directly to Walmart, Amazon Fresh, or your store of choice. Start your free 7-day trial today. Beta pricing: $9/month after trial. 100 spots only." |
| Headline | 5 dinners planned in 30 seconds |
| Description | Free 7-day trial — no commitment |
| CTA button | Learn More |
| Destination URL | https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid&utm_campaign=beta_launch&utm_content=a2_benefit |
| Pixel tracking | Purchase event on checkout success |

**Launch with A1 and A2 simultaneously in Ad Set A — let Meta auto-optimize delivery between them over 7 days. Do NOT manually pause one before 7 days unless spend ratio is >80/20.**

---

## Budget Plan — 4-Week Ramp

| Week | Active Ad Sets | Daily Budget | Notes |
|---|---|---|---|
| Week 1 (Days 1–7) | A only | $5/day ($35 total) | Learning phase — establish baseline CPA |
| Week 2 (Days 8–14) | A + B | $8/day ($56 total) | Add Budget Family set if CPA ≤ $15 |
| Week 3 (Days 15–21) | A + B + C | $10/day ($70 total) | Add Advantage+ if 50 conversions reached |
| Week 4+ | Best performers | $10–$20/day | Scale winners, pause underperformers |

**Month 1 total Meta ad spend estimate: $161–$230 (within $200 budget)**

---

## Optimization Rules (set calendar reminders for these)

### Day 3 Check (48 hours after launch)
- If CPM > $30: creative fatigue or audience too narrow — try broader age range
- If CTR < 0.5%: headline/creative not resonating — swap Ad A1 for urgency variant
- If CPC > $4.00: bid too competitive — check if placement exclusions are set correctly
- If zero link clicks: pixel may not be firing — verify Pixel ID in Next.js

### Day 7 Check (end of week 1 learning)
- If CPA < $12: scale — increase budget by $2/day, add Ad Set B
- If CPA $12–$20: acceptable — hold budget, test new ad creative
- If CPA > $20: pause — review audience, creative, and landing page before scaling
- If conversions < 5 total: downgrade objective to "Traffic" for 7 more days, then retry "Conversions"

### Day 14 Check
- Turn on Lookalike Audience (1% LAL of purchasers) if 100+ Purchase events recorded
- Evaluate Advantage+ Shopping Campaign if spend > $500 total

---

## Meta Pixel Integration (Cowork will build once Sarah provides Pixel ID)

**What Sarah must do first:**
1. Create Meta Pixel in Events Manager: https://business.facebook.com/events_manager
2. Name it: DinnerDrop
3. Copy the Pixel ID (16-digit number)
4. Share Pixel ID with Cowork in Slack or here

**What Cowork will then build:**
- Add `<meta name="facebook-pixel-id" content="{PIXEL_ID}" />` to Next.js layout
- Add fbq script to layout.tsx `<head>` section
- Add `fbq('track', 'Purchase')` to subscribe/success page
- Commit and push — fires within 24 hours of deploy

---

## What Sarah Must Do to Launch (in order)

1. ✅ **Prerequisite:** Complete Meta Business Manager setup (docs/meta-bm-setup.md)
2. ✅ **Prerequisite:** Create Facebook Page (docs/facebook-page-content.md)
3. ✅ **Prerequisite:** Create Instagram Business Profile (docs/instagram-profile-content.md)
4. **NEW:** Create Meta Pixel → share Pixel ID with Cowork
5. **NEW:** Create BETA100 Stripe coupon (if not done — see Sarah's action items in schedule)
6. **NEW:** Create ad visuals in Canva (docs/social-assets-brief.md) → upload to /public/ in GitHub
7. **NEW:** In Ads Manager, create campaign using this document as the configuration spec
8. **NEW:** Authorize $5/day starting budget and add payment method to ad account
9. Cowork monitors from Day 1 onward, reports daily

**Cowork will write the exact click-by-click Ads Manager setup guide in a future hour (Day 3 Hour 1).**

---

## Estimated Week 1 Performance

Based on D2H4 audience research benchmarks (food/app vertical, 2026):

| Metric | Conservative | Target | Optimistic |
|---|---|---|---|
| Daily impressions | 800 | 1,200 | 2,000 |
| CTR | 0.8% | 1.2% | 1.8% |
| Daily link clicks | 6 | 14 | 36 |
| CPC | $0.80 | $0.35 | $0.14 |
| CVR (click→beta signup) | 3% | 5% | 8% |
| Daily beta signups | 0.2 | 0.7 | 2.9 |
| Week 1 beta signups (Meta) | 1–2 | 5 | 20 |
| CPA (cost per beta signup) | $25 | $7 | $1.75 |

**At $5/day, realistic target: 3–7 beta signups in week 1 from Meta alone.**  
Combined with Google Ads ($5–15/day) and organic community posts, break-even (56 paid) is achievable by Day 30.
