# DinnerDrop Ad Account Setup Checklist
**Day 1 Hour 22 | Created:** 2026-05-05
**Purpose:** Everything Sarah needs to set up Meta and Google ad accounts before Cowork can build the campaigns.

---

## STATUS SUMMARY

| Platform | Account Exists? | Campaign Ready? | Blocker |
|----------|----------------|-----------------|---------|
| Meta Ads | ❌ Not yet | ❌ Blocked | Sarah must create BM (auth gate) |
| Google Ads | ❌ Not yet | ❌ Blocked | Sarah must create account (auth gate) |
| YouTube Ads | ❌ Not yet | ❌ Blocked | Needs Google Ads account first |

All ad copy, audience research, campaign architecture, creative briefs, and UTM links are **fully written and ready to deploy** — the only remaining step is Sarah completing the auth-gated account creation.

---

## PART 1: META (FACEBOOK + INSTAGRAM) ADS

### Estimated time: 25–35 minutes (one-time)

### Prerequisites — confirm before starting
- [ ] Personal Facebook account exists and 2FA is enabled
- [ ] Business email info@dinnerdrop.app is added to your Facebook account settings
- [ ] og-image.png and logo.png are uploaded to `/public/` in GitHub (blocks ad creatives)

### Step-by-step checklist

**Step 1 — Create Meta Business Manager**
- [ ] Go to https://business.facebook.com/overview
- [ ] Click "Create Account"
- [ ] Business name: `DinnerDrop`
- [ ] Your name: Sarah Etzl
- [ ] Business email: info@dinnerdrop.app
- [ ] Submit → verify email

**Step 2 — Create Facebook Page inside BM**
- Full content ready at: `docs/facebook-page-content.md`
- [ ] Page name: DinnerDrop
- [ ] Category: App / Software
- [ ] Description (copy from facebook-page-content.md)
- [ ] CTA button: "Sign Up" → https://dinnerdrop.app/beta

**Step 3 — Create Ad Account inside BM**
- [ ] Business Settings → Accounts → Ad Accounts → Add → Create new
- [ ] Ad account name: DinnerDrop Beta Launch
- [ ] Currency: **USD** (PERMANENT — cannot change)
- [ ] Time zone: **your local timezone** (PERMANENT — cannot change)

**Step 4 — Add Payment Method**
- [ ] Business Settings → Payment Methods → Add credit/debit card
- ⚠️ STOP POINT — Cowork cannot enter payment info. Sarah must do this.

**Step 5 — Create Meta Pixel**
- [ ] Events Manager → Connect Data Sources → Web → Meta Pixel
- [ ] Pixel name: DinnerDrop Website
- [ ] Website URL: https://dinnerdrop.app
- [ ] Copy the **Pixel ID** (format: 15-digit number)
- [ ] Share Pixel ID with Cowork → Cowork will add `fbq('track', 'Purchase')` to Next.js

**Step 6 — Share these values with Cowork**
After setup is complete, tell Cowork:
1. Meta Pixel ID (15-digit number from Events Manager)
2. Confirmation that payment method is active

**What Cowork does next (unblocked after Step 6):**
- Adds Meta Pixel to `app/layout.tsx`
- Adds `ConversionTracker` component to `/dashboard?subscribed=true`
- Launches Ad Set A — Busy Parent ($5/day) with 2 ad variants from `docs/meta-ad-creatives.md`

---

## PART 2: GOOGLE ADS (SEARCH + YOUTUBE)

### Estimated time: 25 minutes (one-time)

### Prerequisites — confirm before starting
- [ ] Google account for setzl1979@gmail.com is accessible
- [ ] Billing card is ready (Google requires billing before campaign goes live)

### Step-by-step checklist

**Step 1 — Create Google Ads account**
- [ ] Go to https://ads.google.com
- [ ] Sign in with setzl1979@gmail.com
- [ ] Click "Switch to Expert Mode" (small text link at the bottom of the setup screen — DO NOT skip this)
- [ ] Choose "Create a campaign without a goal's guidance"

**Step 2 — Set account defaults (PERMANENT)**
- [ ] Currency: **USD**
- [ ] Time zone: **your local timezone**
- ⚠️ These cannot be changed after creation

**Step 3 — Add billing**
- [ ] Billing → Add payment method
- ⚠️ STOP POINT — Cowork cannot enter payment info. Sarah must do this.

