# DinnerDrop — Week 2 Plan (May 8–14, 2026)
*Generated: 2026-05-06 | Cowork Operating Manager*

---

## Week 1 Summary

**Status as of May 6, 2026:**
- Codebase: 60+ commits, 40+ bugs fixed, all 16 pages + 17 API routes audited and secured
- Conversion: Landing page, /beta, /beta-v2, /subscribe all optimized with social proof, urgency, and clear beta offer
- Email: Resend integration built (3 React templates, cron route) — blocked on RESEND_API_KEY
- Analytics: Vercel Analytics component added — blocked on Sarah enabling it in dashboard
- Ad copy/research: Complete — 9 RSAs, Meta creative briefs, keyword research, A/B framework — blocked on Sarah creating ad accounts
- Community content: 13 posts written for May 5–11 — blocked on BETA100 coupon + Sarah's social auth
- Beta signups: 0/100 spots claimed — BETA100 coupon not yet created in Stripe (2-min task, highest priority)

---

## Sarah's 5 Must-Do Items This Week (under 15 minutes total)

**These 5 actions unblock everything. Nothing launches until these are done.**

| # | Task | Time | Unblocks |
|---|------|------|---------|
| 1 | Create BETA100 coupon in Stripe | 2 min | ALL community posts, ALL ad campaigns |
| 2 | Run migration 005 in Supabase | 2 min | Grocery list caching, account page trial counter |
| 3 | Run migration 004 in Supabase | 2 min | Trial email automation |
| 4 | Create Resend account + add RESEND_API_KEY to Vercel | 5 min | All trial-to-paid emails |
| 5 | Enable Vercel Analytics | 30 sec | Traffic data visibility |

**Secondary (when ready):**
- Create Meta Business Manager → Facebook Page → Ad Account (25–35 min, one-time)
- Create Google Ads account in Expert Mode (25 min, one-time)
- Create og-image.png + logo.png in Canva and upload to /public/ in GitHub (20 min)

---

## Cowork Autonomous Tasks — Week 2

### May 8 (Thursday) — Unblock Detection + SEO

**If BETA100 coupon is created by May 8:**
- Post Reddit Post A (r/mealplanning founder post) via browser automation
- Log post URL and initial upvote count

**Regardless:**
- Submit sitemap to Google Search Console via browser navigation
- Check if Walmart/Instacart affiliate applications (Impact.com) have moved to approved status
- Add per-user error handling to cron/email-sequences route so one failed send doesn't abort the batch

### May 9 (Friday) — Email Automation Hardening

**If RESEND_API_KEY is in Vercel by May 9:**
- Test send-trial route: POST to /api/email/send-trial with test email
- Verify cron route queries trial_starts_at correctly (requires migration 004)

**Code improvements:**
- Add unsubscribe_url generation to trial email route (Resend compliance requirement)
- Add CRON_SECRET validation to /api/cron/email-sequences/route.ts

### May 10 (Saturday) — Ad Account Integration (if Sarah completes auth)

**If Meta Pixel ID received:**
- Add Next.js Meta Pixel integration to app/layout.tsx
- Add ConversionTracker client component (spec: docs/conversion-tracking-plan.md)
- Fire fbq('Purchase') event on /dashboard?subscribed=true

**If Google Ads Conversion ID received:**
- Add gtag.js to layout.tsx + beta_signup conversion event
- Commit "feat: Meta Pixel + Google Ads conversion tracking"

### May 11 (Sunday) — Community Posting Push

**If BETA100 exists in Stripe:**
- Post to r/mealplanning (Post A — founder story) via browser
- Schedule Facebook Group posts via browser
- Screenshot all posted content, log URLs

### May 12 (Monday) — First Performance Review

**Ad performance (if campaigns are live):**
- Check Meta Ads Manager: CTR, CPC, impressions per ad variant
- Check Google Ads: Quality Score, avg CPC, conversion rate
- Apply Day 3 optimization rules from docs/ab-test-framework-v1.md
- Pause any ad with CTR < 0.5% after 500+ impressions

**Beta signup funnel check:**
- Check /api/stripe/beta-spots for spots claimed
- If 0 signups: investigate — check Vercel logs for checkout errors
- If 1–10 signups: confirm welcome emails sent via Resend dashboard

### May 13 (Tuesday) — SEO + Content Quality

**SEO work (autonomous):**
- Research 5 high-opportunity blog post topics via WebSearch
- Create docs/seo-content-plan.md with 10 target topics + keywords
- Write first blog post draft: docs/blog-post-1.md

**Affiliate tracking:**
- Check Impact.com for Walmart + Instacart approval status via browser
- If approved: update lib/affiliate-links.ts with real affiliate IDs, commit
- If still pending (>7 days): send follow-up emails from Gmail drafts

### May 14 (Wednesday) — Week 2 Wrap-Up

- Compile Week 2 metrics: signups, ad spend, CPA, email open rates, affiliate approvals
- Write DinnerDrop_Week2_Report.md
- Update Sarah's approvals doc with current status
- Plan Week 3 priorities

---

## Week 2 Success Targets

| Metric | Target | Stretch |
|--------|--------|---------|
| Beta spots claimed | 10–25 | 40+ |
| Meta ad impressions | 5,000+ | 15,000+ |
| Google ad clicks | 30+ | 80+ |
| Reddit Post A upvotes | 10+ | 50+ |
| Trial emails sent | 1+ | 20+ |
| Affiliate approvals | 1 (Walmart or Instacart) | Both |

---

## If Beta Spots Fill Fast (>50 claimed in first 48 hours)

1. Sarah creates BETA200 coupon (next 100 spots) OR disables progress bar urgency element
2. Cowork: update hero copy to "Waitlist now open", add waitlist capture form, build /waitlist page
3. Consider increasing ad budget from $10/day → $20/day

---

## Key Decisions Deferred to Week 2

- **Product Hunt launch**: Recommend Tuesday May 12 or Wednesday May 13 (peak PH traffic).
  Launch listing ready at docs/product-hunt-listing.md. Sarah submits night before at 12:01 AM PT.
- **TikTok**: If Instagram engagement strong in Week 1, begin short-form video content in Week 2.
- **Pricing**: Keep $9/mo through beta. Evaluate $12–15/mo after 50 paying subscribers.
- **Affiliate IDs**: Swap lib/affiliate-links.ts placeholders the moment Impact.com approvals arrive.
