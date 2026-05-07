# DinnerDrop — Day 7 Launch Briefing
**Date:** Saturday, May 9, 2026
**For:** Sarah Etzl
**Prepared by:** Cowork Operating Manager

---

## Your Day 7 at a Glance

You have 5 tasks today. Total time: ~15 minutes. Cowork handles everything else.

---

## Before You Go to Sleep (Friday Night, May 8)

### 1. Create the BETA100 Stripe Coupon [2 min, URGENT]
**Go to:** https://dashboard.stripe.com/coupons/create

| Field | Value |
|-------|-------|
| Coupon ID | `BETA100` |
| Discount | 100% off |
| Duration | Repeating |
| Months | 6 |
| Redemption limit | 100 |

Hit Create. Screenshot it. Done.

**Why this is first:** Without this, the checkout fails for every single beta user. Every link we share tomorrow goes to a broken checkout.

### 2. Run the Supabase Migrations [2 min]
**Go to:** https://supabase.com → DinnerDrop project → SQL Editor

Paste and run this single block:

```sql
-- Migration 004
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sequence_sent INTEGER[] DEFAULT '{}';

-- Migration 005
ALTER TABLE public.profiles ALTER COLUMN preferred_store SET DEFAULT 'Instacart';
UPDATE public.profiles SET preferred_store = 'Instacart' WHERE LOWER(preferred_store) = 'instacart';
CREATE POLICY "Users can update own meal plans"
  ON public.meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Migration 006
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT false;
```

Click Run. If it says "success" or "already exists" — you're done.

---

## Launch Day (Saturday, May 9)

### 12:01 AM PT — Product Hunt [5 min, Optional]
If you want to do a Product Hunt launch:
- Go to: https://www.producthunt.com/posts/new
- Copy everything from: `docs/product-hunt-listing.md` in your GitHub repo
- Submit, then immediately post the First Comment (written for you in that file)
- Share the PH link in the personal network email below

Product Hunt is optional for Day 7. If you'd rather wait for a Tuesday (higher PH traffic), skip this and just send the email.

### 6:00 AM PT — Personal Network Email [2 min]
- Open Gmail → Drafts
- Find: **"DinnerDrop Launch — I built something for our family"**
- Personalize the opening "[Name]" if sending to specific people, or leave as-is for a BCC blast
- Add your close network to BCC: family, mom friends, coworkers with kids, anyone who grocery shops
- Hit Send

### 8:00 AM PT — Reddit Post A [3 min]
- Go to: https://reddit.com/r/mealplanning
- Copy Post A from `docs/community-posts-v1.md`
- Post it. **BETA100 coupon must be active first.**

### 10:00 AM PT — Facebook Group Posts [5 min]
- Post D to meal planning groups (see `docs/community-posts-v1.md`)
- Post E to budget food/frugal groups

---

## What Cowork Handles All Day (You Do Nothing)

- Monitors https://dinnerdrop.app/api/stripe/beta-spots every hour
- Logs beta spot count, site status, any errors
- Replies to Reddit comments on your posts within 30 minutes
- Watches for Vercel build errors, Supabase issues
- Compiles full Day 7 metrics report by end of day

---

## What Success Looks Like on Day 7

| Metric | Minimum | Good | Great |
|--------|---------|------|-------|
| Beta spots claimed | 1 | 5 | 20+ |
| PH upvotes (if launched) | 5 | 20 | 50+ |
| Reddit post upvotes | 3 | 15 | 50+ |
| Personal network signups | 1 | 3 | 8+ |
| Site visitors | 20 | 100 | 300+ |

Even 1 real family signing up today is a win. The product is live. That's what Day 7 is.

---

## What's Already Done (You Don't Need to Worry About)

- ✅ 7-day free trial for non-beta users
- ✅ BETA100 coupon flow — no credit card required checkout
- ✅ Welcome email fires on signup (once RESEND_API_KEY added)
- ✅ Trial-to-paid email sequence (Days 3, 6, 7 of trial)
- ✅ Email unsubscribe flow at /unsubscribe
- ✅ A/B test: 50% of /beta traffic goes to /beta-v2 (alternate headline test)
- ✅ Stripe webhook: trialing status, trial dates, cancellation + dunning
- ✅ Custom 404 page with beta CTA
- ✅ Full SEO: OG metadata, Twitter cards, JSON-LD, sitemap, robots.txt
- ✅ All meal flow: generate, swap, favorites, history, grocery handoff (4 stores)
- ✅ Pantry scan, dietary restrictions, family size personalization
- ✅ Stripe Customer Portal for billing management
- ✅ Admin notification email to info@dinnerdrop.app on every new signup

---

## Still Blocked (After Launch, When You Have Time)

| Item | Time | Impact |
|------|------|--------|
| Resend account + API key | 5 min | Enables trial emails |
| Vercel Analytics | 30 sec | Real visitor data |
| Meta Business Manager | 25 min | Unlocks paid ads |
| Google Ads account | 25 min | Unlocks paid ads |
| Canva og-image.png + logo.png | 20 min | Better social previews |
| Impact.com check (Walmart/Instacart affiliate) | 5 min | Affiliate revenue |

You don't need these for today's launch. Get the Stripe coupon and Supabase migrations done — that's what matters most.

---

## If Something Breaks

| Problem | Where to Look | Who Fixes It |
|---------|---------------|--------------|
| Site not loading | https://vercel.com → DinnerDrop | Cowork |
| Checkout fails | https://dashboard.stripe.com | Cowork + Sarah |
| "Something went wrong" on signup | Vercel function logs | Cowork |
| Database error | https://supabase.com → DinnerDrop | Cowork |

Just message Cowork with a description of what broke. Fix within the hour.

---

## Week 2 Priorities (Cowork handles planning)

Full plan: `docs/week2-plan.md`

- Continue Reddit value-content 3x/week (not promotional)
- Reply to all comments on launch posts
- Monitor beta spots daily — if below 90, investigate conversion rate
- Once ad accounts are live: launch Meta + Google campaigns
- Affiliate follow-up emails in Gmail drafts when 7-day threshold hits

---

*Prepared by Cowork Operating Manager — 2026-05-07*
*You've built something real. Go launch it.*
