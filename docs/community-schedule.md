# DinnerDrop Community Posting Schedule
**Created:** 2026-05-04 | Day 2, Hour 16
**Depends on:** docs/community-targets.md, docs/community-posts-v1.md
**Purpose:** Concrete posting calendar — what goes where, when, under what conditions

---

## SUMMARY: 5 POSTS READY, 2 CAN DEPLOY NOW

| Post | Platform | Community | Status | Earliest Deploy |
|------|----------|-----------|--------|-----------------|
| Post A | Reddit | r/mealplanning | READY | Day 3 (May 5) |
| Post B | Reddit | r/EatCheapAndHealthy | BLOCKED | 60+ day account warmup |
| Post C | Reddit | r/Parenting | BLOCKED | 30+ day account warmup |
| Post D | Facebook | Meal planning / busy moms groups | READY | Day 3 (May 5) |
| Post E | Facebook | Budget meals / frugal groups | READY | Day 3 (May 5) |

**Prerequisite for ALL posts:** BETA100 Stripe coupon must be active (Sarah action item — see operating schedule)

---

## ACCOUNT REQUIREMENTS BY PLATFORM

### Reddit — CRITICAL READ BEFORE POSTING
Reddit account age and karma are hard gates. Posting too early gets posts removed or shadowbanned.

| Subreddit | Min Account Age | Min Karma | Post Allowed | Notes |
|-----------|----------------|-----------|--------------|-------|
| r/mealplanning | None (new OK) | None | Founder post (Post A) | Small sub — builder posts tolerated |
| r/EatCheapAndHealthy | 60+ days | 100+ | Value post only (Post B) | Never mention DinnerDrop directly |
| r/Parenting | 30+ days | 100+ | Post C (DinnerDrop mentioned once) | Remove DinnerDrop if karma < 200 |
| r/MealPrepSunday | 30+ days | 100+ | Meal plan screenshot post | Future post — not yet written |
| r/budgetfood | 30+ days | 100+ | Budget meal plan share | Future post — not yet written |
| r/Frugal | 60+ days | 500+ | Comments only — no posts | Long-term karma builder |

**Action required from Sarah:** What is the age and karma of her existing Reddit account? This determines which posts can go live immediately.

### Facebook — Can Deploy Immediately
- No warmup required for Facebook group posts
- Must join each group 24–48 hours before posting (some groups require admin approval)
- Sarah must post personally from her Facebook account (or DinnerDrop Page once created)
- Never post a bare link — always embed in a story/question format (Post D and E are already formatted correctly)

---

## WEEK 1 POSTING CALENDAR (May 5–11, 2026)

### DAY 3 — Tuesday, May 5 (LAUNCH DAY FOR COMMUNITY)

**Morning block (9–10 AM EST):**
- [ ] Post A → r/mealplanning — "I got so fed up with Sunday meal planning that I built an app..."
  - Flair: Tools & Apps (or Discussion if unavailable)
  - Title variant to try first: "I built an app to automate Sunday meal planning after one too many takeout failures — want early feedback"
  - URL to include: https://dinnerdrop.app/beta?utm_source=reddit&utm_medium=organic&utm_campaign=beta_launch&utm_content=mealplanning_founder

**Evening block (7–9 PM EST):**
- [ ] Post D → Facebook (join groups Day 2 afternoon, post Day 3 evening)
  - Target groups (search Facebook): "Meal Planning Moms", "Meal Planning for Busy Families", "Family Meal Prep & Planning"
  - Post one group at a time — wait 24 hrs between groups to avoid Facebook spam flags
  - First group priority: whichever has most active recent posts when Sarah checks
  - URL to include: https://dinnerdrop.app/beta?utm_source=facebook&utm_medium=organic&utm_campaign=beta_launch&utm_content=fb_mealplanning_moms

### DAY 4 — Wednesday, May 6

**Morning (8–9 AM EST):**
- [ ] Post E → Facebook (budget/frugal groups — separate from Day 3 groups)
  - Target groups: "Cheap Meal Ideas", "Budget Meals for Families", "Frugal Living Tips"
  - URL to include: https://dinnerdrop.app/beta?utm_source=facebook&utm_medium=organic&utm_campaign=beta_launch&utm_content=fb_budget_meals

### DAY 5 — Thursday, May 7
- No new posts (let Day 3–4 posts breathe; monitor comments and reply to all)
- Reddit: reply to every comment on Post A within 12 hours

### DAY 7 — Saturday, May 9
- [ ] Post D (second Facebook group) if Day 3 post performed well (>5 comments or >10 reactions)
  - Slightly vary the opening line to avoid duplicate content flags

---

## WEEK 2 POSTING CALENDAR (May 12–18, 2026)

### Conditional on Reddit account age:
- **If Sarah's Reddit account is 30+ days old:** Post C (r/Parenting) on Tuesday May 12, 7 PM EST
- **If Reddit account is new (< 30 days):** Spend Week 2 commenting only — build karma toward 100

### All accounts (Week 2 comment strategy):
- r/EatCheapAndHealthy: Comment on 3–5 threads (recipe tips, budget meal advice — no DinnerDrop mention)
- r/MealPrepSunday: Comment on Sunday posts — meal plan feedback, encouragement
- r/Parenting: Comment on "weeknight dinner" or "picky eater" threads — value-first replies

