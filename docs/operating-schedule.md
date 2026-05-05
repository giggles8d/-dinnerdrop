# DinnerDrop Operating Schedule
**Managed by:** Cowork Operating Manager
**Live site:** https://dinnerdrop.vercel.app
**GitHub:** https://github.com/giggles8d/-dinnerdrop
**Stack:** Next.js / Supabase / Stripe / Vercel

---

## DAY 1 — May 3, 2026

### HOUR 1 — Site Audit | STATUS: COMPLETE
**Commit:** f84de67
- Audited all pages for bugs, copy issues, and type errors
- Fixed /api/stripe/beta-spots static prerender (critical — was failing silently on every deploy)
- Fixed layout.tsx metadata description (removed Instacart reference)
- Renamed affiliate ID placeholders for clarity
- Renamed MealPlan.instacartLink → storeLink in types/index.ts
- Build: PASS (31 pages, zero TypeScript errors)

### HOUR 2 — SEO Metadata + Sitemap | STATUS: COMPLETE
**Commit:** 8ca8216
- Updated metadata title: "DinnerDrop — AI Dinner Planning for Busy Families"
- Updated description (7-day trial messaging)
- Added OpenGraph + Twitter card metadata with og-image.png
- Added metadataBase pointing to https://dinnerdrop.app
- Created app/sitemap.ts (/, /beta, /subscribe, /login)
- Created app/robots.ts (allow all, disallow /api/ /(app)/ /(auth)/)
- Build: PASS

### HOUR 3 — Performance and Mobile Audit | STATUS: COMPLETE
**Commit:** b468706
- Added explicit `viewport` export (Next.js 13 App Router requirement)
- Added `icons: { icon: "/favicon.ico" }` to metadata
- Added Google Fonts preconnect `<link>` tags in `<head>` for performance
- Confirmed: favicon.ico exists at app/favicon.ico (served automatically)
- Confirmed: fonts loaded via CSS @import with display=swap (functional, preconnect improves LCP)
- Confirmed: No missing viewport meta — now explicit via Viewport export
- Deferred: Replace CSS @import with next/font/google (future sprint, non-blocking)
- Deferred: Two <img> tags in recipe/[id]/page.tsx + MealCardImage.tsx (Day 1 known issue)
- Build: PASS

### HOUR 4 — Legal Pages Audit | STATUS: COMPLETE (no code changes — legal review required)
**Commit:** none (documentation only)

**Terms of Service (/terms):**
- Page exists, loads correctly, has proper metadata
- FLAGGED for Sarah: Line 82 — "Instacart cart push" in subscription tier description (update to "multi-store grocery handoff")
- FLAGGED for Sarah: Lines 118-120 — Third-Party Integrations lists only Instacart + Kroger (add Walmart, Amazon Fresh, Target)
- FLAGGED for Sarah: Subscription listed as "$9/month" — confirm this matches current Stripe pricing

**Privacy Policy (/privacy):**
- Page exists, loads correctly, has proper metadata
- FLAGGED for Sarah: Lines 99-101 — says grocery list "shared with Instacart" — update to reflect all 5 store integrations

**Cookie Policy:** No /cookie-policy page exists. Note as needed for GDPR/CCPA compliance.

**Action Required from Sarah:**
- Review and update Terms of Service section 3 and section 5
- Review and update Privacy Policy section 3
- Decide: do you need a cookie policy? (EU/California users)

### HOUR 5 — Beta Page UX Improvements | STATUS: COMPLETE
**Commit:** cd66015
- Created app/beta/layout.tsx with SEO metadata (title: "Join the DinnerDrop Beta — 6 Months Free")
- Verified: spots counter has loading state ("Loading...") and error fallback (100)
- Verified: CTA correctly links to /subscribe?coupon=BETA100
- Added "How it works" section (3-step numbered flow)
- Added FAQ section (3 questions: credit card, after 6 months, feedback)
- Build: PASS


### HOUR 6 — Ad Copy | STATUS: SCHEDULED
Write 5 Facebook/Instagram ad copy variations for the beta offer. Write 5 Google search ad headline variations (30 chars max). Write 3 Google display ad descriptions (90 chars max). Save to docs/ad-copy-v1.md and commit.

### HOUR 7 — Keyword Research | STATUS: SCHEDULED
Research top keywords for meal planning, dinner planning, grocery list apps. Identify 20 target keywords for Google Ads with estimated volume/competition. Save to docs/keyword-research-v1.md and commit.