**Step 4 — Create 2 conversion actions**
- [ ] Tools → Conversions → New conversion action → Website
- **Conversion 1:** Name: `beta_signup` | Category: Purchase | Value: $0 (free beta) | Count: One
- **Conversion 2:** Name: `trial_start` | Category: Sign-up | Value: $0 | Count: One
- [ ] Copy the **Conversion ID** (format: AW-XXXXXXXXX)
- [ ] Copy both **conversion labels** (format: XXXXXXXXXXXXXXXXXXX/XXXX)

**Step 5 — Verify dinnerdrop.app in Search Console**
- [ ] Go to https://search.google.com/search-console
- [ ] Add property → URL prefix → https://dinnerdrop.app
- [ ] Choose "HTML tag" verification method
- [ ] Copy the content attribute value from the meta tag (format: `xxxxxxxxxxxxxxxxxxxxx`)
- [ ] Share the tag content with Cowork → Cowork adds it to `app/layout.tsx`

**Step 6 — Share these values with Cowork**
After setup is complete, tell Cowork:
1. Google Ads Conversion ID (AW-XXXXXXXXX)
2. beta_signup conversion label
3. trial_start conversion label
4. Search Console HTML verification tag content (optional but recommended)

**What Cowork does next (unblocked after Step 6):**
- Adds `gtag.js` to `app/layout.tsx` with your Conversion ID
- Adds `ConversionTracker` component firing both conversion events on trial start
- Launches 3-ad-group Search campaign from `docs/google-search-campaign.md` at $5/day
- Activates YouTube video campaign from `docs/youtube-ad-brief.md` at $5/day

---

## PART 3: BRAND ASSETS (blocks ALL ad platforms)

### Estimated time: 20–25 minutes in Canva

Full design brief: `docs/social-assets-brief.md`

- [ ] **og-image.png** (1200×630px) — forest green bg, "Dinner, handled." headline, gold badge
- [ ] **logo.png** (512×512px) — square brand mark for ad account brand kits
- [ ] Upload both to `/public/` folder in GitHub repo (create `/public/` if it doesn't exist)
- [ ] Verify at: https://dinnerdrop.vercel.app/og-image.png after upload

---

## PART 4: STRIPE BETA100 COUPON (blocks all community posts)

### Estimated time: 2 minutes

- [ ] Go to https://dashboard.stripe.com/coupons/create
- [ ] Coupon ID: `BETA100` (exact — case sensitive)
- [ ] Discount type: Percentage — **100% off**
- [ ] Duration: Repeating | Number of months: **6**
- [ ] Redemption limit: **100**
- [ ] Click Create Coupon

⚠️ Do this BEFORE any Reddit or Facebook posts go live — the posts promote the 6-month beta and link to `/beta` which applies BETA100 at checkout.

---

## LAUNCH SEQUENCE (recommended order)

1. **BETA100 coupon in Stripe** (2 min) → unblocks Reddit + Facebook posts
2. **og-image.png + logo.png in Canva** (20–25 min) → unblocks all ad creatives
3. **Meta Business Manager + Facebook Page** (25–35 min)
4. **Google Ads account** (25 min)
5. **Share Pixel ID + Conversion ID with Cowork**
6. **Cowork builds tracking code + launches campaigns** (~30 min automated)

**Total Sarah time:** ~80 minutes one-time → fully automated after that.

---

## AD COPY AND RESEARCH (all complete — ready to deploy)

| Document | Status | Path |
|----------|--------|------|
| Meta ad creative briefs | ✅ Ready | docs/meta-ad-creatives.md |
| Meta campaign architecture | ✅ Ready | docs/meta-campaign-structure.md |
| Meta audience research | ✅ Ready | docs/meta-audience-research.md |
| Google Search campaign | ✅ Ready | docs/google-search-campaign.md |
| Google ad copy (9 RSAs) | ✅ Ready | docs/google-ad-copy.md |
| Google Display assets | ✅ Ready | docs/google-display-assets.md |
| YouTube ad brief | ✅ Ready | docs/youtube-ad-brief.md |
| A/B test framework | ✅ Ready | docs/ab-test-framework-v1.md |
| UTM link library | ✅ Ready | lib/utm-links.ts |
| Ad spend authorization | ✅ Ready | docs/ad-spend-authorization.md |

*Generated by DinnerDrop Operating Manager | Day 1 Hour 22 | 2026-05-05*
