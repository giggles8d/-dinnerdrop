/**
 * DinnerDrop UTM Link Library
 * Generated: 2026-05-04 — Day 2, Hour 14
 *
 * Single source of truth for all UTM-tagged destination URLs.
 * Import specific link constants into ad copy docs, email templates, and community posts.
 *
 * Base destinations:
 *   Beta page:      https://dinnerdrop.app/beta
 *   Subscribe page: https://dinnerdrop.app/subscribe
 */

const BASE_BETA = "https://dinnerdrop.app/beta";
const BASE_SUBSCRIBE = "https://dinnerdrop.app/subscribe";

function utm(
  base: string,
  source: string,
  medium: string,
  campaign: string,
  content: string,
  term?: string
): string {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
    ...(term ? { utm_term: term } : {}),
  });
  return `${base}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// META (Facebook + Instagram) — CPC
// ---------------------------------------------------------------------------

export const META_LINKS = {
  /** Ad Set A / Ad A1 — Problem-Aware split-screen creative */
  adA1ProblemAware: utm(BASE_BETA, "facebook", "cpc", "beta_launch", "a1_problem_aware"),

  /** Ad Set A / Ad A2 — Benefit-Led type-only (forest green) */
  adA2BenefitLed: utm(BASE_BETA, "facebook", "cpc", "beta_launch", "a2_benefit_led"),

  /** Ad Set B / Ad B1 — Urgency/Scarcity progress bar (Week 2) */
  adB1UrgencyScarcity: utm(BASE_BETA, "facebook", "cpc", "beta_launch", "b1_urgency_scarcity"),

  /** Instagram feed — Problem-Aware (when running IG-only ad set) */
  igFeedProblemAware: utm(BASE_BETA, "instagram", "cpc", "beta_launch", "a1_problem_aware"),

  /** Instagram Story — Benefit-Led */
  igStoryBenefitLed: utm(BASE_BETA, "instagram", "cpc", "beta_launch", "a2_benefit_led_story"),
} as const;

// ---------------------------------------------------------------------------
// GOOGLE ADS — CPC (Search)
// Note: {keyword} ValueTrack token is preserved as a literal string here.
// Paste these directly into Google Ads Final URL fields — Google replaces {keyword} at serve time.
// ---------------------------------------------------------------------------

export const GOOGLE_SEARCH_LINKS = {
  /** Ad Group 1: Meal Planning Apps — RSA 1-A speed framing */
  ag1Rsa1aSpeed: `${BASE_BETA}?utm_source=google&utm_medium=cpc&utm_campaign=meal_planning_apps&utm_content=rsa1a_speed&utm_term={keyword}`,

  /** Ad Group 1: Meal Planning Apps — RSA 1-B urgency (Week 3) */
  ag1Rsa1bUrgency: `${BASE_BETA}?utm_source=google&utm_medium=cpc&utm_campaign=meal_planning_apps&utm_content=rsa1b_urgency&utm_term={keyword}`,

  /** Ad Group 2: AI Meal Planner — RSA 2-A AI authority */
  ag2Rsa2aAiAuthority: `${BASE_BETA}?utm_source=google&utm_medium=cpc&utm_campaign=ai_meal_planner&utm_content=rsa2a_ai_authority&utm_term={keyword}`,

  /** Ad Group 2: AI Meal Planner — RSA 2-B speed/simplicity (Week 3) */
  ag2Rsa2bSpeed: `${BASE_BETA}?utm_source=google&utm_medium=cpc&utm_campaign=ai_meal_planner&utm_content=rsa2b_speed&utm_term={keyword}`,

  /** Ad Group 3: Family Dinner — RSA 3-A busy parent problem */
  ag3Rsa3aBusyParent: `${BASE_BETA}?utm_source=google&utm_medium=cpc&utm_campaign=family_dinner&utm_content=rsa3a_busy_parent&utm_term={keyword}`,

  /** Ad Group 3: Family Dinner — RSA 3-B weeknight (Week 3) */
  ag3Rsa3bWeeknight: `${BASE_BETA}?utm_source=google&utm_medium=cpc&utm_campaign=family_dinner&utm_content=rsa3b_weeknight&utm_term={keyword}`,
} as const;

// ---------------------------------------------------------------------------
// GOOGLE ADS — Display Retargeting (Week 3+)
// ---------------------------------------------------------------------------

export const GOOGLE_DISPLAY_LINKS = {
  /** Display — UI screenshot creative */
  displayUiScreenshot: utm(BASE_BETA, "google", "display", "retargeting_beta", "display_ui_screenshot"),

  /** Display — Type-only pain relief */
  displayTypePainRelief: utm(BASE_BETA, "google", "display", "retargeting_beta", "display_type_pain_relief"),
} as const;

// ---------------------------------------------------------------------------
// REDDIT — Community / Organic
// ---------------------------------------------------------------------------

export const REDDIT_LINKS = {
  /** r/mealplanning — Founder post link */
  mealplanningFounderPost: utm(BASE_BETA, "reddit", "community", "beta_launch", "mealplanning_founder_post"),

  /** r/mealplanning — Founder comment drop */
  mealplanningFounderComment: utm(BASE_BETA, "reddit", "community", "beta_launch", "mealplanning_founder_comment"),

  /** r/EatCheapAndHealthy — Anchor meal system comment */
  ecahAnchorMealComment: utm(BASE_BETA, "reddit", "community", "beta_launch", "ecah_anchor_meal_comment"),

  /** r/Parenting — Weeknight survival comment */
  parentingWeeknightComment: utm(BASE_BETA, "reddit", "community", "beta_launch", "parenting_weeknight_comment"),

  /** r/MealPrepSunday — Week 3+ founder post */
  mealprepFounderPost: utm(BASE_BETA, "reddit", "community", "beta_launch", "mealprepsndy_founder_post"),

  /** r/Frugal — Budget angle comment (Week 3+) */
  frugalBudgetComment: utm(BASE_BETA, "reddit", "community", "beta_launch", "frugal_budget_comment"),
} as const;

// ---------------------------------------------------------------------------
// FACEBOOK GROUPS — Community / Organic
// ---------------------------------------------------------------------------

export const FACEBOOK_GROUP_LINKS = {
  /** Busy Moms / Busy Parent groups */
  busyMomsBetaOffer: utm(BASE_BETA, "facebook_groups", "community", "beta_launch", "busy_moms_beta_offer"),

  /** Budget Meals / Frugal Family groups */
  budgetMealsFrugal: utm(BASE_BETA, "facebook_groups", "community", "beta_launch", "budget_meals_frugal"),
} as const;

// ---------------------------------------------------------------------------
// EMAIL SEQUENCE — Trial-to-Paid
// ---------------------------------------------------------------------------

export const EMAIL_LINKS = {
  /** Email 1 — Day 3 value: grocery handoff CTA */
  day3ValueGroceryCta: utm(BASE_SUBSCRIBE, "email", "email", "trial_sequence", "day3_value_grocery_cta"),

  /** Email 2 — Day 6 soft push CTA */
  day6SoftPushCta: utm(BASE_SUBSCRIBE, "email", "email", "trial_sequence", "day6_soft_push_cta"),

  /** Email 3 — Day 7 urgency CTA */
  day7UrgencyCta: utm(BASE_SUBSCRIBE, "email", "email", "trial_sequence", "day7_urgency_cta"),

  /** Email 3 — Day 7 A/B subject variant CTA */
  day7AbVariantCta: utm(BASE_SUBSCRIBE, "email", "email", "trial_sequence", "day7_ab_variant_cta"),

  /** Welcome email — new beta user upgrade CTA */
  welcomeUpgradeCta: utm(BASE_SUBSCRIBE, "email", "email", "welcome_sequence", "welcome_upgrade_cta"),
} as const;

// ---------------------------------------------------------------------------
// CONVENIENCE: All links in a flat record for analytics dashboards
// ---------------------------------------------------------------------------

export const ALL_UTM_LINKS = {
  ...META_LINKS,
  ...GOOGLE_SEARCH_LINKS,
  ...GOOGLE_DISPLAY_LINKS,
  ...REDDIT_LINKS,
  ...FACEBOOK_GROUP_LINKS,
  ...EMAIL_LINKS,
} as const;

export type UtmLinkKey = keyof typeof ALL_UTM_LINKS;
