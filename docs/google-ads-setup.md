# Google Ads Account Setup Guide — DinnerDrop
*Day 2, Hour 7 — Generated 2026-05-04*

---

## Overview

This guide covers everything needed to launch Google Ads for DinnerDrop's beta campaign.
Structured in two tracks:
- **Sarah must do (auth-gated):** Account creation, billing, verification
- **Cowork will build:** Conversion tracking code, campaign config files, keyword lists

**Estimated Sarah time:** 25–40 minutes (one-time setup)
**Launch dependency:** Google Ads account + billing active before Day 3 campaign launch

---

## Part 1: Prerequisites (Before You Start)

### What You Need Ready
1. **Google Account** — use `setzl1979@gmail.com`
   - Gmail accounts have fewer new-advertiser friction points than Google Workspace accounts
2. **Website live:** dinnerdrop.app — CONFIRMED LIVE
3. **Payment method:** Credit or debit card (fastest approval — verified instantly)
4. **Business phone:** 16072871236
5. **Business address:** Your home or CAMCO address (billing verification only, not publicly shown)


---

## Part 2: Create the Account

### Step 1 — Go to ads.google.com
- URL: https://ads.google.com
- Click **"Start now"** (top right)
- Sign in with your Google account

### Step 2 — Switch to Expert Mode IMMEDIATELY
Google defaults to "Smart Campaigns" (simplified mode). Switch before creating anything.

**Why Expert Mode:**
- Smart Mode locks you into automated campaigns with almost no control
- Expert Mode gives full access to Search, Display, and Performance Max campaigns
- You cannot retroactively get campaign-level data or keyword-level bidding in Smart Mode
- Expert Mode can be turned on from day one with zero extra cost or complexity

**How to switch:**
- On the "Create your first campaign" screen, scroll to the very bottom
- Click the small link: **"Switch to Expert Mode"**
- If you miss it and land in Smart Mode: Tools → Settings → Switch to Expert Mode

### Step 3 — Create Account Without a Campaign
- After switching to Expert Mode, click **"Create an account without a campaign"** (small link at bottom)
- This skips the campaign wizard so you can set up billing first
- If no skip option appears: create a dummy Search campaign, then delete it after billing is confirmed


---

## Part 3: Billing Setup

### Step 4 — Add Payment Method
Navigation: **Billing → Payment methods**

Settings to use:
- **Account type:** Business
- **Business name:** DinnerDrop (or Sarah Setzl)
- **Country:** United States
- **Currency:** USD — ⚠️ PERMANENT, cannot be changed after creation
- **Timezone:** Your local timezone — ⚠️ PERMANENT, cannot be changed after creation
- **Payment method:** Credit or debit card

### Step 5 — Billing Activation
- Google charges a small test authorization (~$1) to verify your card — refunded automatically
- New accounts default to **automatic payments** (charged when threshold hit or monthly)
- Daily budget cap is your main cost protection — Cowork will set this at $5/day for week 1
- No minimum spend required

**Monthly Budget Context:**
- Google Ads allocation: $150/month (~$5/day)
- Week 1: $5/day Search only
- Cowork will build the exact campaign with keyword bids before Sarah launches it

---

## Part 4: Website Verification

### Step 6 — Google Search Console Setup
Google Ads requires ownership verification of dinnerdrop.app for full conversion tracking.

**Recommended method (HTML tag — works with Vercel):**
1. Go to: https://search.google.com/search-console
2. Click **"Add property"** → URL prefix → enter `https://dinnerdrop.app`
3. Choose verification: **HTML tag**
4. Copy the `<meta name="google-site-verification" content="XXXX" />` tag
5. Share the tag content value with Cowork — we will add it to `app/layout.tsx` and deploy
6. Return to Search Console and click **Verify**

**Step 7 — Link Search Console to Google Ads:**
- In Google Ads: Tools → Setup → Linked Accounts → Google Search Console
- Select your verified dinnerdrop.app property → Link


---

## Part 5: Conversion Tracking Setup

### Step 8 — Create Conversion Actions in Google Ads
Navigation: **Goals → Conversions → + New conversion action → Website**

**Create Conversion Action 1: Beta Signup**
- Conversion name: `beta_signup`
- Category: Purchase
- Value: $9.00 (matches subscription price — enables ROAS bidding later)
- Count: One (one signup per user = one conversion)
- Click-through window: 30 days
- Attribution model: Data-driven (default — keep)

**Create Conversion Action 2: Trial Start**
- Conversion name: `trial_start`
- Category: Begin checkout
- Value: $0.00 (leading indicator, not revenue)
- Count: One
- Attribution: Data-driven

