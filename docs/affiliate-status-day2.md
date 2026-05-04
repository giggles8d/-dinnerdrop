# Affiliate Program Status — Day 2 Research
**Date:** 2026-05-04
**Task:** D2H18 — Research current approval timelines, identify program status, draft follow-up emails

---

## Summary

| Program | Platform | Status | Approval Timeline | Action |
|---------|----------|--------|-------------------|--------|
| Walmart | Impact.com | Active | 24-48 hours | Follow up if >7 days |
| Amazon Associates | Amazon | Active | 180 days / 3 sales | Check application age |
| Instacart | Impact.com | Active | Manual review | Follow up if >7 days |
| Target | Impact.com | **PROGRAM ENDED Jan 5, 2026** | N/A | Remove from affiliate plan |

---

## Program-by-Program Research

### 1. Walmart Affiliate Program
**Platform:** Impact.com (managed through affiliates.walmart.com)
**Status:** Active
**Commission:** Up to 7.2% per sale (category-dependent)
**Approval timeline:** 24-48 hours for standard applications. If pending >7 days, likely stuck or soft-rejected.
Walmart does not always send rejection emails.
**Relevance to DinnerDrop:** Walmart grocery delivery/pickup links in grocery list. When users
with Walmart as preferred store tap "Shop at Walmart," affiliate link drives commissions.
**Action required:** If >7 days since application, send follow-up email (draft below).


### 2. Amazon Associates
**Platform:** associates.amazon.com (self-managed)
**Status:** Active
**Commission:** 1-10% by category; grocery/fresh typically 1%
**Approval timeline:** NOT time-based. Amazon grants 180 days from application to generate 3
qualifying sales. Once 3 sales recorded, Amazon reviews within 1-2 days. Zero sales after
180 days = automatic rejection.
**Critical note:** For DinnerDrop, qualifying sales = Amazon Fresh/Whole Foods orders via
affiliate link. Requires actual beta users clicking through AND placing orders.
**Recommended action:** Do NOT send follow-up — process is automated. Focus on onboarding
Amazon Fresh users who will click through and generate qualifying purchases.
**Priority:** Low urgency for follow-up. High urgency for driving Amazon Fresh user activity.

---

### 3. Instacart Affiliate Program
**Platform:** Impact.com (migrated from Tastemakers in 2024)
**Status:** Active
**Commission:** $5-$10 CPA per new customer order
**Payment schedule:** ~55 days after end of month purchase occurred
**Approval timeline:** Manual review; no published timeline.
**Relevance to DinnerDrop:** Instacart grocery cart handoff is a core differentiator. Affiliate
commission on new Instacart customers = $5-10 per conversion — the highest-value program.
**Note:** If using Instacart Developer Platform API for cart handoff, that approval process is
separate from the affiliate link program. Both may be pending simultaneously.
**Action required:** Send follow-up to Impact.com partner support (email draft below).


### 4. Target Affiliate Program
**Platform:** Impact.com (formerly)
**Status:** PROGRAM ENDED — January 5, 2026
**Final commission payouts:** April 2026 (for sales before Jan 5, 2026 only)
**Current state:** No new affiliates accepted. No commissions on any links after Jan 5, 2026.
**Impact on DinnerDrop:** Remove Target from affiliate revenue model. Target stays as a
preferred store option for users, but DinnerDrop earns $0 from Target purchases.
**Code status:** lib/affiliate-links.ts already uses a standard Target search URL with no
affiliate ID — this is correct. No code change needed.

---

## Revenue Impact of Target Program End

| Store | Status | Revenue Potential |
|-------|--------|-------------------|
| Walmart | Pending approval | High (largest US grocery retailer) |
| Amazon Fresh | Active (needs 3 sales) | Medium (1-3% on fresh items) |
| Instacart | Pending approval | High ($5-10 CPA on new customers) |
| Kroger | Direct cart API (not affiliate) | $0 affiliate revenue |
| Target | ENDED | $0 |

Revised model: 3 monetizable affiliate paths instead of 4.
Instacart CPA ($5-10/new customer) is the highest-value program — get this approved first.

---

## Follow-Up Email Drafts

### Email 1 — Walmart Affiliate Follow-Up
**From:** info@dinnerdrop.app
**To:** affiliates@walmart.com (or reply to Impact.com confirmation email)
**When:** If Walmart application has been pending more than 7 days

