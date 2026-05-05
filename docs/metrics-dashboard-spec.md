# DinnerDrop Metrics Dashboard Spec
**Purpose:** Daily 2-minute health check for Sarah — key numbers in one view
**Format:** Google Sheets (read-only for Sarah, auto-populated via Cowork scripts or manual pull)
**Update cadence:** Daily — refreshed each morning by scheduled Cowork run
**Last updated:** 2026-05-05

---

## SECTION 1 — THE 2-MINUTE DASHBOARD (Top of sheet, always visible)

Sarah reads exactly 6 numbers each day. Nothing else is required.

| # | Metric | Source | Healthy | Warning | Critical |
|---|--------|--------|---------|---------|----------|
| 1 | Beta spots claimed (of 100) | /api/stripe/beta-spots | >5 | <3 after Day 3 | 0 movement 3+ days |
| 2 | Trial starts today | Stripe dashboard | Any | — | — |
| 3 | Paid conversions (total) | Stripe dashboard | >0 after Day 7 | — | 0 after Day 14 |
| 4 | Trial-to-paid rate | Calculated | >20% | 10–20% | <10% |
| 5 | Grocery lists pushed today | Supabase query | Any | — | — |
| 6 | Ad spend vs. signups (CPA) | Stripe + ad platform | <$20 | $20–$40 | >$40 |

**Decision rule:** If 2+ metrics are Warning or Critical → Cowork investigates next run.

---

## SECTION 2 — FULL METRICS DEFINITIONS

### 2A — Beta Acquisition

**Beta spots claimed**
- Formula: `100 - spotsRemaining` from `/api/stripe/beta-spots`
- Update: Every Cowork run (curl to live endpoint)
- Goal: 100/100 claimed within 30 days of launch
- Milestone alerts: 10, 25, 50, 75, 100

**Daily signups**
- Source: Stripe → Subscriptions tab → filter by date + coupon=BETA100
- Proxy: New `profiles` rows where `subscription_status = 'trialing'` and `created_at = today`
- Target Week 1: 3–7 per day across all channels

**Signup source breakdown (weekly, not daily)**
- Track via UTM parameters in GA4 (when installed)
- Until GA4 live: manual check per ad platform dashboard
- Sources: Meta ads, Google ads, Reddit, Facebook Groups, direct/word-of-mouth

### 2B — Trial-to-Paid Conversion

**Trial-to-paid rate**
- Formula: `(paid subscribers / total trial starts) * 100`
- Measurement window: After Day 8 of any cohort (7-day trial period)
- Target: 20%+ (industry benchmark: 15–25%)
- Email sequence goal: Push this above 20%

**Trial drop-off day**
- Which day of the 7-day trial do most users fail to upgrade?
- Source: Supabase — compare `trial_starts_at` to `subscription_status` change date
- Use to tune: Email sequence timing (Day 3, Day 6, Day 7 sends)

**Paid subscribers (cumulative)**
- Source: Stripe → Subscriptions → filter status=active AND NOT coupon=BETA100
- Note: With 6-month free beta, this reads 0 until Month 7 for beta cohort
- Exception: Any user who upgrades early from free→paid during trial

### 2C — Product Engagement

**Grocery lists pushed (daily)**
- Source: Supabase — count rows in `grocery_pushes` table where `created_at = today`
- If no dedicated table: count `meal_plans` where `store_handoff_clicked = true`
- Why it matters: Grocery handoff is the #1 retention driver. Low pushes = low retention risk.

**Meal plans generated (daily)**
- Source: Supabase — count `meal_plans` rows where `created_at = today`
- Healthy ratio: 1+ meal plan per active trial user per week
- Red flag: Users who signed up but never generated a plan (onboarding drop-off)

**Onboarding completion rate**
- Source: Supabase — `profiles` where `preferred_store IS NOT NULL` / total profiles
- Target: >80% (if below, onboarding quiz has friction)

**DAU / MAU ratio (weekly)**
- Source: Supabase — unique `user_id` in `meal_plans` last 7 days / last 30 days
- Target: >0.3 (stickiness benchmark for consumer apps)

### 2D — Email Sequence Performance

**Email open rate (by email in sequence)**
- Source: Resend dashboard → logs tab
- Track separately: Day 3 email, Day 6 email, Day 7 email
- Benchmark: 35–50% open rate for transactional trial emails
- Red flag: Day 7 open rate <25%

**CTA click-through rate (by email)**
- Source: Resend click tracking (enable in Resend dashboard)
- Benchmark: 8–15% CTR on trial conversion emails
- Track: Which CTA (upgrade vs. explore features) drives more paid conversions

**Email-attributed conversions**
- Source: Cross-reference Stripe paid conversion timestamp vs. Day 7 email send time
- Proxy: Conversions within 2 hours of Day 7 email = email-attributed

### 2E — Ad Campaign Performance

**Daily ad spend**
- Source: Meta Ads Manager + Google Ads (manual check until API connected)
- Target Week 1: $10/day Meta + $10/day Google = $20/day total

**Cost per beta signup (CPA)**
- Formula: `total ad spend / new beta signups` (7-day rolling)
- Target: <$20 | Warning: $20–$40 | Kill: >$40 sustained
- Calculate separately: Meta CPA vs. Google CPA

**CTR by ad variant**
- Source: Meta Ads Manager (A1 vs A2) | Google Ads (RSA 1-A vs RSA 2-A)
- Decision rule: After Day 3, pause lower CTR variant (see ab-test-framework-v1.md)