### HOUR 8 — Email Trial-to-Paid Sequence | STATUS: SCHEDULED
Write Email 1 (Day 3 of trial), Email 2 (Day 6 of trial), Email 3 (Day 7, last chance). Save to docs/email-sequence-v1.md and commit.

### HOUR 9 — Community Research | STATUS: SCHEDULED
Research Reddit communities (r/mealplanning, r/EatCheapAndHealthy, r/budgetfood, r/Frugal, r/Parenting), Facebook groups for meal planning/busy parents. Document sizes and best posting times. Save to docs/community-targets.md and commit.

### HOUR 10 — Community Post Drafts | STATUS: SCHEDULED
Write 3 Reddit post drafts (r/mealplanning, r/EatCheapAndHealthy, r/Parenting) and 2 Facebook group post drafts — genuinely helpful, DinnerDrop mentioned naturally. Save to docs/community-posts-v1.md and commit.

### HOUR 11 — OG Image and Social Assets Brief | STATUS: SCHEDULED
Check public/og-image.png and public/logo.png existence. If missing, write detailed Canva brief for Sarah: 1200x630px, forest green background, DinnerDrop logo, "AI Dinner Planning for Busy Families" headline, gold accent. Document all missing image assets.

### HOUR 12 — Midnight Status Review | STATUS: SCHEDULED
Fetch live site and all key pages to confirm Vercel deployment is current. Check GitHub commit history. Write midnight status note to docs/midnight-checkpoint.md.

### HOUR 13 — Affiliate Application Follow-Up Research | STATUS: SCHEDULED
Research Walmart, Amazon Associates, Instacart, and Target affiliate program approval timelines. Draft follow-up emails for each pending application. Save to docs/affiliate-followup.md and commit.

### HOUR 14 — Onboarding Quiz UX Review | STATUS: SCHEDULED
Read components/OnboardingQuiz.tsx fully. Verify all 5 store options appear. Check preferredStore saves to Supabase correctly. Check for skippable required fields. Fix any issues via Python str.replace.

### HOUR 15 — Meal Generation Flow Review | STATUS: SCHEDULED
Read dashboard page and meal plan generation API routes. Check AI integration configuration. Document required env vars (OPENAI_API_KEY etc.). Check error handling on meal plan generation.

### HOUR 16 — Grocery List Flow Review | STATUS: SCHEDULED
Read app/(app)/grocery-list/page.tsx fully. Verify preferred_store fetch and pass to GroceryList. Verify ExternalLink icons for non-Kroger stores. Verify Kroger cart push button. Fix any issues found.

### HOUR 17 — Stripe Subscription Flow Review | STATUS: SCHEDULED
Read create-checkout-session/route.ts and webhook/route.ts. Verify couponCode param works. Verify webhook handles subscription.created, subscription.deleted, invoice.payment_failed events. Document missing handlers.

### HOUR 18 — Supabase Schema Review | STATUS: SCHEDULED
Read migration files and schema definitions. Verify profiles table has: preferred_store, subscription_status, trial_ends_at columns. Document any missing columns and create migration if needed.

### HOUR 19 — Error Monitoring Setup | STATUS: SCHEDULED
Research Sentry free tier, Vercel Analytics (built-in), LogRocket. Document how to enable Vercel Analytics from Vercel dashboard. Write setup instructions for Sarah (5-minute task).

### HOUR 20 — Landing Page Conversion Optimization | STATUS: SCHEDULED
Read app/page.tsx fully. Count CTAs, check social proof, check beta banner prominence. Implement 2 highest-impact copy/UX improvements via Python str.replace. Build and commit.

### HOUR 21 — Pricing Page Review | STATUS: COMPLETE
**Commit:** fce4e1f (subscribe page BETA100 coupon badge — green banner, $0/mo display, CTA copy change)

### HOUR 21b — Stripe Customer Portal | STATUS: COMPLETE
**Commit:** 280c996
- Created app/api/stripe/customer-portal/route.ts — POST endpoint, auth-gated, creates portal session, returns URL
- Created app/(app)/account/page.tsx — auto-redirects to Stripe portal; error state with back link
- Patched dashboard: past_due banner (AlertCircle, red styling), handleUpdatePayment(), upgrade banner excludes past_due

### HOUR 22 — Ad Account Setup Checklist | STATUS: COMPLETE
Read app/subscribe/page.tsx. Verify coupon=BETA100 flows to checkout. Ensure trial period is clearly communicated. Add "No credit card required for first 7 days" if missing. Make "6 months free" messaging prominent when coupon active.

