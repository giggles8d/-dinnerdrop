export interface BlogPost {
  slug: string
  title: string
  description: string
  publishDate: string
  readingTimeMinutes: number
  primaryKeyword: string
  content: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'dinner-decision-fatigue',
    title: "Dinner Decision Fatigue Is Real — Here's How 5 Minutes on Sunday Fixes It",
    description:
      "Decision fatigue hits hardest at 5pm. Here's why the 'what's for dinner?' " +
      'question feels impossible — and a simple Sunday system that removes the decision entirely.',
    publishDate: '2026-05-12',
    readingTimeMinutes: 6,
    primaryKeyword: 'dinner decision fatigue',
    content: `It's 5:47pm. You're standing in your kitchen. Three kids are circling the island. Your partner texts: "What's for dinner?" And something inside you just... dies a little.

You've made roughly 1,100 dinner decisions in the past three years. Tonight's question is no different. And yet it feels impossible.

That feeling has a name: **dinner decision fatigue**. And it's not a character flaw — it's a completely predictable outcome of how human brains work.

## What Is Decision Fatigue?

Decision fatigue is the mental exhaustion that comes from making too many choices throughout the day. By 5pm, most parents have already made hundreds of decisions — work emails, parenting calls, logistical micro-choices — and the cognitive tank is running low.

Research from Columbia University found that when people face repeated decisions over time, the quality of those decisions degrades. They default to the easiest option (often takeout or whatever requires the least thought) or they freeze entirely.

When "what's for dinner?" lands at the end of a long day, it's not landing on a fresh brain. It's landing on a depleted one.

## Why Dinner Is the Worst Decision of the Day

Choosing dinner isn't one decision. It's ten:

1. What does everyone like?
2. What do we have in the fridge?
3. What needs to be used up before it goes bad?
4. Is anyone on a diet or avoiding something this week?
5. How much time do I have?
6. Do I have the right ingredients?
7. Do I need to go to the grocery store first?
8. Is this dinner actually nutritious?
9. Will the kids eat it?
10. Am I in the mood to cook this particular thing?

Stack that on top of a full workday, and it's no wonder most families eat the same 7 dinners on rotation — or resort to DoorDash more than they'd like to admit.

The average American family spends **$2,800 per year on food delivery and takeout** — a significant chunk of which is "emergency dinner" spend driven entirely by decision fatigue.

## The Fix: Remove the Decision Entirely

The most effective solution to decision fatigue isn't willpower. It's removing the decision from the moment it's hardest to make.

Here's the system that works:

### Step 1: Block 5 minutes on Sunday morning

Before the week starts, sit down with a coffee and handle all five dinner decisions at once. Sunday morning you has a full cognitive tank. Sunday morning you can think about what everyone likes, what's on sale, and what makes sense nutritionally.

5pm Wednesday you cannot.

### Step 2: Plan for variety, not perfection

You don't need gourmet meals. You need five reliable dinners that the family will eat. One pasta night, one protein + veggie night, one soup or casserole, one "easy" night (wraps, quesadillas, fried rice), one wild card. That's a week.

### Step 3: Build the grocery list from the plan

This is where most people lose time. They plan the meals and then separately figure out what to buy — re-examining every recipe. Do it all in one pass. If you're planning digitally, generate the list at the same time you plan the meals.

### Step 4: Commit to the plan

The plan only works if you follow it. Not rigidly — life happens — but the default should be "what's on the list" rather than "let me think." When you get home on Tuesday, you shouldn't be making a decision. You should be executing one.

## How AI Is Changing This Entirely

The 5-minutes-on-Sunday approach works. But there's a version of this that takes even less time.

[DinnerDrop](https://dinnerdrop.app) is an AI dinner planning tool built specifically for this problem. You tell it your family size, dietary restrictions, and cooking preferences once. Every week, it generates 5 personalized dinner ideas and builds the full grocery list automatically.

The whole process takes about 30 seconds.

You're not searching recipes. You're not cross-referencing ingredients. You're not trying to remember if you still have half an onion in the fridge. You tap a button, get a week of dinners, and send the grocery list to Instacart, Walmart, or Kroger.

For families dealing with picky eaters, food allergies, or just the relentless "we always eat the same things" complaint — the AI adjusts for all of it.

## The Real Cost of Not Solving This

If you order takeout just twice a week because dinner planning felt impossible, you're spending roughly $60–80/week on that friction. That's $3,000–4,000 per year.

A meal planning system — whether that's 5 minutes with a notepad on Sunday or an AI tool that does it for you in 30 seconds — pays for itself in the first week.

The decision isn't whether you can afford to plan dinner. It's whether you can afford not to.

## Start This Sunday

If you want to try the manual approach: block Sunday morning, plan five dinners, write out the grocery list, and commit. You'll feel the difference by Wednesday.

If you want to skip the planning work entirely, [DinnerDrop is in public beta](https://dinnerdrop.app/beta) — first 100 families get 6 months completely free. No credit card required for the 7-day trial.

Either way: stop making the "what's for dinner?" decision at 5:47pm. That version of you does not have the bandwidth.`,
  },
  {
    slug: 'best-meal-planning-app-for-families',
    title: 'The 7 Best Meal Planning Apps for Families in 2026 (Ranked by Real Parents)',
    description:
      "Tested 7 meal planning apps specifically for families — DinnerDrop, Mealime, Plan to Eat, " +
      "Paprika, Whisk, Prepear, and Cozi — ranked by AI features, grocery integration, and real family use.",
    publishDate: '2026-05-14',
    readingTimeMinutes: 11,
    primaryKeyword: 'best meal planning app for families',
    content: `You\'ve probably Googled "best meal planning app" at least once, stared at a wall of options, and closed the tab without downloading anything.

This roundup is different. We tested seven apps specifically for families — not single adults, not couples without kids, but households where at least one person is a picky eater, budgets are real, and 5pm comes fast.

Our ranking criteria: AI vs. manual, grocery integration, dietary filter support, price, and how quickly a total newcomer can get a usable dinner plan on a Tuesday night.

## Quick Comparison

| App | AI | Grocery Handoff | Price |
|-----|-----|----------------|-------|
| DinnerDrop | Yes (full) | Yes (5 stores) | $9/mo (6-mo beta free) |
| Mealime | Partial | Shopping list only | Free / $6/mo |
| Plan to Eat | No | Shopping list only | $8/mo |
| Paprika | No | Shopping list only | $4.99 one-time |
| Whisk | Partial | Some stores | Free |
| Prepear | No | Shopping list only | Free / $8/mo |
| Cozi | No | Shopping list only | Free / $36/yr |

## 1. DinnerDrop — Best Overall for AI-Powered Family Meal Planning

**Price:** $9/month (currently free for 6 months during beta)

DinnerDrop takes a completely different approach than every other app on this list. Instead of asking you to search recipes, save them, and schedule them manually — DinnerDrop generates everything from your family profile.

You enter your family size, weekly grocery budget, dietary restrictions, and preferred cook time. Hit generate. In about 30 seconds, you have five weeknight dinners and a deduplicated, organized grocery list ready to send to Instacart, Walmart, Amazon Fresh, or Kroger.

**What makes it different:**
- AI builds the plan from your family profile, not a recipe database you browse
- One-tap grocery handoff to 5 major stores
- Picky eater swap: tap any meal you don\'t love, get a replacement in seconds
- Budget optimization: every plan is built to hit your weekly food number
- Learns your family\'s taste preferences over time

**Real talk:** DinnerDrop launched in beta in May 2026. You get 6 months free while it\'s still in beta — the recipe variety will grow as the user base grows.

[Try DinnerDrop free for 7 days →](https://dinnerdrop.app/beta)

## 2. Mealime — Best Free Option for Small Families

**Price:** Free (Pro: $5.99/month)

Mealime has been around since 2016 with a clean interface, solid recipe library (500+ recipes), and shopping lists organized by grocery store section.

**What works:** Beautiful recipes, strong dietary filters (vegetarian, vegan, gluten-free, keto, etc.), free tier is genuinely useful.
**What doesn\'t:** No grocery cart handoff. You shop manually from the app. Less useful for families of 4+.

## 3. Plan to Eat — Best for Recipe Collectors

**Price:** $8/month or $60/year

Plan to Eat is a recipe management system with meal planning on top. Import recipes from any website, organize in your personal library, drag them onto a weekly calendar, generate a shopping list.

**What works:** Excellent recipe import, family sharing, solid calendar drag-and-drop UI.
**What doesn\'t:** You must bring your own recipes — no discovery or AI. No grocery cart integration.

## 4. Paprika — Best One-Time Purchase

**Price:** $4.99 one-time per platform

Paprika has been around since 2010 with a one-time fee instead of a subscription. Import recipes from any URL, organize by category, scale servings, plan your week.

**What works:** No subscription, excellent cross-platform sync, accurate recipe scaling, loyal community.
**What doesn\'t:** No AI, no grocery cart handoff. Must build a library before it becomes useful.

## 5. Whisk — Best Free Option for Casual Planners

**Price:** Free

Whisk (owned by Samsung) is a free recipe-saving and meal planning app with basic grocery integration. Save recipes from the web, schedule on a weekly planner, generate a shopping list.

**What works:** Completely free, good recipe import, Instacart integration in some markets.
**What doesn\'t:** No AI, spotty grocery integration by region, limited recipe database.

## 6. Prepear — Best for Visual Planners

**Price:** Free (Pro: $7.99/month)

Prepear has a strong visual design — recipe photos fill each calendar slot. Satisfying for partners who want to align on the week\'s plan together. Pro adds pantry tracking.

**What works:** Beautiful visual calendar, good for two-partner coordination, pantry tracking in Pro.
**What doesn\'t:** No AI, no grocery cart handoff, limited free tier.

## 7. Cozi — Best if You Already Use It for Family Scheduling

**Price:** Free (Gold: $29.99/year)

Cozi is a family organizer with meal planning as one feature. If you already use Cozi for family calendars, the integration is convenient. As a standalone meal planner, it\'s the weakest on this list.

**What works:** Integrated family calendar, real-time shared shopping lists.
**What doesn\'t:** No AI, no recipe database, no grocery cart handoff. Shallow meal planning depth.

## How to Choose

- **Want less than 2 minutes of weekly planning?** → DinnerDrop
- **Have a recipe collection to organize?** → Plan to Eat or Paprika
- **Want free and functional right now?** → Mealime or Whisk
- **Both partners want a visual shared plan?** → Prepear
- **Already use Cozi for family scheduling?** → Cozi (add DinnerDrop for AI meal generation)

## The Bottom Line

Most apps on this list support a cook who is already doing the planning work. DinnerDrop eliminates the planning decision entirely — AI builds the plan, generates the grocery list, and sends it to your store. That\'s the meaningful distinction.

[DinnerDrop is in public beta](https://dinnerdrop.app/beta) — first 100 families get 6 months completely free. Start with the 7-day free trial.

[Claim your beta spot →](https://dinnerdrop.app/beta)`,
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}

export function getAllPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug)
}
