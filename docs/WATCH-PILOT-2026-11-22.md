# Watch-to-skill pilot: a weekly cart from DinnerDrop families

**Date:** 2026-11-22
**Branch:** `research/watch-pilot-2026-11-22` (cut from `origin/main` 02f7505)
**Scope:** research and a draft skill only. No site code, emails, texts, database rows or anything live changed. The database was only read (two SELECT queries).
**Draft skill:** [`docs/skill-drafts/weekly-repeat-habit/SKILL.md`](skill-drafts/weekly-repeat-habit/SKILL.md). Not installed.

## Summary

- **Data.** The numbers in the brief check out: 198 signups from Oct 23 to Nov 8, 25 sent a cart, and only 1 sent in two different weeks. **No lists texted for in-store shopping were recorded for this cohort, or ever.** Recording them (`grocery_handoffs.store = 'In store'`) shipped today, in commit 90d38de. Any in-store trips before today left no trace, so 13% is a cart-only number and may undercount.
- **What the code does in week two.** For families who sent in week one:
  - The Saturday one-tap reorder text exists but is off by default (`planReady: 'email'`).
  - Saturday's one-tap cart leaves out staples and the extra items they added last week.
  - In-store families get Instacart wording.
  - Nothing measures a week-two repeat.
- **Videos.** Two of the five assigned videos were replaced: the Mailchimp clip was a 96-second ad, and the push-notification video had nothing behind its claims. The replacements are a talk on Duolingo's published notification experiment and a full post-purchase email walkthrough.
- **Does the skill add anything?** Some. About half of what it says, the existing `onboarding`, `retention` and `emails` skills already said. The new part:
  - use the channel the family already opted into, timed to their own shop day;
  - rotate the wording each week;
  - hold back a small group so a change can be measured;
  - count opt-outs per message;
  - stop after two missed weeks.
- **Recommendation.** Keep the useful steps as a short section inside the `retention` skill rather than as a separate skill.

---

## 1. Method and video changes

Each video went through `/watch`: transcript first (YouTube captions), then frames only where the transcript pointed at something on screen. All five final videos are under 30 minutes. Local engine, transcript detail, no audio uploaded anywhere.