Subject: Affiliate Application Follow-Up — DinnerDrop

Hi Walmart Affiliates Team,

I'm following up on my affiliate application for DinnerDrop (dinnerdrop.app), submitted
approximately [X] days ago. I wanted to confirm receipt and check if anything is needed
to move forward.

DinnerDrop is an AI-powered dinner planning app for families. We generate weekly meal plans
and build grocery lists that connect directly to users' preferred stores. Walmart is one of
our featured stores — users who select Walmart are directed to Walmart.com for purchases.

We're in beta and approaching our public launch with 100 founding families. I'd love to have
our affiliate link active before our first users begin shopping.

If you need additional information — our website, traffic estimates, or integration
details — I'm happy to provide it.

Thanks,
Sarah Setzler
DinnerDrop | info@dinnerdrop.app | https://dinnerdrop.app


### Email 2 — Instacart Affiliate Follow-Up
**From:** info@dinnerdrop.app
**To:** Via Impact.com partner dashboard (Partners > Support) or affiliates@instacart.com
**When:** If Instacart application has been pending more than 7 days

Subject: Affiliate Application Follow-Up — DinnerDrop / Impact.com

Hi Instacart Partnerships Team,

I'm following up on my affiliate application for DinnerDrop (dinnerdrop.app) submitted
through Impact.com approximately [X] days ago.

DinnerDrop is an AI-powered meal planning app for families. Instacart is a key integration
in our app — users who select Instacart as their preferred store have their DinnerDrop
grocery list handed off directly to an Instacart cart for checkout.

We're about to launch our beta to our first 100 families and I'd like our affiliate link
active so we can track conversions from day one.

Could you confirm the current status of our application, or let me know if any additional
information is needed?

Thank you,
Sarah Setzler
DinnerDrop | info@dinnerdrop.app | https://dinnerdrop.app

---

### Note: Amazon Associates
No follow-up email needed. Process is automated. Focus on getting Amazon Fresh beta users
to click through grocery lists and place orders to generate the 3 qualifying sales.

### Note: Target
No follow-up needed. Program ended Jan 5, 2026. No action to take.

---

## Code Audit — lib/affiliate-links.ts

| Store | URL Format | Affiliate ID Status |
|-------|-----------|---------------------|
| Walmart | walmart.com/search?...&wmlspartner=REPLACE_WITH_WALMART_AFFILIATE_ID | Placeholder ready |
| Amazon Fresh | amazon.com/s?...&tag=REPLACE_WITH_AMAZON_ASSOCIATE_TAG | Placeholder ready |
| Instacart | instacart.com/store/search_v3/term?term={item} | Standard URL — no affiliate link yet |
| Target | target.com/s?searchTerm={item} | Correct — no affiliate ID (program ended) |
| Kroger | '' (empty — OAuth cart push instead) | Correct — not an affiliate integration |

No code changes needed this hour. All placeholders structured correctly.
When approvals arrive, Sarah shares IDs and Cowork swaps them in with a one-line edit each.

Instacart note: Once Impact.com approves, confirm exact affiliate URL format from the
Impact dashboard and share with Cowork to update lib/affiliate-links.ts.

---

## Action Items

### Sarah Must Do
1. Check Impact.com dashboard — find Walmart application, check submission date.
   If >7 days pending, send Email 1 above.
2. Check Impact.com dashboard — find Instacart application, check submission date.
   If >7 days pending, send Email 2 above.
3. No action on Target — program has ended, removed from revenue model.
4. No follow-up on Amazon — drive beta users to use Amazon Fresh grocery list links.

### Cowork Will Do (When IDs Received From Sarah)
- Swap REPLACE_WITH_WALMART_AFFILIATE_ID with real ID in lib/affiliate-links.ts
- Swap REPLACE_WITH_AMAZON_ASSOCIATE_TAG with real tag in lib/affiliate-links.ts
- Update Instacart URL to Impact.com referral format in lib/affiliate-links.ts

---

*Sources: affiliates.walmart.com, creator-hero.com, cuelinks.com (Walmart);
affiliate-program.amazon.com (Amazon); instacart.com/company/affiliate, wptasty.com (Instacart);
raptive.com help center, tapfiliate.com (Target program end confirmation)*
