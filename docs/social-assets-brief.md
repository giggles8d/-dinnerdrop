# DinnerDrop Social & Brand Assets Brief
**Created:** 2026-05-04 — Day 1, Hour 11
**Status:** WAITING ON SARAH — Canva design required

---

## Asset Audit Results

### MISSING (Critical — Blocks Ads and Social Sharing)

| Asset | Path | Referenced In | Impact |
|-------|------|---------------|--------|
| `og-image.png` | `/public/og-image.png` | `app/layout.tsx` (lines 10, 18), `app/beta/layout.tsx` (line 9) | **HIGH** — Every social share and ad link preview shows blank/broken image |
| `logo.png` | `/public/logo.png` | Not yet referenced — needed for ads and brand kit | **MEDIUM** — Required for Google Display ads, Meta ad creative |

### EXISTS (Good)

| Asset | Path | Status |
|-------|------|--------|
| `favicon.ico` | `app/favicon.ico` | Exists, served automatically by Next.js App Router |

---

## PRIORITY 1: OG Image (1200x630px)

**This is the preview image shown when someone shares dinnerdrop.app or clicks a Meta/Google ad.**
**Without it, social previews and ad link previews are blank. This blocks all ad campaigns.**

### Canva Brief — OG Image

**File name:** `og-image.png`
**Dimensions:** 1200 x 630 px (exact — Facebook/Twitter/LinkedIn standard)
**Destination:** Upload to `/public/og-image.png` in the GitHub repo

**Design Spec:**

**Background:**
- Solid fill: `#1a5c38` (DinnerDrop forest green)
- Optional: Very subtle noise texture or diagonal grain for depth

**Left Side (~55% of width):**
- Small badge (optional): White rounded pill — "AI-powered" in gold `#e8a838`
- Headline (large, white): **"Dinner, handled."**
  - Font: Inter 800 or Playfair Display Bold
  - Size: ~72-80pt equivalent
  - Color: White `#ffffff`
- Subhead below headline: "5 dinners planned. Grocery list ready. One tap."
  - Font: Inter Regular or Medium
  - Size: ~28-32pt
  - Color: White at 80% opacity or `#c8e6c9`
- Bottom badge: Gold `#e8a838` rounded rectangle — "7-Day Free Trial" in dark green, bold

**Right Side (~45% of width):**
- Stylized phone mockup OR illustrated plate/bowl in white/gold
- OR: Simple icons (fork + phone + cart) arranged vertically
- Canva search terms: "meal planning phone mockup" or "dinner plate minimal illustration"
- Keep clean — white or gold illustration on green background only

**DinnerDrop Wordmark (bottom-left corner):**
- Gold dot `●` followed by "DinnerDrop" in white, Inter Bold, ~24pt
- Matches the site header logo design

**Overall feel:** Premium, clean, confident. Not busy.

---

## PRIORITY 2: Square Logo (512x512px)

**Needed for:** Google Ads (required), Meta ad accounts, brand kit.

### Canva Brief — Square Logo

**File name:** `logo.png`
**Dimensions:** 512 x 512 px
**Background:** Transparent OR solid forest green `#1a5c38`

**Design:**
- Center: A stylized "D" or fork/plate icon in gold `#e8a838`
- OR: The gold dot `●` from the site header, large, centered on green background
- Below icon: "DinnerDrop" wordmark in white, Inter Bold
- Must read clearly at 32x32px thumbnail size — keep it extremely simple

---

## PRIORITY 3: Meta Ad Creative Images (1080x1080px square)

**After OG image is done. 3 variants for Facebook/Instagram feed ads.**

### Variant 1: Problem-Aware
- Background: Warm kitchen stock photo (busy mom, 6pm, cluttered counter) — dark overlay ~50%
- Text: "Sound familiar?" (white italic, 36pt) + "Sunday. No plan. Everyone's hungry." (white bold, 48pt)
- Bottom bar: Gold `#e8a838` strip — "DinnerDrop fixes this in 30 seconds →"

### Variant 2: Benefit-Led
- Background: Clean flat-lay of 5 meal cards on forest green `#1a5c38`
- Text: "5 dinners. Planned." (white, large, bold) + "AI-powered. Groceries included." (white, smaller)
- DinnerDrop wordmark bottom-right corner

### Variant 3: Urgency/Scarcity
- Background: Forest green `#1a5c38` solid
- Center: Gold number — "97 spots left" (very large, `#e8a838`)
- Below: "6 months free. Beta program closes soon." (white)
- Bottom: White rounded pill CTA — "Get your spot →"

---

## What Sarah Needs to Do

1. Open Canva (canva.com) — create a Custom Size design: 1200 x 630 px
2. Build the OG image using the brief above (~10 min)
3. Download as PNG, name it `og-image.png`
4. Go to GitHub: https://github.com/giggles8d/-dinnerdrop
5. Create a `public/` folder in the repo root, upload `og-image.png`
6. Repeat for `logo.png` (512x512px, ~5 min)
7. Meta ad creatives can wait until Day 3 (ad account setup)

**Estimated Sarah time: ~20-25 minutes total**
**Unblocks: All social sharing previews + every ad campaign**

---

## Technical Notes

- Next.js App Router serves `/public/` files at the root URL automatically
- After upload, verify at: `https://dinnerdrop.vercel.app/og-image.png`
- Facebook sharing debugger (clears cache): https://developers.facebook.com/tools/debug/
- Twitter card validator: https://cards-dev.twitter.com/validator