| # | Assigned | Kept? | Why |
|---|---|---|---|
| 1 | 7 Ways to Boost Retention (a16z, Bryan Kim), 26:28 | Kept | Substantive. It is a talking-head podcast with no screen cues in the transcript, so no frames were pulled. |
| 2 | "I Copied Duolingo's Retention Strategy For My App", 11:02 | Kept | The video is now titled *How I Designed My App to Be Impossible to Ignore*; the content matches. Frames pulled where notifications and his mock-up are shown. |
| 3 | Push Notifications: Best Practices for User Re-Engagement (CodeLucky), 9:30 | **Replaced** | On topic but thin: a narrated checklist. Its benchmarks (for example "5 to 15% open rate") and send times have no source, no data and no example. |
| 3′ | → [Paper club: A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications](https://www.youtube.com/watch?v=mwlD4RYJLmA) (CloudWalk), 24:55 | Used | Same sub-topic (re-engagement notifications), but with Duolingo's own published A/B results. Frames pulled for the results table. |
| 4 | Customer retention emails (Intuit Mailchimp), 1:36 | **Replaced** | 96 seconds, essentially an ad. One unsourced stat ("keep 5% more customers and profits can rise by a quarter or more"). |
| 4′ | → [How to Create A Post Purchase Flow (Klaviyo tutorial)](https://www.youtube.com/watch?v=RzalILQOecU) (Walshy Mails), 13:37 | Used | Same sub-topic (emails that bring a buyer back), with the actual flow, delays and email copy shown on screen. |
| 5 | I Built An App (But Users KEEP dropping off) (Chris Raroque), 15:50 | Kept | Real numbers from his own app. |

Seen while searching but **not counted**: *How Duolingo Gets 65 Million People Back Every Day* (Appelune, 4:15). It summarises Duolingo's published experiments, for example counting a single lesson toward the streak. It is directly relevant to "make showing up tiny", but it was not one of the five, so nothing from it is used in the table or the skill. A candidate for a second pass.

## 2. Notes per video

### V1. 7 Ways to Boost Retention (a16z, Bryan Kim)

**Tactics:**
1. **Speed to core value.** Cut the time and friction between opening the product and getting what it is for. Examples: Google's search speed, and an AI companion app whose retention improved as the model behind it got faster and better.
2. **Feature-gated onboarding.** Make new users complete setup before they can use the product. Examples: a camera app that required inviting five friends, and Viggle's Discord steps. Fewer people start, but those who do stay.
3. **Reciprocity.** You only see others' content after contributing your own (BeReal). He has no AI-era example.
4. **Smart notifications.** Think about three things:
   - who the user believes sent it: a friend or the event host, not the company;
   - whether the content is something they care about, like a venue change, not "Happy Earth Day";
   - how often you send.

   Over-send and people switch notifications off, and they rarely switch them back on.
5. **Effortful streaks.** Streaks work when each day costs real effort (a Snapchat streak means a snap from both people every 24 hours), not when they are a number with a fire emoji.
6. **"Wrapped"-style summaries** of what the user did (Spotify Wrapped; AI products that summarise your spending).
7. **Status for power users:** moderator roles, Strava's Local Legend, leaderboards.

**Numbers:**
- At Snap, a 1-point rise in day-30 retention was a big deal. This is his own experience, but no data is shown.
- His estimate that these tactics together can raise D30 by 10 to 15 points (from about 20% to 35%) is opinion; nothing is shown.
- The AI companion app's retention by model version is described but not shown.
- An unnamed founder's weekly retention "shot up". No figure is given.

**Opinion with nothing behind it:** that switched-off notifications almost never come back ("I know this empirically", but no number); all of the D30 estimate.

**Quote:** "you send too much people turn it off".

### V2. How I Designed My App to Be Impossible to Ignore (Josh Mountain): a Duolingo teardown

**What he did:** installed Duolingo, did two lessons, stopped, and logged every message for three weeks.

**What he observed:**
- **Volume.** More than 14 pings in 7 days across push, email and the watch/widget.
- **A narrative arc.** Messages start encouraging ("keep that streak alive"). Then push notifications arrive in the hour before the streak expires, and a sad owl appears on his watch at 9:49 PM. Reopening the app shows a crying-but-happy owl.
- **The day-22 email.** "It's been 22 days since your last lesson" with a ghost owl and a "revive" button. On screen at 3:55: "Don't mind the tears, Duo is happy you're back!"
- **Instant celebration.** Confetti, banners and a haptic buzz on the first completed streak.
- **A goal at onboarding.** A streak goal is set during onboarding (7, 14, 30 or 50 days).

**His conclusion** is that it all runs on fear of losing the streak and the status that comes with it. He then mocks up a protein-shake tracker. On screen at 10:00:
- the last seven days shown as filled or unfilled cups;
- a large streak number;
- one big "Drink It & Log Streak" button.

**Numbers:** the 14-plus messages in 7 days and the 22-day email are his own observation, from one user over one period. He reports no results for his own app.

**Opinion with nothing behind it:** that fear of loss is "the answer", and that status comparison is why Duolingo works.

**Quote:** "Over 7 days, Duolingo pinged me over 14 times".

### V3′. Paper club on Duolingo's notification bandit paper (CloudWalk)

**What Duolingo did:** a presenter walks through Duolingo's KDD paper on choosing which daily reminder each learner gets. A "reward" is a lesson finished within 2 hours of the notification.

**The tactics:**
- **Only eligible messages.** A template such as "continue your 109-day streak" can only go to people it applies to ("sleeping arms").
- **Score by lift.** Each message is judged on its lift over the times it was eligible but not used, not on its raw average.
- **Novelty decays.** A message the person saw recently works less well, so recently used templates are penalised ("recovering arms", with a 15-day half-life).
- **Language counts.** Treating each template-plus-language pair as its own option did slightly better.

**Numbers.** Duolingo's own published A/B test, shown as a table on screen at 23:05. It compared the bandit against random choice from an already-optimised pool, with a 5% holdout that got no notifications:

| Metric | Gain |
|---|---|
| Daily active users | +0.5% |
| Lessons completed | +0.4% |
| New-user day-1 retention | +2.2% |
| New-user day-7 retention | +2.0% |
| Existing-user day-1 retention | +0.5% |
| Existing-user day-7 retention | +0.2% (not significant) |

The offline test of the recency penalty showed +0.1%. These are Duolingo's results at Duolingo's scale, reported second-hand by the presenter, but they come from a peer-reviewed paper.

**Opinion with nothing behind it:** little. The presenter sticks to the paper.

**Quote:** the reward is "a lesson to be completed within two hours of the notification".

### V4′. How to Create A Post Purchase Flow (Walshy Mails)

**The flow (live on screen at 2:20):** it is triggered by an order and exits anyone who orders again. Four emails go out on day 1, day 4, day 7 and about day 12:
1. **Day 1:** a plain-text thank-you "from the family" with a 10% next-order code (on screen at 9:15).
2. **Day 4:** "complete your look", a style guide combined with matching products.
3. **Day 7:** "let's connect", a push toward Instagram so the brand stays in view without sending more emails.
4. **About day 12:** a review request once the product has arrived (on screen at 12:10).

He offers an eight-email "skeleton" (thanks, cross-sell, reduce buyer's remorse, how to use it, education, subscription, review with an incentive, referral) and says to keep only the ones that fit.

**Numbers:**
- The only figures on screen are in the stats panel for the day-7 email: 97 opens, 1.8% click rate (3 clicks), no placed-order figure. He doesn't mention them.
- "Double or even triple your lifetime value" and "30 to 50% of revenue from email" are claims with nothing shown. The video also sells his agency.

**Quote:** "you don't need eight emails".

### V5. I Built An App (But Users KEEP dropping off) (Chris Raroque)

**His numbers (on screen at 0:30):**
- Amy (his calorie tracker) has about 13% week-one retention.
- His last video reported a jump from 12.9% to 22.5%. He now says he calculated it wrong: it was about 14%, and it has since dropped to 13%.

**His approach:** reduce friction until logging becomes a habit.
- **Barcode scanning.** Two food databases plus a cheap AI call pick the better serving size. If there is no barcode, photograph the nutrition label; if the label wraps around the package, take more photos.
- **Water tracking.** Saved custom bottles, a one-tap quick add, and a home-screen widget. The feature is off by default to avoid clutter.
- **Accuracy and small bugs.** He says the biggest retention work is accuracy fixes and small bug fixes (for example, two columns scrolling out of sync), because wrong results make people stop trusting the app.

**Numbers:**
- Retention, monthly recurring revenue (about $2,800) and margin (about 85%) are his own.
- He has **no result yet** for the changes: he'll "know in a few weeks".

**Opinion with nothing behind it:** that friction is "the best way" to improve week-one retention. That is a belief here, not a result.

**Quote:** "I actually calculated the number wrong last month."

## 3. What they agree on

How to read it:
- **3+** = the tactic is in three or more of the five videos.
- **2 + numbers** = in two, and one shows real numbers.

Only those two rows go into the skill.

| Tactic | V1 | V2 | V3′ | V4′ | V5 | Count | Real numbers shown? | Verdict |
|---|---|---|---|---|---|---|---|---|
| Make the repeat effortless: fewer steps, pre-filled, one-tap | ✓ speed to value | ✓ one-button log | | | ✓ quick add, saved bottles | 3 | No result yet (V5 says so) | **In skill** |
| Message comes from a sender the user cares about, with content specific to them | ✓ perceived sender | ✓ Duo persona | ✓ template choice per person | ✓ plain-text note from "the family" | | 4 | V3′: +0.5% DAU, +2.0% new-user D7 | **In skill** |
| Send less: frequency restraint, don't spend the channel | ✓ | | ✓ recency penalty | ✓ move to a lower-frequency channel | | 3 | V3′: +0.1% offline for the recency penalty | **In skill** |
| Trigger on what the user did; stop when they act | ✓ "just my orders" | | ✓ eligibility | ✓ exit on reorder | | 3 | V3′ | **In skill** |
| Measure the repeat by cohort, with a holdout or window | ✓ D30 | | ✓ 2-hour window, 5% holdout | | ✓ week-one retention | 3 | V5: 13%, own error found; V3′ | **In skill** |
| Rotate wording; novelty decays | | ✓ wording changes over days | ✓ | | | 2 | V3′ | **In skill** (2 + numbers) |
| Celebrate or thank right after the first completion | | ✓ confetti | | ✓ day-1 thank-you | | 2 | No | Unproven (used only as a starting point to test) |
| Streak counter | ✓ | ✓ | | | | 2 | No | Unproven |
| Status, leaderboards, power-user badges | ✓ | ✓ | | | | 2 | No | Unproven |
| Guilt or loss-aversion escalation after a lapse | | ✓ | | | | 1 | No | Unproven |
| Multi-channel escalation (push, email, widget) | | ✓ | | | | 1 | Count of pings only | Unproven |
| Commitment goal set at onboarding | | ✓ | | | | 1 | No | Unproven |
| Feature-gated onboarding | ✓ | | | | | 1 | No | Unproven |
| Give-to-get reciprocity | ✓ | | | | | 1 | No | Unproven |
| "Wrapped" summaries | ✓ | | | | | 1 | No | Unproven |
| Next-order discount | | | | ✓ | | 1 | No | Unproven (and against the no-new-promos decision) |
| Review ask about 12 days after purchase | | | | ✓ | | 1 | No | Unproven |
| Fix accuracy and small bugs that break trust | | | | | ✓ | 1 | No | Unproven on its own. Folded into "make the repeat effortless" in the skill as context. |
| Per-language copy | | | ✓ | | ✓ | 2 | "Slightly better", no figure | Unproven (and not relevant to DinnerDrop) |

### Unproven

All tactics marked **Unproven** in the table above. Two notes:
- **Streaks are the most-discussed tactic and still don't pass the bar.** Both videos that cover them show no numbers.
- **The replaced Mailchimp clip** said "no guilt" for win-backs, the opposite of V2. That doesn't count either way.

## 4. DinnerDrop's real week one and week two (from the code)

Read at `origin/main` 02f7505. Every item has a file:line.

### What is recorded

- **One table.** Every send is a row in `grocery_handoffs`. The `store` column tells them apart: 'Instacart', 'Kroger', 'Walmart', 'Instacart · deals', and **'In store'** for a list texted or emailed for the store (`lib/list-link.ts:190-197`).
- **What counts as an in-store send.** It is recorded only when the family taps "Text me this list" or "Email me this list" on the signed-in list page (`components/InStoreSend.tsx:32`).
- **What doesn't count.** Opening the no-sign-in `/list` link from a reminder records nothing. Checking items off only sets `checked` (`app/api/send-list/check/route.ts:19`).
- **No week-two metric.** Nothing measures a repeat in week two. The weekly report counts sends per week; the cart-ask code works out a "repeat" only to decide who gets it (`lib/cart-ask-campaign.ts:68-74`).

### Database check (read-only)

| Measure | Value |
|---|---|
| Signups Oct 23 to Nov 8 | 198 |
| Any send | 25 |
| Sent in 2+ different weeks | 1 |
| Sent in both week 1 and week 2 | 0 |
| 'In store' rows, all time | 0 |
| 'In store' SMS sends, all time | 0 |
| Households in this cohort sent the first-plan text (with a no-sign-in list link) | 32 |
| Saturday reorder texts sent to this cohort | 0 |

### What a family receives, days 6 to 9

**Week-one sender, online cart:**
- The day-7 activation email is skipped, because it stops once any send exists.
- **Saturday Drop or plan-ready email.** Subject "This week’s dinners (your cart is ready)". Body: "Your Instacart cart is already filled with everything you need. One tap and you're at checkout:" Signed by Sarah, with "Reply if anything's off. I read every one." (`lib/sunday-drop.ts:188-195, 239`).
- **Reorder text: not sent by default.** The one-tap text ("Your DinnerDrop week is ready 🍽️ … Your Instacart cart is ready, tap to check out: … Reply SWAP 2 to change a dinner first.", `lib/reorder.ts:28-30`) only goes out when `planReady` is 'sms' or 'both'. The default is `'email'` (`lib/settings.ts:161`; `lib/reminders.ts:204`). None of the 198 got one.
- **Shop-day nudge,** for families who answered the shop-day question. The wording is the same whether it is their first week or a repeat: "DinnerDrop: it's shop day. Your {n} dinners are planned. Tap once to fill your Instacart cart, no sign-in: {cart} Shopping in person? Your list: {list}" (`lib/shop-day.ts:126`).
- **Cart-ask** (if approved in `app_kv`) when there is no second cart after 5+ days: "Quick question about your DinnerDrop grocery order" (`lib/cart-ask-campaign.ts:19`).

**Week-one sender, in store:** gets the same online-cart wording. Their 'In store' row counts as "ordered" (`lib/reorder.ts:21-23`; `lib/sunday-drop.ts:237-239`), so:
- the Drop tells them their Instacart cart is filled;
- the cart-ask says they "sent your DinnerDrop grocery list to In store".

This affects no one yet, but it affects every in-store sender from today on.

**No send in week one.** Up to five messages can land in the same few days:
1. Day-7 email: "Still on for {dinner} this week?" (`lib/activation-email.ts:53`).
2. Saturday: "Your {store} list is ready: {X} + {n} more".
3. Shop-day nudge: "{Day} is shop day: your list for {X} and {n} more".
4. If approved, the check-in email.
5. If approved, the texting invite.

**Repeat path:**
- **Online:** one tap from the email or text to a filled Instacart cart in both weeks (`app/api/go/shop/route.ts`).
- **What the one-tap cart contains:** it is rebuilt from the new week's plan.
  - Staples, items carried over, and breakfast/lunch basics are added only when the signed-in grocery-list page first loads for the week (`app/(app)/grocery-list/page.tsx:313-334`).
  - **Likely bug.** If a family texts "ADD milk" before opening the list page, the one-tap cart contains only that one item. `itemsForFamily` uses only `list_items` rows once any exist (`lib/followup.ts:60-65`), and the ADD inserts one row (`lib/texting.ts:762`).
- **"Repeat last week"** exists only on the signed-in dashboard (`app/(app)/dashboard/page.tsx:816-823`). Because Saturday has already planned a new week, it needs a second tap ("Replace this week's dinners? Tap again"). No message offers it.

### Opt-outs and quiet hours

The changes below keep all of these:
- **STOP** opts out every row with that phone (`lib/texting.ts:278-282, 547-549`). It is checked again when held texts are sent (`lib/send-window.ts:128`).
- **Text hours** are 9 AM to 8 PM local. Pacific time is assumed if the time zone is unknown. Held texts are dropped after 18 hours (`lib/send-window.ts`). The Saturday plan and reorder texts go through this window (`lib/reminders.ts:95-100`).
- **Email unsubscribe** is the `profiles.email_unsubscribed` flag. Each sender checks it itself.
- **Caps.** The 4-per-week text cap covers only the vote, "again" and "anything else" texts. Plan-ready, reorder, shop-day and list-waiting texts are not capped.

## 5. The draft skill applied to DinnerDrop

What `weekly-repeat-habit` says to change:

1. **Step 0, define and measure.**
   - The repeat is "a cart sent or a list texted in the week after the first send".
   - Add a week-two repeat line to the Monday weekly report (`lib/weekly-report.ts`), by signup cohort, mature cohorts only.
   - Until in-store recording has run a couple of weeks, report cart and in-store sends separately.
2. **Step 0, holdout.** Put about 5% of week-one senders in a group that doesn't get any new week-two message. With about 12 senders a week this tells you little for months, so read the individual families first.
3. **Step 1, first-week trigger.** Already mostly done: the morning-after "How did your grocery order go?" email. The skill adds one line in it about next week: "Saturday your next week is planned and your cart refills."
4. **Step 2, easier repeat.** Make the one-tap cart include staples and last week's "anything else" items without opening the list page, and fix the ADD-only cart. Show "same as last week" in the message, not only on the dashboard.
5. **Step 3, channel.** Families who turned texting on and sent in week one should get the Saturday reorder text. Today it is off by default, so the channel they chose isn't used for the one message that matters most.
6. **Step 3, timing (inference).** Saturday at 8 AM is the same for everyone. For a family whose week-one send was on, say, Tuesday evening, time the week-two message to land before Tuesday instead. The shop-day nudge already does this for families who answered the shop-day question.
7. **Step 3, wording.**
   - Repeaters should get repeater wording (it's the same as first-timers today).
   - Rotate between two or three versions week to week.
   - In-store families get list wording, not Instacart wording.
8. **Step 4, missed week.**
   - Collapse the day-6-to-9 pile for non-senders to one message.
   - Stop weekly plan emails after two missed weeks. Today the only limit is `ACTIVE_DAYS = 45` (`lib/reminders.ts:119`), and it appears never to close for these families:
     - it is measured from the latest plan's date;
     - the Saturday auto-plan inserts a new plan every week (`lib/autoplan.ts:86`);
     - so the latest plan is always recent, and the weekly plan email continues until they unsubscribe.

     Worth confirming against the send logs.
9. **Step 5, measure.** Track texts that get a STOP reply and email unsubscribes per message type. Nothing does this today.

## 6. The existing skills on the same flow

| Skill | What it says for this flow |
|---|---|
| `retention` | First result = the first send. The welcome series should stop when it's reached (it already does). A day-7 personal note from the founder (the Drop and the cart-ask already have Sarah's "I read every one"). **With under 50 customers, talk to every one:** Sarah could write by hand to all 24 week-one senders who didn't repeat. Do it by hand before automating. Read reasons, not rates. No guilt copy. |
| `onboarding` | Activation = first send. Time-to-value. **Boosters such as pre-filled data**, which means carrying staples forward. Stalled users get a short sequence plus an in-app "welcome back, pick up where you left off". Measure day 1/7/30 retention by cohort, mature cohorts only. One goal per message. |
| `emails` | One email, one job. **Relevance over volume:** fewer, better emails. Exit when they act. **Send at local time:** daily-cron emails go out at 12:00 UTC, which is 4 AM Pacific. **No em dashes in subject lines:** the plan-ready subject is "Your week is planned — {X} and {n} more" (`lib/plan-ready-email.ts:14`). Specific subject lines. |
| `churn-prevention` | Mostly about cancel flows and failed payments, which don't apply here. Useful parts: a "need help?" message when usage drops, and **pause rather than lose**, which fits as a "skip this week" option. Its discount save offers are ruled out by the no-new-promos decision. |

## 7. Comparison: new vs recycled

| Recommendation | Draft skill | Existing skills | New? |
|---|---|---|---|
| Measure the week-two repeat by mature cohort | ✓ | ✓ onboarding | Recycled |
| 5% holdout and a fixed "acted within X hours of the message" window | ✓ | — | **New** |
| Check the metric twice from raw rows | ✓ (V5's own error) | — | **New**, small |
| Pre-fill the repeat: staples and last week's extras in the one-tap cart | ✓ | ✓ onboarding (pre-filled data) | Recycled principle. The specific gap came from reading the code. |
| Fix the ADD-only cart bug | — | — | Found by reading the code, not by either skill |
| Offer "same as last week" from the message | ✓ | partly (onboarding: "welcome back, pick up where you left off") | Mostly new |
| Use the channel they opted into: turn on the Saturday reorder text for texting families | ✓ | — | **New** |
| Time week two to the family's own week-one day | ✓ (inference) | — | **New** (but untested, and labelled so) |
| Repeater-specific wording; rotate wording week to week | ✓ | — | **New** |
| In-store families get list wording | ✓ (their specifics) | ✓ emails (relevance) | Recycled principle. The mismatch came from reading the code. |
| One message, not a pile, for non-senders | ✓ | ✓ emails ("relevance over volume") | Recycled |
| No guilt copy | ✓ | ✓ retention, churn-prevention | Recycled |
| Stop weekly emails after two missed weeks | ✓ | — | **New** |
| Opt-outs per message type as a metric | ✓ | — | **New** |
| Talk to all 24 non-repeating senders by hand | — | ✓ retention | Existing skill only, and probably the highest-value step at this size |
| Emails at local time, not 4 AM Pacific | — | ✓ emails | Existing skill only |
| No em dash in the plan-ready subject | — | ✓ emails | Existing skill only |
| "Skip this week" as a soft pause | partly (the "easy out" in the wording pattern) | ✓ churn-prevention (pause) | Recycled |

**Verdict.** The draft adds six things the four existing skills didn't say:
- the opted-in channel;
- own-day timing;
- rotation;
- the holdout and window;
- the two-missed-weeks stop;
- opt-outs per message.

Everything else it says, the existing skills already gave. The existing skills also gave three things the draft missed: talk to every sender, local-time emails, and no em dashes. The biggest concrete findings (reorder text off by default, wrong in-store wording, staples left out of the cart, the ADD bug, in-store trips unrecorded) came from reading the code. Any of the skills would have surfaced them once applied to the code.

**Worth keeping?** Not as a standalone skill. Fold Steps 0 and 3 to 5 into `retention` as a short "weekly repeat" section, and drop the rest, which duplicates `onboarding` and `emails`. Watching videos as a skill source was worth it only after replacing the two thin videos. Of the original five, only V1 and V5 would have passed.

## 8. Top 5 changes for week two

All five respect STOP and email unsubscribe. Texts go through the existing 9 AM to 8 PM local window (`sendFamilyText`). No new promos. A texted list counts as a send. Wording that promises something the code doesn't yet do (for example, staples in the cart) waits for that code.

### 1. Send the Saturday reorder text to week-one senders who turned texting on

**Before.** No text (`planReady: 'email'` by default). They get only the email, subject "This week’s dinners (your cart is ready)".

**After.** A text, held to their texting hours:

> DinnerDrop: {Name}, your week is ready 🍽️
> 1. Mon: {dinner}
> 2. Tue: {dinner}
> …
> Everything for these dinners is in your Instacart cart. Tap to check out: {link}
> Reply SWAP 2 to change a dinner first. No groceries this week? Just ignore this.
> STOP to opt out

**Code.** A settings default, or a one-time migration of `planReady` to 'both' for texting families.

**Why.** Draft skill: use the channel they chose.

### 2. In-store families get list wording, not Instacart wording

**Before.**
- Drop: "Your Instacart cart is already filled with everything you need. One tap and you're at checkout:"
- Cart-ask: "You sent your DinnerDrop grocery list to In store a little while ago…"

**After.**
- Drop subject: "This week’s dinners (your list is ready)".
- Drop body: "Your list for the store is ready, same as last week. Open it on your phone and check things off as you go, no sign-in: {list}".
- Cart-ask: "You took your DinnerDrop list to the store a little while ago, and I'd love to know how it went."

**Code.** Branch on `store = 'In store'` / `shopsInStore(settings)` in `lib/sunday-drop.ts`, `lib/reminders.ts` (plan-ready) and `lib/cart-ask-campaign.ts`.

### 3. Put last week's staples and extras in the one-tap cart, then say so

**Before.**
- "Your Instacart cart is already filled with everything you need." Today the cart has only the new dinners' ingredients unless the list page was opened.
- If a texted ADD came first, the cart holds only that item.

**After.** Once `itemsForFamily` adds staples and carried items itself, and handles the ADD case: "Your Instacart cart has this week's dinners plus your usual {milk, eggs and 3 more}. One tap and you're at checkout:"

**Code.** `lib/followup.ts`, sharing the logic in `app/(app)/grocery-list/page.tsx:313-334`.

### 4. Repeater wording on shop day, rotated week to week

**Before.** Identical for first week and repeat: "DinnerDrop: it's shop day. Your {n} dinners are planned. Tap once to fill your Instacart cart, no sign-in: {cart} Shopping in person? Your list: {list}"

**After.** For families with a send in the last 14 days, rotate:
- **A.** "DinnerDrop: shop day again, {Name}. This week it's {X}, {Y} and {n} more. Same one tap as last time: {cart}"
- **B.** "DinnerDrop: {X} is on for {Day}. Your cart's ready when you are, one tap: {cart}"
- **C.** "DinnerDrop: week {k} of dinners is planned. Cart: {cart} In the store instead? {list}"

**Code.** `lib/shop-day.ts`. The rotation index could be the week number.

### 5. After a missed week, one message, not up to five; stop after two missed weeks

**Before (days 6 to 9, no send yet).**
- "Still on for {dinner} this week?"
- "Your {store} list is ready: {X} + {n} more"
- "{Day} is shop day: your list for {X} and {n} more"
- If approved, the check-in and the texting invite.

**After.** The Saturday email only. Skip the day-7 activation email when a plan email is due within 48 hours, and skip the shop-day nudge if a plan email went out in the last 3 days. Subject: "Your {store} list for {X} and {n} more is ready whenever you shop". After two weeks with no send, stop the weekly plan email. Today it appears to run indefinitely, because each Saturday auto-plan resets the 45-day "active" check. No guilt wording anywhere.

**Code.** `app/api/cron/email-sequences`, `lib/shop-day.ts`, and `ACTIVE_DAYS` in `lib/reminders.ts:119`.

### Also: fixes with no wording change

- Add the week-two repeat line to the Monday report.
- Send the daily-cron emails at local morning time rather than 4 AM Pacific.
- Replace the em dash in the plan-ready subject.

## 9. Decisions needed from Sarah

1. **Reorder text default.** Turn the Saturday reorder text on for families who turned texting on and sent in week one? It is an outbound text, kept to their 9 AM to 8 PM hours, and skips anyone who texted STOP.
2. **What counts as a texted list.** Today only the "Text me this list" / "Email me this list" buttons record a send. Should opening the no-sign-in list link from a reminder, or checking items off, also count?
3. **Stop rule.** Stop weekly plan emails after two missed weeks? Today the auto-plan keeps resetting the 45-day check, so they appear never to stop.
4. **Holdout.** Hold back about 5% of week-one senders from new week-two messages? At current volume this mainly sets up later measurement.
5. **Hand outreach.** Write personally to the 24 week-one senders who didn't repeat? The `retention` skill's top step. It needs Sarah's own words.
6. **The skill.** Fold the new steps into `retention`, keep `weekly-repeat-habit` as a draft, or drop it?

## Sources

V1 https://www.youtube.com/watch?v=2DisZWEb3bM · V2 https://www.youtube.com/watch?v=4hNpP-lH6c4 · V3′ https://www.youtube.com/watch?v=mwlD4RYJLmA (replaced https://www.youtube.com/watch?v=jlBI7u-3rNs) · V4′ https://www.youtube.com/watch?v=RzalILQOecU (replaced https://www.youtube.com/watch?v=zZSAH4ZktzU) · V5 https://www.youtube.com/watch?v=oNRrjbKiF04
