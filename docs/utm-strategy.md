# DinnerDrop UTM Parameter Strategy
**Day 2, Hour 14 — Generated 2026-05-04**
**Status:** PRODUCTION-READY — use these links in all ad platforms, community posts, and email sequences

---

## 1. Naming Convention

All DinnerDrop UTM parameters follow this standard structure:

| Parameter | Purpose | Format |
|-----------|---------|--------|
| `utm_source` | Where traffic comes from | lowercase, underscores |
| `utm_medium` | How it gets there (channel type) | lowercase, underscores |
| `utm_campaign` | Which initiative/product push | lowercase, underscores |
| `utm_content` | Which specific ad/post/creative | lowercase, underscores |
| `utm_term` | Paid search keyword matched | Google Ads auto-inserts `{keyword}` |

**Rules:**
- Never use spaces — always underscores
- Never use uppercase
- Keep `utm_campaign` to the initiative level (not per-ad)
- Use `utm_content` to differentiate A/B variants within the same campaign

---

## 2. Source and Medium Master List

| Source | Medium | Description |
|--------|--------|-------------|
| `facebook` | `cpc` | Facebook paid ads (feed, stories, reels) |
| `instagram` | `cpc` | Instagram paid ads |
| `google` | `cpc` | Google Search ads |
| `google` | `display` | Google Display / retargeting |
| `reddit` | `community` | Reddit organic posts |
| `facebook_groups` | `community` | Facebook group organic posts |
| `email` | `email` | Email sequences (trial-to-paid) |
| `direct` | `none` | Direct URL / no referrer |

---

## 3. Campaign Names

| utm_campaign | Description | Active When |
|--------------|-------------|-------------|
| `beta_launch` | Primary beta offer (6 months free) | Week 1–4 |
| `trial_free` | 7-day free trial angle | Week 1–4 |
| `ai_meal_planner` | AI feature authority angle | Week 1+ |
| `meal_planning_apps` | Core competitive keywords | Week 1+ |
| `family_dinner` | Busy parent / weeknight angle | Week 1+ |
| `trial_sequence` | Trial-to-paid email sequence | Ongoing |
| `retargeting_beta` | Site visitor retargeting | Week 3+ |

---

## 4. Meta (Facebook + Instagram) UTM Links

### Ad Set A — Busy Parent ($5/day, Week 1)
Destination: `/beta` with coupon angle

**Ad A1 — Problem-Aware (split-screen creative)**

```
https://dinnerdrop.app/beta?utm_source=facebook&utm_medium=cpc&utm_campaign=beta_launch&utm_content=a1_problem_aware
```
- Facebook feed: `utm_source=facebook`
- Instagram auto-placement: Meta appends `fbclid` — same URL works for both placements
- If running Instagram-only ad set, swap `utm_source=instagram`

**Ad A2 — Benefit-Led (type-only, forest green)**
```
https://dinnerdrop.app/beta?utm_source=facebook&utm_medium=cpc&utm_campaign=beta_launch&utm_content=a2_benefit_led
```

**Ad B1 — Urgency/Scarcity (progress bar creative, Week 2)**
```
https://dinnerdrop.app/beta?utm_source=facebook&utm_medium=cpc&utm_campaign=beta_launch&utm_content=b1_urgency_scarcity
```

### Instagram-Specific Placements (when running Instagram-only ad set)

**IG Feed — Problem-Aware**
```
https://dinnerdrop.app/beta?utm_source=instagram&utm_medium=cpc&utm_campaign=beta_launch&utm_content=a1_problem_aware
```

**IG Story — Benefit-Led**
```
https://dinnerdrop.app/beta?utm_source=instagram&utm_medium=cpc&utm_campaign=beta_launch&utm_content=a2_benefit_led_story
```

### Meta Ad Account Setup Note
In Meta Ads Manager → Ad level → Destination URL field:
- Paste the full UTM URL in the "Website URL" field
- Meta will append `fbclid` automatically — this is fine, don't remove it
- Enable "URL Parameters" tracking in campaign settings for additional Meta attribution

---

## 5. Google Ads UTM Links

### Search Campaign — Ad Group 1: Meal Planning Apps

**RSA 1-A (Speed framing — "5 Dinners in 30 Sec")**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=meal_planning_apps&utm_content=rsa1a_speed&utm_term={keyword}
```

**RSA 1-B (Urgency/Scarcity — Week 3)**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=meal_planning_apps&utm_content=rsa1b_urgency&utm_term={keyword}
```

### Search Campaign — Ad Group 2: AI Meal Planner

**RSA 2-A (AI authority framing)**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=ai_meal_planner&utm_content=rsa2a_ai_authority&utm_term={keyword}
```

**RSA 2-B (Speed/simplicity — Week 3)**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=ai_meal_planner&utm_content=rsa2b_speed&utm_term={keyword}
```

### Search Campaign — Ad Group 3: Family Dinner

**RSA 3-A (Busy parent problem)**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=family_dinner&utm_content=rsa3a_busy_parent&utm_term={keyword}
```

**RSA 3-B (Family weeknight — Week 3)**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=cpc&utm_campaign=family_dinner&utm_content=rsa3b_weeknight&utm_term={keyword}
```

### Google Display Retargeting (Week 3+)

