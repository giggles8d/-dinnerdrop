# DinnerDrop — Meta Ads Audience Research
**Day 2, Hour 4 | 2026-05-04**
**Purpose:** Define 3 audience profiles for A/B testing on Meta. Inform campaign structure (Hour 5).

---

## 2026 Meta Targeting Landscape: Key Changes

### What Changed (January 2026)
Meta removed dozens of granular detailed interest categories on **January 15, 2026**, consolidating many
specific interests (e.g., "meal kit delivery," "Instacart") into broader categories. This was preceded by
a June 2025 round of consolidation that merged niche lifestyle interests into broad groupings.

**Practical impact for DinnerDrop:**
- Cannot precisely target "Instacart users" or "meal kit subscribers" as standalone interests
- Must use broader interest signals + demographic refinement + creative to do the targeting work
- Advantage+ AI targeting is now Meta's default for new campaigns

### Advantage+ Audience vs Detailed Targeting — Which to Use?

| Factor | Advantage+ | Detailed Targeting |
|--------|------------|-------------------|
| New account, zero pixel data | ❌ Not recommended | ✅ Better |
| Budget < $30/day | ❌ Needs 50 conv/week to learn | ✅ More predictable |
| Strong creative doing targeting work | ✅ Ideal | Works |
| Has existing customer list / email list | ✅ Use as signal | — |

**Decision for DinnerDrop launch:** Start with **Detailed Targeting** for weeks 1–2 to bootstrap
conversion data. Transition to Advantage+ once pixel has 50+ conversions. This is the proven small-budget
launch approach confirmed by multiple 2026 benchmark studies.

**Hybrid option (recommended for Audience B below):** Set Detailed Targeting inputs inside an Advantage+
Audience setup as "suggestions" — Meta will start there and expand if better audiences are found.


---

## Available Targeting Options for DinnerDrop

### Demographics
- **Age:** 25–54 (sweet spot: 28–45, parents in active household management years)
- **Gender:** All (skew female 60% in meal planning but do not exclude — optimize post-launch)
- **Location:** United States (nationwide; geo-refine to suburban zip codes in week 2 if budget allows)
- **Parental status:** Parents (with children under 18) — available under Life Events / Family
- **Household income:** Top 25–50% (available as behavioral segment in US) — filters out price-sensitive
  non-converters who churn after trial

### Interest Categories (2026 available)
Confirmed available in Meta Ads Manager as of 2026 (post-January consolidation):

**Food & Kitchen:**
- Cooking (broad)
- Meal preparation / Meal prep
- Healthy eating
- Family cooking
- Grocery shopping
- Recipe discovery

**Parenting:**
- Parenting (broad)
- Busy parents / Working parents
- Family life
- Kids and family activities

**Productivity / Lifestyle:**
- Time management
- Household organization
- Personal finance (for budget meal angle)

**Competitive/Adjacent app users (behavioral):**
- Grocery delivery apps (broad category)
- Food and cooking apps users (mobile behavior)

### Behaviors
- Mobile app users (iOS + Android — reach app-comfortable audience)
- Frequent online shoppers (correlates with willingness to subscribe)
- Parents of school-age children (Life Event targeting)


---

## 3 Audience Profiles for A/B Testing

---

### AUDIENCE A — "Busy Parent" (Primary / Highest Intent)
**Targeting strategy:** Detailed Targeting, narrow
**Campaign objective:** Conversions (beta signup / Stripe checkout initiated)

**Setup:**
- Age: 28–45
- Location: United States
- Parental status: Parents with children
- Interests: Meal preparation, Family cooking, Healthy eating
- Behaviors: Frequent online shoppers, Mobile app users
- Household income: Top 25–50% (US behavioral)
- Placements: Feed + Stories (exclude Audience Network for conversion campaigns)

**Estimated audience size:** 3M–8M (Meta will show estimate in Ads Manager)
**Recommended starting budget:** $5/day
**Why this wins:** Highest-intent overlap — people actively thinking about family meals + proven
app purchase behavior. Most likely to convert in trial window.