**Landing page conversion rate**
- Formula: `/beta page visits / beta signups` per day
- Source: Vercel Analytics (views) + Stripe (signups)
- Target: >5% | A/B: compare /beta vs /beta-v2 once each has 50+ visits

### 2F — Affiliate Revenue Tracking

**Walmart affiliate clicks** — Source: Impact.com dashboard → Clicks (after approval)

**Instacart new customer conversions** — Source: Impact.com → Conversions ($5–$10 CPA)
- Projection: 100 beta users, 30% use Instacart, 20% are new Instacart customers = ~6 conversions = $30–$60/month

**Amazon Associates qualifying sales** — Source: associates.amazon.com → Reports → Summary
- Goal: 3 qualifying sales within 180 days to avoid auto-rejection

---

## SECTION 3 — GOOGLE SHEETS STRUCTURE

### Sheet 1: Daily Dashboard (Sarah reads this)
```
Row 1:  DATE:            | [=TODAY()]
Row 3:  === ACQUISITION ===
Row 4:  Beta spots claimed | [manual] | [=B4/100 as %]
Row 5:  Signups today    | [manual]
Row 6:  Total trial users | [manual]
Row 8:  === PRODUCT ===
Row 9:  Grocery lists pushed today | [manual]
Row 10: Meal plans generated today | [manual]
Row 12: === MONEY ===
Row 13: Ad spend today   | [manual]
Row 14: CPA (7-day rolling) | [=SUM(B13:7dayrange)/SUM(B5:7dayrange)]
Row 15: Paid subscribers | [manual]
Row 16: Trial-to-paid %  | [=B15/B6*100]
Row 18: === STATUS ===
Row 19: Ad campaigns     | [Active / Paused / Not launched]
Row 20: Email sequence   | [Active / Resend setup pending]
Row 21: Affiliates       | [Pending / Active: Walmart, Instacart]
```

### Sheet 2: Historical Log (Cowork appends each run)
Columns: Date | Beta_Spots | Signups_Today | Total_Trials | Paid_Subs | Grocery_Pushes | Ad_Spend | CPA | Notes

### Sheet 3: Cohort Tracker (weekly)
Columns: Cohort_Week | Users_Started | Day7_Alive | Converted | Rate | Revenue_Month7

---

## SECTION 4 — DATA COLLECTION (What Cowork does vs. Sarah does)

### Cowork Pulls Automatically Each Run
1. Beta spots remaining → `curl https://dinnerdrop.vercel.app/api/stripe/beta-spots`
2. Deployment health → latest git commit hash matches Vercel deployment
3. Site HTTP status → curl dinnerdrop.vercel.app (must be 200)

### Sarah Enters Manually (2 min max)
1. New signups today → Stripe dashboard → Subscriptions → filter today
2. Grocery pushes → Supabase Table Editor → meal_plans or grocery_pushes table
3. Ad spend → Meta Ads Manager + Google Ads dashboards

### Future Automation (Week 2+)
- Stripe → Sheets: Zapier/Make zap on `customer.subscription.created`
- Supabase → Sheets: pg_net webhook on new `meal_plans` row
- Meta/Google → Sheets: Ad platform APIs (Week 3)

---

## SECTION 5 — ALERT RULES (Cowork flags in session log)

| Condition | Action |
|-----------|--------|
| Beta spots = 100 (sold out) | ALERT Sarah immediately — pause all ads, activate waitlist |
| 0 signups for 3 consecutive days | Investigate landing page + ad campaigns — something is broken |
| CPA > $40 for 7-day rolling | Pause underperforming ad variant immediately |
| Grocery pushes = 0 for 2 days | Check Supabase store handoff flow for bugs |
| Trial-to-paid < 10% after 10 conversions | Review email sequence, check checkout friction |
| dinnerdrop.vercel.app returns non-200 | Flag immediately as P0 |
| dinnerdrop.app returns non-200 | Check Cloudflare Workers deployment |

---

## SECTION 6 — SARAH'S SETUP STEPS (One-time, ~10 min)

1. Go to https://sheets.new — create new spreadsheet
2. Name it: **DinnerDrop Operations Dashboard**
3. Set up Sheet 1 with structure from Section 3 (copy-paste the template above)
4. Rename Sheet 2 to "Historical Log" and Sheet 3 to "Cohort Tracker"
5. Bookmark the sheet — open it every morning before email
6. Share the sheet URL with Cowork (paste it in the Cowork chat) — Cowork will auto-append to Sheet 2

**Estimated daily time:** 2 minutes (enter 3 numbers, read 6 metrics)
**Weekly add-on:** 10 minutes (review cohort tracker, check affiliate dashboard)

---

## SECTION 7 — WEEK 1 TARGETS SUMMARY

| Metric | Target | Stretch | Kill Threshold |
|--------|--------|---------|----------------|
| Beta signups (Day 7 cumulative) | 15 | 30 | <5 → investigate |
| Trial-to-paid rate | 20%+ | 30%+ | <10% → fix emails |
| Ad CPA (blended) | <$20 | <$12 | >$40 → pause |
| Grocery lists pushed / active user | 1+ per week | 3+ per week | 0 → check bug |
| Email open rate | 35%+ | 50%+ | <25% → check Resend config |
| Onboarding completion rate | 80%+ | 90%+ | <60% → fix quiz |
| Landing page CVR (/beta) | >5% | >10% | <2% → redesign |

---

*Data sources: Stripe dashboard, Supabase table editor, Vercel Analytics, Meta Ads Manager,
Google Ads, Resend dashboard, Impact.com affiliate dashboard, associates.amazon.com*
