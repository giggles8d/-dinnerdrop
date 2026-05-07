# DinnerDrop — Pre-Launch Checklist
**Launch Day:** Saturday, May 9, 2026
**Status:** Use this before going live. Check every item.

---

## 🔴 CRITICAL BLOCKERS (Must complete before ANY user traffic)

- [ ] **Create BETA100 coupon in Stripe** — https://dashboard.stripe.com/coupons/create
  - ID: `BETA100` | 100% off | Repeating | 6 months | Redemption limit: 100
  - Without this, every checkout attempt fails

- [ ] **Run Supabase migrations 004, 005, 006** — https://supabase.com → SQL Editor
  - SQL scripts in: DinnerDrop_Sarah_Approvals_Needed.md
  - Without migration 004: email cron has no trial_starts_at column
  - Without migration 005: grocery list caching fails silently for all users
  - Without migration 006: unsubscribe flow fails

---

## 🟡 HIGH PRIORITY (Complete before launch for best results)

- [ ] **Create Resend account + add RESEND_API_KEY to Vercel** — https://resend.com
  - Without this: all trial emails silently skip (cron runs but sends nothing)
  - Also add: RESEND_FROM_EMAIL = `DinnerDrop <info@dinnerdrop.app>`
  - Also add: CRON_SECRET = any 32-character random string

- [ ] **Enable Vercel Analytics** — Vercel dashboard → DinnerDrop → Analytics tab → Enable
  - 30 seconds. Free. Shows real visitor data from launch day.

- [ ] **Create og-image.png + logo.png in Canva** (~20 min)
  - Full brief: docs/social-assets-brief.md
  - Upload to /public/ folder in GitHub repo after creating
  - Without this: blank social previews on every shared link and ad

---

## 🟢 SYSTEM VERIFICATION (Cowork handles)

- [x] Site loads: https://dinnerdrop.app → 200 OK
- [x] /beta page: spots counter renders, CTAs link to /subscribe?coupon=BETA100
- [x] /subscribe: coupon badge shows when ?coupon=BETA100 in URL
- [x] Middleware: /dashboard /account /history /onboarding all protected
- [x] Webhook: checkout.session.completed → sets subscription_status=trialing + trial timestamps
- [x] Email cron: route exists at /api/cron/email-sequences (fires at 10 AM EST daily via vercel.json)
- [x] Unsubscribe: /api/email/unsubscribe route + /unsubscribe page deployed
- [x] 404: branded not-found.tsx with beta CTA
- [x] SEO: all public pages have OG + Twitter card metadata
- [x] JSON-LD: SoftwareApplication schema in root layout
- [x] Sitemap: / /beta /subscribe /terms /privacy all included
- [x] robots.txt: /api/ and auth pages excluded from crawl

---

## 🔵 CONTENT READY (Cowork prepared, Sarah reviews)

- [x] Product Hunt listing: docs/product-hunt-listing.md
- [x] Launch day runbook: docs/launch-day-runbook.md
- [x] Personal network email draft: Gmail Drafts → "DinnerDrop Launch — I built something for our family"
- [x] Reddit Post A (r/mealplanning): docs/community-posts-v1.md
- [x] Facebook Group Posts D + E: docs/community-posts-v1.md
- [x] Week 1 content calendar: docs/launch-week-content-calendar.md

---

## Launch Day Order of Operations

1. Night before (May 8): Complete all 🔴 CRITICAL items
2. 12:01 AM PT May 9: Submit Product Hunt listing (Sarah, 5 min)
3. 6:00 AM PT: Send personal network email from Gmail Drafts (Sarah, 2 min)
4. 8:00 AM PT: Post Reddit Post A to r/mealplanning (Sarah, 3 min)
5. 10:00 AM PT: Post Facebook Group Posts D and E (Sarah, 5 min)
6. All day: Cowork monitors beta spots, logs hourly, replies to any Reddit/PH comments
7. End of day: Cowork compiles Day 7 metrics report

---

*Last updated by Cowork: 2026-05-07*