### HOUR 22 — Ad Account Setup Checklist | STATUS: SCHEDULED
Research Meta Business Manager and Google Ads account requirements. Create checklist of everything needed to set up both ad accounts. Prepare DinnerDrop brand asset dimensions needed for ads. Save to docs/ad-account-setup-checklist.md and commit.

### HOUR 23 — Day 1 Wrap-Up and Metrics | STATUS: SCHEDULED
Compile complete list of all changes made on Day 1. Count: hours active, files changed, bugs fixed, features improved. Write wrap-up to docs/day1-metrics.md.

### HOUR 24 — Sarah's Daily Report | STATUS: SCHEDULED
Compile and send full Day 1 summary to info@dinnerdrop.app. Include: every task with outcome, all decisions made and why, what is blocked and needs Sarah, beta signup count, Day 2 full schedule, on-track assessment for 7-day launch.

---

## DAY 2 — May 4, 2026

### HOUR 1 — Meta Business Manager Research | STATUS: SCHEDULED
Research current Meta Business Manager setup requirements. Document all prerequisites: Facebook account, business verification requirements, phone verification. Create step-by-step setup guide. Note: Sarah must create the account herself (auth gate). Save checklist to docs/meta-bm-setup.md.

### HOUR 2 — Facebook Page Setup Preparation | STATUS: SCHEDULED
Prepare all content for DinnerDrop Facebook page: page name, category (Food & Beverage/App), about description (160 chars), website URL, profile photo dimensions (170x170), cover photo dimensions (851x315). Create Canva brief for both images if og-image.png exists. Prepare first 3 post drafts for the Facebook page.

### HOUR 3 — Instagram Business Profile Preparation | STATUS: SCHEDULED
Prepare DinnerDrop Instagram Business profile content: bio (150 chars), link in bio strategy (Linktree vs direct /beta link), first 9 grid post concepts, story highlight categories. Document all content needed before Sarah creates the account.

### HOUR 4 — Meta Ads: Audience Research | STATUS: SCHEDULED
Research Facebook audience targeting options for DinnerDrop beta: interest targeting (meal prep, family dinners, busy parents, Instacart, weekly meal planning), demographic targeting (parents with children, age 28-45, household income filters), custom audience options. Document 3 audience profiles for A/B testing. Save to docs/meta-audience-research.md.

### HOUR 5 — Meta Ads: Campaign Structure | STATUS: SCHEDULED
Design complete Meta ad campaign structure for beta offer: campaign objective (Conversions → Lead or Purchase?), ad set level (audience, placement, budget), ad level (creative, copy, CTA). Write campaign brief with recommended $10/day starting budget. Save to docs/meta-campaign-structure.md.

### HOUR 6 — Meta Ad Creative Briefs | STATUS: SCHEDULED
Write detailed creative briefs for 3 ad variants: (1) problem-aware ad (dreading Sunday meal prep), (2) benefit-led ad (5 dinners handled in 30 seconds), (3) urgency/scarcity ad (97 spots left). Specify: image concept, headline, primary text, CTA, dimensions. Save to docs/meta-ad-creatives.md.

### HOUR 7 — Google Ads: Account Research and Setup Guide | STATUS: SCHEDULED
Research Google Ads account requirements. Identify: billing setup, website verification, conversion tracking setup for Vercel apps. Write step-by-step guide for Sarah to create the account. Note what can be pre-configured vs what requires her auth.

### HOUR 8 — Google Ads: Search Campaign Structure | STATUS: SCHEDULED
Design search campaign structure using Hour 7 keyword research. Group keywords into ad groups: (1) meal planning apps, (2) dinner planning families, (3) grocery list apps. Write campaign settings: match types, bid strategy (Maximize Conversions for small budget), location (US). Save to docs/google-search-campaign.md.

### HOUR 9 — Google Search Ad Copy | STATUS: SCHEDULED
Write 3 responsive search ad variants per ad group (9 ads total). Each ad: 15 headlines (30 chars max), 4 descriptions (90 chars max). Pin the top 2 headlines for consistency. Include beta offer messaging, urgency, and clear CTAs. Save to docs/google-ad-copy.md and commit.

### HOUR 10 — Google Display Ad Assets | STATUS: SCHEDULED
Prepare Google Display Network ad assets: responsive display ad specs (headlines, descriptions, images, logos). Write 5 headlines, 5 descriptions. Specify image concepts for 1200x628, 300x250, 160x600 formats. Create Canva design brief. Save to docs/google-display-assets.md.

### HOUR 11 — Conversion Tracking Setup Plan | STATUS: SCHEDULED
Research Google Tag Manager setup for Next.js/Vercel apps. Plan conversion events: beta signup (Stripe checkout session created), trial started, subscription activated. Write implementation spec using Next.js metadata/script tags. Save to docs/conversion-tracking-plan.md.

