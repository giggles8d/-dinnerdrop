# DinnerDrop — Meta Ad Creative Briefs (v1)
**Prepared by:** Cowork Operating Manager
**Date:** 2026-05-04
**Status:** Ready for Canva production (pending logo.png + og-image.png from Sarah)
**Paired with:** docs/meta-campaign-structure.md (Ad Sets A and B), docs/meta-audience-research.md

---

## Overview

Three creative variants for DinnerDrop's beta launch Meta campaign. Each maps to a specific
audience psychology and ad set from docs/meta-campaign-structure.md:

| Variant | Angle | Ad Set | Week |
|---------|-------|--------|------|
| Creative A1 | Problem-Aware (Sunday dread) | Ad Set A — Busy Parent | Week 1 |
| Creative A2 | Benefit-Led (5 dinners, 30 sec) | Ad Set A — Busy Parent | Week 1 |
| Creative B1 | Urgency/Scarcity (97 spots left) | Ad Set B — Budget Family | Week 2 |

**Format:** All variants built as square (1080x1080px) for Feed + 1080x1920px Story crop.
**Brand colors:** Forest green #1a5c38 (bg), Gold #e8a838 (accent), White #ffffff (text)
**Font:** Bold sans-serif headline (e.g., Montserrat ExtraBold or similar in Canva)

---

## CREATIVE A1 — Problem-Aware ("Sunday Dread")

### Strategic Intent
Target: Busy Parent (Audience A) — someone who already feels the pain of Sunday meal planning.
Goal: Stop the scroll with radical recognition ("this is literally me"), then offer a lifeline.
Tone: Empathetic, slightly humorous, immediately relatable.

### Image Concept (1080x1080px)
- **Background:** Split design — LEFT half is chaotic (muted warm tone): sticky notes, open laptop,
  phone with 5 browser tabs visible, overflowing recipe screenshots