After creating each action, Google provides:
- **Conversion ID** — format: `AW-1234567890`
- **Conversion label** — format: `AbCdEfGhIjKlM`

**Action Required:** Share both the Conversion ID and both conversion labels with Cowork.
Cowork will embed them in the Next.js tracking code.

---

## Part 6: Conversion Tag Implementation (Cowork Builds This)

Once Sarah shares the Conversion ID + labels, Cowork will implement:

**A — Global gtag in app/layout.tsx:**
```tsx
import Script from 'next/script'
// Added inside root layout:
<Script src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXXX" strategy="afterInteractive" />
<Script id="google-ads-init" strategy="afterInteractive">{`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-XXXXXXXXXX');
`}</Script>
```

**B — Beta signup conversion fire on success page:**
```tsx
// app/beta/success/page.tsx (Cowork will create this page)
useEffect(() => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: 'AW-XXXXXXXXXX/beta_signup_label',
      value: 9.0,
      currency: 'USD'
    });
  }
}, []);
```

**Cowork will build and commit both** as part of Day 3 pre-launch code tasks.


---

## Part 7: Advertiser Verification

### What to Expect
Google triggers advertiser verification when you submit first campaigns or cross spend thresholds.

**For DinnerDrop (meal planning app — NOT financial services):**
- No special financial services verification required (that applies only to crypto, consumer loans, BNPL)
- Standard path: email confirmation + billing address match
- If additional verification triggered: US government-issued photo ID (driver's license acceptable)
- Timeline if triggered: 1–3 business days (should not block first week's campaign launch)

---

## Part 8: Sarah's Complete Action Checklist

| Step | Task | Time | Who |
|------|------|------|-----|
| 1 | Go to ads.google.com, sign in with Gmail | 2 min | Sarah |
| 2 | Switch to Expert Mode | 1 min | Sarah |
| 3 | Skip campaign creation wizard | 1 min | Sarah |
| 4 | Add billing: card + USD + correct timezone | 3 min | Sarah |
| 5 | Wait for card authorization to clear | 2 min | Sarah |
| 6 | Set up Google Search Console for dinnerdrop.app | 5 min | Sarah |
| 7 | Copy HTML verification tag — send to Cowork | 1 min | Sarah |
| 8 | Link Search Console to Google Ads | 2 min | Sarah |
| 9 | Create beta_signup conversion action | 3 min | Sarah |
| 10 | Create trial_start conversion action | 2 min | Sarah |
| 11 | Send Conversion ID + both labels to Cowork | 1 min | Sarah |
| 12 | Cowork builds tracking code + campaign | — | Cowork |
| 13 | Sarah approves $5/day budget and launches | 2 min | Sarah |

**Total Sarah time: ~25 minutes (one-time)**

---

## Day 3 Campaign Launch Plan

Once account is active:

**Campaign: DinnerDrop Beta — Search**
- Objective: Conversions → beta_signup
- Bid strategy: Maximize Conversions (no target CPA yet — not enough data week 1)
- Daily budget: $5/day
- Match types: Phrase + Exact (no broad match in week 1)
- Location: United States
- Language: English
- Ad schedule: All days, all hours initially

**Ad Groups (from keyword-research-v1.md):**
1. Meal Planning Apps — 40% of budget
2. AI Meal Planner — 35% of budget
3. Family Dinner Planning — 25% of budget

**Week 1 Projected Performance at $5/day:**
- Impressions: 200–500/day
- Clicks: 15–40/day (CTR 6–8% for high-intent meal planning queries)
- CPC range: $1.40–$2.50
- Weekly spend: $35
- Beta signups (Google only): 2–6 (10–15% landing page conversion rate)

---

## Key Decisions and Rationale

1. **Expert Mode over Smart Mode** — Full keyword control, CPA visibility, and ad-group-level reporting are essential for budget optimization. Smart Mode optimizes for clicks, not conversions.

2. **Search-only in week 1, not Performance Max** — PMax requires 50+ conversions/month to exit learning phase. With zero data at launch, keyword-targeted Search outperforms PMax.

3. **$5/day starting budget** — Conservative week 1 to gather CPC data before scaling. Will increase to $10/day by Day 7 if CPA is at or below $15.

4. **Conversion value = $9.00** — Matches subscription price. Enables ROAS-based bidding (target 900%) once 50+ conversions are recorded (estimated by week 5–8 if beta signups track).

5. **No Display Network in week 1** — Display relies on audience remarketing. Zero site visitors at launch means zero remarketing pool. Activate in week 3 once Search has built a site visitor pool.

6. **Maximize Conversions bid strategy** — Preferred over Target CPA at launch because Target CPA needs historical data. Switch to Target CPA (target: $15) after 30+ conversions recorded.
