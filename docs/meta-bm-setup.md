# Meta Business Manager — DinnerDrop Setup Guide
**Created:** Day 2, Hour 1 — 2026-05-04
**Estimated time for Sarah:** 25–35 minutes
**URL to start:** https://business.facebook.com

---

## Prerequisites Checklist (complete before starting)

- [ ] Personal Facebook account (any existing account — does not need to be "DinnerDrop-branded")
- [ ] Two-factor authentication (2FA) enabled on that personal Facebook account ← MANDATORY
- [ ] Business email added to Facebook account (use info@dinnerdrop.app)
- [ ] dinnerdrop.app website live and accessible (confirmed: Vercel deployment is active)
- [ ] og-image.png and logo.png created in Canva (needed for Facebook Page profile/cover)
- [ ] Payment method ready (credit card for ad billing — currency/timezone CANNOT be changed later)

**Important restrictions:**
- Each personal Facebook account can only create **2 Business Managers total** (can belong to unlimited others)
- New ad accounts start with a limit of **1 ad account** — lifted after first confirmed payment
- Currency and time zone are **permanent** — set to USD / Eastern Time (or your local time zone)

---

## Step-by-Step: Create Meta Business Portfolio

### Step 1: Go to business.facebook.com
- Log in with your personal Facebook account
- Click "Create account" if prompted
- Enter: Business name = **DinnerDrop**, Your name, Business email = **info@dinnerdrop.app**

### Step 2: Enable Two-Factor Authentication (if not already done)
- Meta now **requires** 2FA for all Business Manager admins
- Go to: Facebook Settings → Security and Login → Two-Factor Authentication
- Enable via authenticator app (Google Authenticator or Authy recommended) or SMS
- **Do this before creating the Business Manager if possible**

### Step 3: Create the Business Portfolio
- At business.facebook.com → "Create account"
- Business name: **DinnerDrop**
- Email: **info@dinnerdrop.app**
- Confirm your email when Meta sends a verification link

### Step 4: Create or Add a Facebook Page
Meta requires a Facebook Page to run ads. You'll need to create one for DinnerDrop.

- Inside Business Manager → "Add assets" → "Facebook Page" → "Create new Page"
- **Page name:** DinnerDrop
- **Category:** App / Software or Food & Beverage → Mobile App
- **Description (short, 160 chars):** "AI-powered weekly dinner planning for busy families. 5 dinners planned in 30 seconds. One tap sends your grocery list to your store."
- **Website:** https://dinnerdrop.app
- **Profile photo:** Upload logo.png (512x512px — Canva deliverable)
- **Cover photo:** Upload a cropped version of og-image.png (851x315px — Canva deliverable, or create a separate version)

*Full Facebook Page content brief will be in docs/facebook-page-content.md (Day 2 Hour 2)*

### Step 5: Create an Ad Account
- Inside Business Manager → "Add assets" → "Ad account" → "Create new ad account"
- **Ad account name:** DinnerDrop
- **Time zone:** Pick YOUR local time zone ← PERMANENT, choose carefully
- **Currency:** USD ← PERMANENT, cannot change later
- **Assign yourself** as admin on the ad account (Meta requires manual assignment even for owner)

### Step 6: Add Payment Method
- Inside Ad Account → Billing → Add payment method
- Add credit card for ad spend
- **Recommended starting daily budget:** $10/day (will be adjusted per docs/ad-spend-authorization.md)
- Note: Ad account capabilities are limited until first payment is confirmed

### Step 7: Install Meta Pixel (conversion tracking)
- Business Manager → Events Manager → "Add data source" → "Web" → "Meta Pixel"
- **Pixel name:** DinnerDrop Pixel
- **Website URL:** https://dinnerdrop.app
- Choose "Manual installation" (code snippet) — Cowork will add the pixel code to the Next.js app
- Copy the Pixel ID and share with Cowork (paste in Slack or leave in a text file)

---

## Business Verification (optional but recommended)

Business verification unlocks higher ad spend limits and more trust signals. It requires:
- Government-issued ID (personal) OR
- Business documentation: business license, certificate of incorporation, or tax registration

For DinnerDrop, **skip formal business verification initially** — run ads first, verify if Meta requests it or if spend limits are hit. Most new small advertisers run without formal business verification for months.

---

## What Cowork Will Handle After Sarah Creates the Account

Once Sarah creates the Business Manager, Ad Account, and Facebook Page and shares the Pixel ID:
- Cowork writes the Meta Pixel code for the Next.js app
- Cowork builds the full campaign structure (see docs/meta-campaign-structure.md — Day 2 Hour 5)
- Cowork writes all ad copy (see docs/ad-copy-v1.md — already complete)
- Cowork prepares the complete campaign brief for Sarah to enter into Ads Manager (or can guide her through it in ~10 min)

---

## What Sarah Must Do (auth gates — cannot be delegated)

1. Create the Business Manager account (requires personal Facebook login)
2. Verify email address when Meta sends confirmation
3. Enable 2FA on personal Facebook account
4. Create the Facebook Page (inside Business Manager)
5. Create the Ad Account (inside Business Manager)
6. Add payment method / credit card
7. Complete Pixel creation and share Pixel ID with Cowork

**Estimated time:** 25–35 minutes, one-time setup

---

## After Setup: Share with Cowork

Once complete, drop these in Slack (or a text file in the cowork folder):
- Business Manager ID (found in Business Settings → Business Info)
- Ad Account ID (starts with "act_")
- Facebook Page URL
- Meta Pixel ID

Cowork will use these to finalize the campaign structure and write the pixel integration code.

---

## Google Ads Setup (companion — Day 3 prerequisite)

**URL:** https://ads.google.com

### Quick Requirements:
- Google account (can use setzl1979@gmail.com or create a dedicated one)
- Business name + website URL
- Billing country: United States
- Currency: USD (permanent — cannot change)
- Payment method (credit card)
- **New in 2026:** Google offers "pre-built campaign" setup that speeds up account creation — select this option when offered

### What Google Links to (optional but helpful):
- YouTube channel (if you have one)
- Google Business Profile (skip for now — DinnerDrop is an app, not a local business)

**Estimated time for Sarah:** 15–20 minutes

*Full Google Ads setup guide: docs/google-ads-setup.md (Day 2 Hour 7)*