**Ad to pair with:** Problem-Aware creative ("Sunday 5pm: What's for dinner…?")

---

### AUDIENCE B — "AI/Tech Early Adopter" (Hybrid Advantage+)
**Targeting strategy:** Advantage+ with interest suggestions
**Campaign objective:** Conversions (beta signup)

**Setup (as Advantage+ suggestions, not hard filters):**
- Age: 25–40
- Location: United States
- Interests (as suggestions): Technology, Productivity apps, Smart home, Cooking
- Gender: All
- Advantage+ expansion: ON — let Meta find adjacent converters

**Estimated audience size:** Broad (Advantage+ expands beyond initial signal)
**Recommended starting budget:** $3/day (lowest because learning phase is slower)
**Why this is worth testing:** DinnerDrop's AI angle resonates with tech-forward early adopters
who will evangelize the product. Lower volume but higher LTV + referral potential.

**Ad to pair with:** Benefit-Led creative ("5 dinners planned in 30 seconds — AI did it")


---

### AUDIENCE C — "Budget-Conscious Family" (Cold Broad + Strong Creative)
**Targeting strategy:** Broad targeting (age + location only), creative does the targeting work
**Campaign objective:** Traffic → /beta page (lower CPC, builds pixel data faster)

**Setup:**
- Age: 25–50
- Location: United States
- Gender: All
- No interest targeting — broad
- Placements: Reels + Feed (Reels lower CPM for awareness/traffic)

**Estimated audience size:** 50M+ (very broad)
**Recommended starting budget:** $2/day (traffic objective, not conversions)
**Why this is worth testing:** Broad + strong creative is Meta's recommended approach in 2026.
Low CPM on Reels builds pixel data cheaply. The creative self-selects — only people who
resonate with "stop wasting $1,500/year on groceries you throw away" will click.
Traffic from this campaign feeds the pixel, accelerating Audience A + B learning.

**Ad to pair with:** Scarcity/Urgency creative ("97 beta spots left — 6 months free")

---

## Recommended Launch Sequence

| Week | Active Audiences | Daily Budget | Goal |
|------|-----------------|--------------|------|
| Week 1 | A only | $5/day | First beta signups, pixel seeding |
| Week 2 | A + C | $5 + $2 = $7/day | Scale A if CPA < $15; C builds pixel |
| Week 3 | A + B + C | $5 + $3 + $2 = $10/day | B enters once pixel has 20+ events |
| Month 2 | A (Advantage+) + B | $10+/day | Transition A to Advantage+ at 50 conv |

**CPA targets:**
- Beta signup (free trial): acceptable up to $12 CPA (LTV of converted user = $108/year)
- Paid conversion (from trial): target $0 incremental cost (email sequence handles this)
- Break-even ad math: 56 paying users × $9 = $504/month revenue vs $200 Meta budget

---

## What Sarah Must Do Before Any Campaigns Launch

1. **Create Meta Business Manager** — https://business.facebook.com (Day 2 H1 guide)
2. **Create Facebook Page** — DinnerDrop, @DinnerDropApp (Day 2 H2 content ready)
3. **Create Instagram Business account** — linked to Facebook Page (Day 2 H3 content ready)
4. **Create Meta Pixel** — in Events Manager, share Pixel ID with Cowork
5. **Add payment method** to Ad Account (auth gate — cannot be delegated)
6. **Approve daily budget** — starting at $5/day for Audience A (see Hour 17 authorization package)

**Cowork will handle:** Campaign creation, ad set configuration, ad copy upload, creative upload,
UTM parameters, bid strategy selection, and ongoing optimization.

---

## Notes
- All audience sizes are estimates — Meta will show exact reach in Ads Manager at campaign creation
- Interest availability subject to change; verify in Ads Manager at launch time
- BETA100 Stripe coupon must be active before any ads go live (see Sarah's Action Items)
- og-image.png + logo.png must be uploaded before ad account brand kit can be configured
