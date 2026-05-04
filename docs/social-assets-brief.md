# DinnerDrop Social Assets Brief
**Created:** Day 1, Hour 11 — 2026-05-04
**Status:** ACTION REQUIRED from Sarah (~20-25 min in Canva)

---

## CRITICAL FINDING: /public/ folder does not exist

The `/public/` folder is **missing from the repo entirely**. Both `og-image.png` and `logo.png` are referenced in code but do not exist:

- `app/layout.tsx` references `/og-image.png` for OpenGraph metadata
- `app/beta/layout.tsx` references `/og-image.png` for beta page social sharing

**Impact:** Every social media share, Facebook/Twitter card preview, and ad link preview shows a broken/blank image. This blocks all ad campaigns from launching with proper creative.

**Only confirmed image asset:** `favicon.ico` at `app/favicon.ico` (served correctly by Next.js App Router).

---

## Deliverable 1: og-image.png (URGENT — blocks ad launch)

**Dimensions:** 1200 × 630 px (standard OpenGraph)
**File name:** `og-image.png`
**Upload to:** `/public/og-image.png` in GitHub repo

### Design Spec
- **Background:** Forest green `#1a5c38` (solid fill)
- **Headline:** "Dinner, handled." — white, bold serif or heavy sans-serif, ~80–100px, centered or left-aligned
- **Subheadline:** "AI-powered weekly dinner planning for busy families" — white, lighter weight, ~32px
- **Badge (top-right or bottom-right):** Gold `#e8a838` rounded pill — "7-Day Free Trial"
- **Visual element:** Right side — simple phone mockup or meal card icon illustration (can use Canva stock)
- **Logo/wordmark:** Bottom-left — "DinnerDrop" in gold `#e8a838`, small (40px), with a fork-dot icon if available
- **Overall feel:** Clean, confident, premium. Not busy. Think Calm app meets food delivery.

---

## Deliverable 2: logo.png (needed for ad account brand kits)

**Dimensions:** 512 × 512 px (square, for Google/Meta ad accounts)
**File name:** `logo.png`
**Upload to:** `/public/logo.png` in GitHub repo

### Design Spec
- **Background:** Forest green `#1a5c38` (square, can have slight rounded corners)
- **Mark:** Gold `#e8a838` stylized "D" with a small fork or drop element — or just clean wordmark "DD"
- **Style:** Simple, legible at small sizes. Must look good as a 32px favicon equivalent.
- **Avoid:** Gradients, drop shadows, thin lines that won't hold at small sizes

---

## Deliverable 3: Meta Ad Creative 1 — Problem-Aware (1080 × 1080 px)

**File name:** `meta-ad-problem-aware.png`
**Use:** Facebook/Instagram feed ad — Problem-Aware variant

### Design Spec
- **Background:** Off-white or very light warm gray
- **Headline text (large, dark):** "Still googling 'what's for dinner' at 5pm?"
- **Sub-copy (smaller):** "DinnerDrop plans your whole week in 30 seconds."
- **CTA bar (bottom, forest green):** "Join the Free Beta →" in white
- **Visual:** Stressed parent emoji or abstract clock illustration (Canva stock OK)

---

## Deliverable 4: Meta Ad Creative 2 — Benefit-Led (1080 × 1080 px)

**File name:** `meta-ad-benefit-led.png`
**Use:** Facebook/Instagram feed ad — Benefit-Led variant

### Design Spec
- **Background:** Forest green `#1a5c38`
- **Headline (white, large):** "5 dinners. 30 seconds. Done."
- **Sub-copy (gold):** "AI picks the meals. One tap sends the groceries to your cart."
- **Visual:** Phone mockup showing meal plan screen (use Canva phone frame + screenshot)
- **Bottom badge (white pill):** "Free 6-Month Beta — 100 Spots"

---

## Deliverable 5: Meta Ad Creative 3 — Urgency/Scarcity (1080 × 1080 px)

**File name:** `meta-ad-urgency.png`
**Use:** Facebook/Instagram feed ad — Scarcity variant

### Design Spec
- **Background:** Dark charcoal `#1a1a1a`
- **Headline (white):** "97 beta spots left."
- **Sub-copy (gold `#e8a838`):** "6 months free. No credit card. Cancel anytime."
- **CTA pill (forest green):** "Claim Your Spot →"
- **Counter element:** Large "97" number in white with "spots remaining" below in smaller text

---

## Sarah's Upload Instructions

1. Open Canva (canva.com)
2. Create each design using the specs above
3. Download each as PNG
4. Go to: https://github.com/giggles8d/-dinnerdrop
5. Click "Add file" → "Upload files"
6. Create a folder named `public` and upload all files into it
   - Or use the path: `/public/og-image.png` when uploading
7. Commit with message: `assets: add og-image, logo, and meta ad creatives`

**Verify after upload:** https://dinnerdrop.vercel.app/og-image.png should display the image (give Vercel 2–3 min to redeploy).