- **Right half:** Clean forest green (#1a5c38), one phone mockup showing DinnerDrop's meal plan
  screen with 5 dinners neatly listed for the week
- **Center dividing element:** Thin gold vertical line or lightning bolt icon
- **Top-left text overlay (on chaotic side):** "Every. Single. Sunday." in white, medium weight
- **Top-right text overlay (on green side):** "Not anymore." in gold, bold
- **Bottom bar:** Forest green strip with "DinnerDrop — 7-Day Free Trial" in white + gold dot logo

### Canva Production Notes
- Use a stock photo of a cluttered kitchen table or desk with recipe tabs open (Canva library)
- Phone mockup: use Canva's free phone frame, screenshot the DinnerDrop meal plan screen
  (or mock it up: 5 dinner names listed, checkboxes, clean UI)
- All text must be in the safe zone (100px from edges) to avoid feed crop on mobile
- Story version (1080x1920): stack the split vertically — chaos on top, clean green on bottom

### Ad Copy

**Primary Text (Feed — 125 chars recommended, 280 max):**
```
Every Sunday, 45 minutes of recipe tabs, grocery math, and family veto chaos.

There's a better way. DinnerDrop plans your whole week in 30 seconds — 5 dinners,
one grocery list, one tap to your store.

7-day free trial. No credit card required.
```

**Headline (30 chars max — pin position 1):**
```
Dinner planning is exhausting
```

**Headline variant (pin position 2):**
```
5 dinners planned in 30 seconds
```

**Description (optional, 30 chars):**
```
Free 7-day trial. No card needed.
```

**CTA Button:** Learn More → https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid_social&utm_campaign=beta_launch&utm_content=a1_problem_aware


---

## CREATIVE A2 — Benefit-Led ("5 Dinners, 30 Seconds")

### Strategic Intent
Target: Busy Parent (Audience A) — someone open to AI tools that save time.
Goal: Lead with the most dramatic product benefit immediately. Let the number do the work.
Tone: Confident, clean, product-forward. Think Apple ad aesthetic.

### Image Concept (1080x1080px)
- **Background:** Solid forest green (#1a5c38) — full bleed, no clutter
- **Center:** Large, bold white text: **"5 dinners."** on line 1, **"30 seconds."** on line 2
  (Both lines in Montserrat ExtraBold, ~120pt, centered)
- **Below headline:** Small gold separator line (40px wide, 3px tall)
- **Below separator:** White subtext in regular weight, ~28pt:
  "DinnerDrop plans your week, builds your grocery list, and sends it to your store."
- **Bottom:** Gold-dot DinnerDrop wordmark logo (use logo.png when available)
- **Bottom-right corner:** Small white badge: "100 beta spots — 6 months free"

### Canva Production Notes
- This is a TYPE-ONLY creative — no photo needed, fully achievable before logo.png is ready
  (use placeholder text logo until Sarah uploads logo.png)
- High contrast makes this ideal for Reels/Stories where video auto-plays muted
- Story version (1080x1920): increase font to ~160pt, add DinnerDrop app icon at top

### Ad Copy

**Primary Text:**
```
What if dinner planning took 30 seconds?

DinnerDrop uses AI to plan 5 dinners for your family, build a full grocery list,
and send it directly to Walmart, Target, Amazon Fresh, or Kroger — in one tap.

Join 100 beta families. First 6 months free.
```

**Headline (pin position 1):**
```
AI dinner planning for families
```

**Headline (pin position 2):**
```
5 dinners planned in 30 seconds
```

**Headline (pin position 3 — rotation):**
```
One tap to your grocery store
```

**Description:**
```
7-day free trial. No credit card.
```

**CTA Button:** Learn More → https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid_social&utm_campaign=beta_launch&utm_content=a2_benefit_led

---

## CREATIVE B1 — Urgency/Scarcity ("97 Spots Left")

### Strategic Intent
Target: Budget Family (Audience B) — value-conscious, responds to FOMO and loss aversion.
Goal: Create urgency around the beta offer expiring. 6 months free is a $54 value — make that
      feel real. Deploy Week 2 after pixel has initial data.
Tone: Direct, slightly urgent. "You'd be crazy to miss this."

### Image Concept (1080x1080px)
- **Background:** Forest green (#1a5c38) top 70%, white bottom 30%
- **Top section (green):**
  - Large gold bold text, centered: **"6 months free."**
  - Below in white, smaller: "That's a $54 value — yours for beta testing DinnerDrop."
- **Bottom section (white):**
  - Horizontal progress bar: gold fill showing ~3% used (97/100 spots taken)
  - Left label: "0" | Right label: "100 beta spots"
  - Below bar in forest green text: **"97 spots remaining"** (update manually each week)
  - Small grey subtext: "Beta closes when 100 families join"
- **Bottom strip:** Forest green, DinnerDrop logo + "dinnerdrop.app"

### Canva Production Notes
- The progress bar is the key visual — make it feel real and slightly alarming (nearly-full)
- NOTE: Update "97 spots remaining" text weekly as signups come in (Sarah or Cowork)
- When actual beta spots counter is integrated from /api/stripe/beta-spots, update ad to match
- Story version: Stack vertically, make "6 months free." the full-screen hero, progress bar below
- This creative works as a static image OR a simple 3-second GIF (bar filling to show 3 spots left)

### Ad Copy

**Primary Text:**
```
We're giving 100 families 6 months of DinnerDrop completely free.

In exchange? Use it. Tell us what sucks. Help us make it better.

That's it. No catch. Just 5 dinners a week, one grocery list, one tap to your store —
free until November.

97 beta spots remaining. First come, first served.
```

**Headline (pin position 1):**
```
6 months free — 97 spots left
```

**Headline (pin position 2):**
```
Beta families eat free until Nov
```

**Headline (pin position 3):**
```
AI meal planning — free for 6 mo
```

**Description:**
```
Limited beta. No credit card needed.
```

**CTA Button:** Get Beta Access → https://dinnerdrop.app/beta?utm_source=meta&utm_medium=paid_social&utm_campaign=beta_launch&utm_content=b1_urgency_scarcity


---

## A/B Test Plan for Week 1

**Live Week 1:** A1 (Problem-Aware) vs A2 (Benefit-Led)
- Both in Ad Set A (Busy Parent, $5/day)
- Meta will auto-optimize spend toward winner after ~500 impressions each
- **Decision rule at Day 3 checkpoint:**
  - If one ad has CTR > 2x the other → pause loser, put full budget on winner
  - If CTR within 20% of each other → let both run through Day 7 and optimize on CPA

**Week 2 addition:** B1 (Urgency/Scarcity) added to Ad Set B ($3/day)
- Don't run B1 in week 1 — need real beta spot numbers from /api/stripe/beta-spots first
- Update "97 spots remaining" to actual count before launching B1

**Creative refresh trigger:** If any ad's CTR drops below 0.8% → brief new creative
  (creative fatigue typically hits at 3,000–5,000 impressions on small audiences)

---

## Production Checklist

- [ ] **Sarah:** Create logo.png (512x512) per docs/social-assets-brief.md brief
- [ ] **Sarah:** Create og-image.png (1200x630) per docs/social-assets-brief.md brief
- [ ] **Cowork:** Build A1 creative in Canva (can start — uses stock photo, no logo needed)
- [ ] **Cowork:** Build A2 creative in Canva (can start — type-only, no logo needed)
- [ ] **Cowork:** Build B1 creative in Canva (needs logo.png — blocked until Sarah uploads)
- [ ] **Sarah:** Create Meta Business Manager + Ad Account (see docs/meta-bm-setup.md)
- [ ] **Sarah:** Create Facebook Page + Instagram profile (see docs/facebook-page-content.md)
- [ ] **Sarah:** Create Stripe BETA100 coupon (2 min — see Action Items #1)
- [ ] **Cowork:** Upload creatives to Meta Ads Manager once Ad Account is live
- [ ] **Cowork:** Build Next.js Meta Pixel integration once Sarah shares Pixel ID

---

## Notes

- All UTM parameters follow the structure defined in docs/utm-strategy.md (Day 2 Hour 14)
- Story crops (1080x1920) are the same content as feed crops — key text stays in center 1080x1080
- All three creatives are designed to work WITHOUT video — static images only for launch speed
- If Sarah wants video: A2 (benefit-led) is easiest to animate (text fade-in sequence, 6 seconds)
- Canva templates for all three will be built in Day 3 pending Sarah's account auth and logo.png
