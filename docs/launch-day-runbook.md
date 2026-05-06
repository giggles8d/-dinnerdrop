# DinnerDrop Launch Day Runbook
**Launch Day:** Saturday, May 9, 2026 (Day 7)
**Target:** Fill all 100 beta spots | **Price:** $0 for 6 months, then $9/month

---

## Pre-Launch Checklist (Sarah — 10 min, Night Before)

- [ ] Confirm BETA100 coupon is active: https://dashboard.stripe.com/coupons
- [ ] Test the full flow: https://dinnerdrop.app/beta → Subscribe → Onboarding (take <5 min)
- [ ] Log into Reddit account and verify it's ready to post
- [ ] Join target Facebook groups if not already done (see docs/community-schedule.md)
- [ ] Have Product Hunt listing text ready to paste (docs/product-hunt-listing.md)

---

## Launch Day Hour-by-Hour

### 12:01 AM PT — Product Hunt Submit (Sarah, 5 min)
- Go to: https://www.producthunt.com/posts/new
- Paste tagline, description, and first comment from: docs/product-hunt-listing.md
- URL: https://dinnerdrop.app
- Topics: Productivity, Food & Drink, Artificial Intelligence, Family, SaaS
- Submit and immediately post the First Comment (already written — copy/paste)
- Share the PH link in the personal network email (Cowork draft in Gmail)

### 6:00 AM PT — Personal Network Email (Sarah, 2 min)
- Open Gmail → Drafts folder → "DinnerDrop Launch — I built something for our family"
- Read it once, personalize the opening line if desired, then hit Send
- BCC your close network (friends, family, former colleagues who have families)

### 8:00 AM — Reddit Post A (Sarah, 3 min)
- Go to r/mealplanning (https://reddit.com/r/mealplanning)
- Post the founder story from: docs/community-posts-v1.md (Post A)
- BETA100 coupon must be active before posting

### 10:00 AM — Facebook Group Posts (Sarah, 5 min)
- Post D to busy moms / meal planning groups
- Post E to budget food / frugal groups
- Full copy in: docs/community-posts-v1.md

### All Day — Instagram Stories (Sarah, optional, 2 min each)
- Story 1 (9 AM): "We launched! 🎉" + swipe up to /beta
- Story 2 (12 PM): Spot counter screenshot ("X of 100 spots left")
- Story 3 (6 PM): Final push — "Spots are filling up"

---

## Cowork Handles All Day (No Sarah Action Needed)

- Monitor /api/stripe/beta-spots every hour — log the count
- Check Vercel for any build failures or 500 errors
- Monitor GitHub for any new issues filed
- Reply to Reddit comments within 30 min of posting
- Log all metrics to DinnerDrop_Session_Log.md

---

## If Spots Fill Before End of Day

Cowork will:
1. Update the landing page stats bar to show "All 100 spots claimed!"
2. Add a waitlist CTA (email field → saves to Supabase) in place of the beta CTA
3. Draft a "You're on the waitlist" auto-response email for Sarah to review

---

## Emergency Contacts / URLs

| System | URL | Issue |
|--------|-----|-------|
| Vercel | https://vercel.com/dashboard | Site down |
| Supabase | https://supabase.com/dashboard | DB errors |
| Stripe | https://dashboard.stripe.com | Payment failures |
| GitHub | https://github.com/giggles8d/-dinnerdrop | Code issues |

---

## Day 7 Success Metrics

| Metric | Target | Stretch |
|--------|--------|---------|
| Beta spots claimed | 5+ | 20+ |
| PH upvotes | 10+ | 50+ |
| Reddit post upvotes | 5+ | 50+ |
| Site visitors | 50+ | 200+ |
| Email signups | All trial users get welcome email | — |

*Cowork will compile full Day 7 metrics report by 11 PM.*