### Week 2 Facebook (if Week 1 groups performed):
- Post to 1 additional meal planning Facebook group (third group)
- Respond to all comments from Week 1 posts

---

## WEEKS 3–4 POSTING CALENDAR (May 19 – June 1, 2026)

### Reddit (if account is now 30+ days):
- **May 19 (Tuesday):** Post C → r/Parenting (7 PM EST) — DinnerDrop mentioned once at end
- **May 25 (Monday):** Consider Post B → r/EatCheapAndHealthy IF account is 60+ days
  - Post B has zero DinnerDrop mention — safe to post from any 60+ day account
  - This is the highest-reach post (11.4M sub) — highest value if it lands

### Reddit ongoing (daily, low effort):
- r/Frugal: Comments only — no posts ever. Just build karma presence.
- r/mealplanning: Engage with other posts; thank commenters on Post A

### Facebook ongoing:
- Post to 1–2 new groups per week (new groups, not repeating)
- By Week 4, target 6–8 total Facebook group posts live
- Track which groups drove beta signups via UTM parameters in links

---

## FREQUENCY RULES

1. **Max 1 post per subreddit per 7 days** (Reddit will flag repeat posting; also bad optics)
2. **Max 2 Facebook group posts per day** (Facebook monitors new-member posting velocity)
3. **Never post the same text verbatim** in two Facebook groups — rephrase opening sentences
4. **Always reply to comments** within 24 hours — non-responsiveness kills post reach
5. **Never delete and repost** — Reddit shadowbans for this; just let posts run
6. **No cross-posting** the same Reddit post to multiple subreddits simultaneously

---

## UTM LINKS FOR EACH DEPLOYMENT

All community posts must use UTM-tagged links (from lib/utm-links.ts):

| Destination | UTM Link |
|-------------|----------|
| Post A — r/mealplanning | /beta?utm_source=reddit&utm_medium=organic&utm_campaign=beta_launch&utm_content=mealplanning_founder |
| Post B — r/EatCheapAndHealthy | /beta?utm_source=reddit&utm_medium=organic&utm_campaign=beta_launch&utm_content=eatcheap_value |
| Post C — r/Parenting | /beta?utm_source=reddit&utm_medium=organic&utm_campaign=beta_launch&utm_content=parenting_tips |
| Post D — Facebook meal planning | /beta?utm_source=facebook&utm_medium=organic&utm_campaign=beta_launch&utm_content=fb_mealplanning_moms |
| Post E — Facebook budget meals | /beta?utm_source=facebook&utm_medium=organic&utm_campaign=beta_launch&utm_content=fb_budget_meals |

---

## WHAT TO TRACK (ANALYTICS)

After each post goes live, track in a simple doc or spreadsheet:

| Metric | Where to find it | Target |
|--------|-----------------|--------|
| Reddit upvotes/comments | Reddit post itself | 10+ upvotes = healthy |
| Reddit beta clicks | GA4 → source=reddit | Track weekly |
| Facebook reactions/comments | Facebook post | 10+ reactions = boost potential |
| Facebook beta clicks | GA4 → source=facebook | Track weekly |
| Beta signups from community | Supabase → utm_source filter | Goal: 5+ from organic week 1 |

**Success threshold:** If any post drives 3+ beta signups in 48 hrs, create a variant and repost to a new community.
**Failure threshold:** If a post gets 0 engagement after 24 hrs, do NOT repost — move to the next community.

---

## SARAH'S ACTION ITEMS FOR COMMUNITY LAUNCH

1. **TODAY (May 4):** Confirm BETA100 Stripe coupon is live — posts cannot go out without it
2. **TODAY (May 4):** Check Reddit account age and karma — report back so Cowork can unlock correct posts
3. **TODAY (May 4):** Join 3–4 Facebook groups (Cowork suggests: "Meal Planning Moms", "Cheap Meal Ideas", "Meal Planning for Busy Families", "Budget Meals for Families") — you must be a member 24–48 hrs before posting
4. **DAY 3 (May 5, 9 AM):** Post A to r/mealplanning (use the exact text from docs/community-posts-v1.md, copy/paste, add the UTM link)
5. **DAY 3 (May 5, 7 PM):** Post D to first Facebook group (copy/paste from docs/community-posts-v1.md, add UTM link)
6. **Ongoing:** Reply to every comment within 24 hours — engagement multiplies reach

**Total time required:** ~10 minutes per post (copy, paste, swap UTM link, post). No writing required — all drafts are complete.

---

## FUTURE POSTS TO WRITE (not yet drafted)

| Platform | Community | Type | Priority | When to write |
|----------|-----------|------|----------|---------------|
| Reddit | r/MealPrepSunday | Meal plan screenshot post | HIGH | Day 3 |
| Reddit | r/budgetfood | $50/week meal plan share | MEDIUM | Day 4 |
| Reddit | r/EatCheapAndHealthy | Comment-only responses | LOW | Ongoing |
| Facebook | Additional groups | Variants of Post D/E | MEDIUM | Week 2 |
| Instagram | DinnerDrop account | Grid posts (9 written in instagram-profile-content.md) | HIGH | After account created |

---
*Generated by DinnerDrop Operating Manager | Day 2 Hour 16 | 2026-05-04*