### HOUR 12 — Midday Status Checkpoint | STATUS: SCHEDULED
Review all Day 2 work completed. Fetch live site to confirm no regressions. Pull latest git log. Write midday status note. Check if any Day 2 code tasks need Sarah's input before proceeding.

### HOUR 13 — Ad Copy Finalization and A/B Framework | STATUS: SCHEDULED
Consolidate all ad copy from Hours 5-10 into a single A/B test framework. Select 2 Meta ad variants and 2 Google search ad variants for first live test. Document hypothesis for each variant (what we're testing and why). Create docs/ab-test-framework-v1.md.

### HOUR 14 — UTM Parameter Strategy | STATUS: SCHEDULED
Design UTM parameter structure for all DinnerDrop traffic: source/medium/campaign/content naming conventions. Create UTM links for: Meta ads, Google ads, Reddit posts, Facebook groups. Build UTM link library. Save to docs/utm-strategy.md and commit to repo as lib/utm-links.ts.

### HOUR 15 — Landing Page A/B Variant | STATUS: SCHEDULED
Create a second landing page variant at app/beta-v2/page.tsx for A/B testing vs the main /beta page. Variant changes: different headline ("Dinner, handled."), different social proof angle, different CTA color/text. This will be the Meta ad destination for variant B.

### HOUR 16 — Community Post Scheduling Plan | STATUS: SCHEDULED
Review docs/community-posts-v1.md (from Day 1 Hour 10). Create posting schedule: which posts go where, what days/times, frequency rules (no more than 1 post per community per week). Document account requirements for each community (karma requirements for r/mealplanning etc.). Save to docs/community-schedule.md.

### HOUR 17 — Sarah's Approval Package: Ad Spend Authorization | STATUS: SCHEDULED
Compile complete ad spend authorization package for Sarah: (1) Meta campaign — recommended starting budget $10/day, projected reach, estimated link clicks, cost-per-click estimate; (2) Google Ads — recommended starting budget $15/day, keyword CPCs, projected clicks. Total Day 1 ad spend request: $25/day. Save as docs/ad-spend-authorization.md. BLOCKS: ad launch.

### HOUR 18 — Affiliate Status Tracking | STATUS: SCHEDULED
Check status of all 4 pending affiliate applications (Walmart, Amazon Associates, Instacart, Target). Research current approval timelines. Draft follow-up emails for any applications pending 7+ days. Note: Emails must be sent by Sarah (auth gate). Save to docs/affiliate-status-day2.md.

### HOUR 19 — Email Platform Research | STATUS: SCHEDULED
Research email marketing platforms for DinnerDrop trial-to-paid sequence: Resend (built for developers, Supabase-friendly), Postmark, Mailchimp, ConvertKit. Compare free tiers and Supabase/Next.js integration. Recommend 1 platform with setup guide. Save to docs/email-platform-recommendation.md.

### HOUR 20 — Resend / Email Integration Setup | STATUS: SCHEDULED
Based on Hour 19 recommendation (likely Resend), write the implementation plan for email sequence: Supabase edge function trigger on subscription created, email templates for Day 3/6/7, unsubscribe handling. Note: Account creation requires Sarah. Save code templates to docs/email-integration-code.md.

### HOUR 21 — Analytics Dashboard Design | STATUS: SCHEDULED
Design a DinnerDrop metrics dashboard spec: Key metrics to track daily (beta signups, trial starts, paid conversions, churn, grocery list pushes). Identify data sources (Stripe dashboard, Supabase, Vercel Analytics). Write spec for a simple Google Sheets dashboard Sarah can review in 2 minutes per day. Save to docs/metrics-dashboard-spec.md.

### HOUR 22 — Week 1 Content Calendar | STATUS: SCHEDULED
Build a 7-day social media content calendar for DinnerDrop beta launch week: 1 post/day per active platform (Facebook, Instagram, Reddit). Content types: behind-the-scenes, product demo, testimonial request, educational, urgency. Save to docs/launch-week-content-calendar.md.

### HOUR 23 — Day 2 Wrap-Up | STATUS: SCHEDULED
Compile complete list of all Day 2 changes. Total files changed, documents created, research completed. Update GitHub docs/ folder with all completed research. Write Day 2 metrics summary.

### HOUR 24 — Sarah's Day 2 Report | STATUS: SCHEDULED
Compile and send full Day 2 summary to info@dinnerdrop.app. Include: all ad campaigns ready to launch (pending Sarah's budget authorization), community posts ready to deploy, all research completed, what is blocked, Day 3 schedule, on-track assessment.

---

## DAYS 3–7 SUMMARY

### DAY 3 — May 5, 2026: Launch Prep + First Ads Live
**Theme:** Ad accounts activated, first campaigns live (pending Sarah's authorization from Day 2)
- Hours 1-4: Guide Sarah through Meta Business Manager and Facebook Page creation (Sarah must do auth steps)
- Hours 5-8: Launch Meta beta campaign (after Sarah approves budget and creates ad account)
- Hours 9-12: Launch Google Ads search campaign (after Sarah creates account and approves budget)
- Hours 13-16: Monitor first ad performance, adjust bids, document CPCs
- Hours 17-20: Write and schedule first week of social media posts via Buffer/Publer
- Hours 21-24: Day 3 report + Day 4 planning

### DAY 4 — May 6, 2026: Email + Automation Setup
**Theme:** Onboarding email sequence live, Resend integration built
- Hours 1-4: Implement Resend (or chosen platform) email integration into Next.js
- Hours 5-8: Build Supabase edge function to trigger email on trial_start
- Hours 9-12: Test full trial-to-paid email sequence end-to-end
- Hours 13-16: Build automated beta signup notification (email Sarah when new beta user joins)
- Hours 17-20: First ad performance review — pause underperformers, scale winners
- Hours 21-24: Day 4 report + Day 5 planning

### DAY 5 — May 7, 2026: Conversion Rate Optimization
**Theme:** Landing page optimized based on first 48 hours of ad data
- Hours 1-4: Review ad performance data; identify lowest-performing pages in funnel
- Hours 5-8: Implement landing page improvements (social proof, urgency, testimonial section)
- Hours 9-12: Fix any Stripe checkout friction (add "No credit card for 7 days" confirmation)
- Hours 13-16: Create and test /beta-v2 A/B variant
- Hours 17-20: Reddit community post launch (Day 1 posts go live)
- Hours 21-24: Day 5 report + Day 6 planning

### DAY 6 — May 8, 2026: Product Quality + App Polish
**Theme:** Core user flow hardened, first beta users may be signing up
- Hours 1-4: Full end-to-end user flow test (signup → onboarding → meal plan → grocery list → store handoff)
- Hours 5-8: Fix any bugs found in user flow
- Hours 9-12: Add loading states and error handling to any weak spots in the UI
- Hours 13-16: Improve onboarding quiz UX (add progress indicator, smoother transitions)
- Hours 17-20: Create DinnerDrop welcome email template for new beta users
- Hours 21-24: Day 6 report + Day 7 planning

### DAY 7 — May 9, 2026: Launch Day
**Theme:** First official public launch push — beta slots filling
- Hours 1-4: Launch day prep — confirm all systems are green (site, Stripe, Supabase, email)
- Hours 5-8: Send launch announcement to Sarah's personal network (draft for Sarah to send)
- Hours 9-12: Post to Product Hunt (prepare listing — Sarah must submit)
- Hours 13-16: Monitor beta signup rate, respond to any support inquiries
- Hours 17-20: Launch day social media push across all platforms
- Hours 21-22: First beta signup check — how many of 100 spots claimed?
- Hours 23-24: Full week 1 retrospective report to Sarah

---

## COMMIT LOG

| Date | Commit | Hour | Description |
|------|--------|------|-------------|
| 2026-05-03 | f84de67 | H1 | Day 1 audit — 4 bugs fixed |
| 2026-05-03 | 8ca8216 | H2 | SEO metadata, sitemap, robots |
| 2026-05-03 | b468706 | H3 | Viewport, favicon meta, font preconnect |
| 2026-05-03 | cd66015 | H5 | Beta page metadata, How it works, FAQ |

## SARAH'S ACTION ITEMS (Prioritized)

1. **URGENT — Create BETA100 coupon in Stripe** (2 min)
   - Go to: https://dashboard.stripe.com/coupons/create
   - Coupon ID: `BETA100` | Discount: 100% off | Duration: Repeating, 6 months

2. **Legal pages review** — Terms of Service and Privacy Policy have stale Instacart references (legal docs, must be updated by Sarah)

3. **Create Meta Business Manager account** (Day 3 prerequisite) — https://business.facebook.com

4. **Create Google Ads account** (Day 3 prerequisite) — https://ads.google.com

5. **Authorize ad spend** — Review docs/ad-spend-authorization.md when ready (Day 2 Hour 17)

6. **Missing image assets** — og-image.png and logo.png needed (see Canva brief when created in Hour 11)