**Display — UI Screenshot creative**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=display&utm_campaign=retargeting_beta&utm_content=display_ui_screenshot
```

**Display — Type-only pain relief**
```
https://dinnerdrop.app/beta?utm_source=google&utm_medium=display&utm_campaign=retargeting_beta&utm_content=display_type_pain_relief
```

### Google Ads Setup Note
In Google Ads → Ad level → Final URL field:
- Paste the full UTM URL including `{keyword}` ValueTrack parameter
- Google will auto-replace `{keyword}` with the actual matched keyword
- Enable auto-tagging in Google Ads account settings → this appends `gclid` automatically
- With both auto-tagging AND manual UTMs, Google Analytics 4 will use the `gclid` for attribution but both are recorded

---

## 6. Reddit UTM Links

### r/mealplanning — Founder Post

**Primary post (with link to /beta)**
```
https://dinnerdrop.app/beta?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=mealplanning_founder_post
```

**Comment link (drop in comment if post is text-only)**
```
https://dinnerdrop.app/beta?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=mealplanning_founder_comment
```

### r/EatCheapAndHealthy — Anchor Meal System Post

**Value post (no link in post body — drop in comment)**
```
https://dinnerdrop.app/beta?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=ecah_anchor_meal_comment
```

### r/Parenting — Weeknight Survival Tips Post

**Value post with beta mention in comment**
```
https://dinnerdrop.app/beta?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=parenting_weeknight_comment
```

### r/MealPrepSunday — Future post (Week 3+ after karma warmup)

```
https://dinnerdrop.app/beta?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=mealprepsndy_founder_post
```

### r/Frugal — Budget angle (Week 3+)

```
https://dinnerdrop.app/beta?utm_source=reddit&utm_medium=community&utm_campaign=beta_launch&utm_content=frugal_budget_comment
```

---

## 7. Facebook Groups UTM Links

### "Busy Moms Dinner Ideas" / Busy Parent Groups

```
https://dinnerdrop.app/beta?utm_source=facebook_groups&utm_medium=community&utm_campaign=beta_launch&utm_content=busy_moms_beta_offer
```

### Budget Meals / Frugal Family Groups

```
https://dinnerdrop.app/beta?utm_source=facebook_groups&utm_medium=community&utm_campaign=beta_launch&utm_content=budget_meals_frugal
```

---

## 8. Email Sequence UTM Links

Used in the trial-to-paid email sequence (docs/email-sequence-v1.md):

**Email 1 — Day 3 Value Reinforcement (grocery handoff CTA)**

```
https://dinnerdrop.app/subscribe?utm_source=email&utm_medium=email&utm_campaign=trial_sequence&utm_content=day3_value_grocery_cta
```

**Email 2 — Day 6 Soft Conversion Push**
```
https://dinnerdrop.app/subscribe?utm_source=email&utm_medium=email&utm_campaign=trial_sequence&utm_content=day6_soft_push_cta
```

**Email 3 — Day 7 Hard Conversion (urgency)**
```
https://dinnerdrop.app/subscribe?utm_source=email&utm_medium=email&utm_campaign=trial_sequence&utm_content=day7_urgency_cta
```

**Email 3 — Day 7 A/B Subject Variant**
```
https://dinnerdrop.app/subscribe?utm_source=email&utm_medium=email&utm_campaign=trial_sequence&utm_content=day7_ab_variant_cta
```

**Welcome Email — New beta user (future)**
```
https://dinnerdrop.app/subscribe?utm_source=email&utm_medium=email&utm_campaign=welcome_sequence&utm_content=welcome_upgrade_cta
```

---

## 9. Analytics Interpretation Guide

### In Google Analytics 4 — How to Read UTM Data

**Reports > Acquisition > Traffic Acquisition:**
- Filter by `Session source/medium` to see which channel drives the most sessions
- Filter by `Session campaign` to see beta_launch vs other campaigns
- Goal: `/subscribe` page completions (GA4 calls these "conversions" once you configure the goal)

**Key UTM content splits to watch:**
- `a1_problem_aware` vs `a2_benefit_led` → Week 1 Meta A/B winner (check at Day 3)
- `rsa1a_speed` vs `rsa2a_ai_authority` → Week 1 Google A/B winner (check at Day 7)
- `day3_value_grocery_cta` vs `day7_urgency_cta` → Email sequence click-through rates

### Expected Volume (Week 1)
| Source | Expected Sessions | Expected Beta Signups |
|--------|-----------------|----------------------|
| Meta CPC | 35–70 | 3–7 |
| Google CPC | 30–60 | 3–6 |
| Reddit Community | 20–100 | 2–10 |
| Facebook Groups | 10–50 | 1–5 |
| **Total Week 1** | **95–280** | **9–28** |

---

## 10. Implementation Checklist

| Platform | Where to Add UTMs | Status |
|----------|------------------|--------|
| Meta Ads Manager | Ad level → Website URL field | Ready to paste |
| Google Ads | Ad level → Final URL field | Ready to paste |
| Google Display | Ad level → Final URL | Ready to paste |
| Reddit posts | Comment body text | Ready to paste |
| Facebook group posts | Post body or comment | Ready to paste |
| Email sequence (Resend) | CTA button href in template | Ready to paste |
| GA4 | Auto-reads UTMs from URL | No setup needed |

**Note:** All links point to `https://dinnerdrop.app/beta` or `https://dinnerdrop.app/subscribe`.
If the custom domain is still resolving issues, swap base URL to `https://dinnerdrop.vercel.app` — UTM parameters are identical.

---

*Generated by Cowork Operating Manager — Day 2, Hour 14*
*Full link library available as TypeScript constants: lib/utm-links.ts*
