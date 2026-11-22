# impeccable critique: DinnerDrop /, /start, /signup at phone size (Nov 22, 2026)

Method: dual-agent (A: design review; B: bundled detector + screenshot check). Review only; no code changed. The project has no PRODUCT.md; `impeccable init` was skipped because this review makes no project changes (register assumed: brand / marketing).

Targets: `/` (home), `/pricing` (redirects to `/start`, the ad landing page), `/signup`. Screenshots: `screenshots/dinnerdrop-home-390-*.png`, `screenshots/dinnerdrop-pricing-390-*.png`, `screenshots/dinnerdrop-signup-390-*.png`.

## Design health (Nielsen, 0-4)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Sign-up says "about a minute" and shows loading; no step indicator |
| 2 | Match with the real world | 2 | Name, "Dinner, handled." and the "Powered by Instacart" badge as the first element all suggest delivery |
| 3 | User control and freedom | 3 | No card needed; /signup has no logo, home or back link |
| 4 | Consistency and standards | 2 | 8+ wordings for the same sign-up link; CTA colour switches green/gold |
| 5 | Error prevention | 3 | Good email-typo warning |
| 6 | Recognition over recall | 2 | Visitors must remember which features are Free vs Family |
| 7 | Flexibility and efficiency | 2 | 11-16 phone screens with no jump to pricing |
| 8 | Aesthetic and minimalist design | 1 | "14 days free, no card" about 10 times in different forms; 11px footnotes; sections repeated across pages |
| 9 | Error recovery | 3 | Raw Supabase OTP message shown; error box lacks `role="alert"` |
| 10 | Help and documentation | 3 | FAQ leads with "Does DinnerDrop deliver food?" and gives Sarah's email |
| | **Total** | **24/40** | Acceptable |

## Anti-pattern verdict
Content is specific and honest (founder's dated store prices, real app screens, "over 500 families" backed by data). Structure is template-made: a small uppercase label above six sections in a row on the home page (FAMILY PLAN, SEE A WEEK, HOW IT WORKS, COMPARE YOUR STORES, WHAT YOU GET, WHY I BUILT DINNERDROP) and a four-card identical icon grid ("What you get"). Detector (source scan of `app/page.tsx`, `app/start`, `app/(auth)/signup` and 9 imported components): 0 findings; it was verified to fire on a test file, but the rules that need a rendered page (repeated labels, contrast, tap targets) cannot fire on TSX, so the visual check above is the evidence. Possible font issue to check: `tailwind.config.ts` names Playfair Display / DM Sans but the screenshots look like Times/Arial fallbacks (assessment A suspects the `@import` order in `globals.css`). Unconfirmed.

## Cognitive load: high (6 of 8 checks fail)
Decision points with more than 4 options: home first screen (5 actions incl. App Store badge), sample week (7), Family pricing card (7 features + 2 CTAs), footer (~25 links).

## Emotional journey
- Peak: the store comparison (Aldi $68 vs Price Chopper $135, founder's own list) and the priced sample week.
- Valleys: the family-texting phone clip renders as an empty thread (~560px of blank phone) in the capture; "Add a card now. $0 today" on the Family card at the exact moment people should feel safe; defensive FAQ wording ("Will I be charged by surprise?").
- Sign-up: reassurance is there ("No password, no card") but the screen is plain white, no logo, empty top third, and the auto-focused keyboard covers the reassurance lines.

## Priority issues
- **P1, `/` hero:** the lead promise ("texts everyone in your house") is a Family feature that becomes paid after 14 days. Lead with the free result; make texting the second point.
- **P1, both first screens:** delivery cues outweigh the disclaimer ("Powered by Instacart" first, headline reads like a meal kit, grocery tiles below). Name the product in the headline; move the badge below it.
- **P1, trial/billing copy on `/` and `/start`:** say it once, keep one FAQ answer, remove "Add a card now" from acquisition pages.
- **P2, `/start` sticky bar:** visible on the first screen (two identical buttons within 300px) and covers the app screenshots. Show it only after the hero button scrolls off.
- **P2, `/signup`:** add logo and a one-line reminder of what you get; announce errors (`role="alert"`); separate the weekly email/kitchen-picks line from the terms consent.
- **P3:** footer tap targets ~32px apart, social icons ~16px (under 44px); 11-12px fine print; all FAQs open on load.

## Strengths to keep
1. "We don't deliver food" on both first screens and as the first FAQ.
2. Real, dated proof instead of invented stats.
3. One-field email sign-up, no password, no card, typo check.
