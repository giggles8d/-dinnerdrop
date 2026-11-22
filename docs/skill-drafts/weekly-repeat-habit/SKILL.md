---
name: weekly-repeat-habit
description: DRAFT, not installed. Step-by-step procedure for getting a user to repeat a weekly action (order, plan, send, log) in week two and after. Covers the first-week trigger, the week-two nudge, making the repeat easier than the first time, what to do after a missed week, and what to measure. Built from five videos watched on 2026-11-22; only tactics seen in 3+ videos, or in 2 with real numbers shown, are used.
---

# Weekly repeat habit (draft)

**Status:** draft from a watch-to-skill pilot, 2026-11-22. Not installed. Evidence and the full agreement table are in `docs/WATCH-PILOT-2026-11-22.md`.

**Evidence bar.** A step below is here only if 3 or more of the five source videos describe it, or 2 do and one shows real numbers. Where a step needs a detail the videos don't settle (for example, the exact send day), the step says **inference** and explains the reasoning. A creator's claimed lift is their result, not a prediction for your product.

## Step 0: Define the repeat and measure it before changing anything

1. Name the one weekly action that counts as "came back" (for example: a cart sent or a list texted). Write the rule down. Everything later is judged on it.
2. Build one table: signups by week, then for each cohort, how many did the action in week 1 and how many did it again in week 2. Only count cohorts that are at least 14 days old.
3. Check the number twice, from the raw rows. One source creator published a week-one retention jump from about 13% to 22.5%, then found he had calculated it wrong and the real figure was about 14% [V5].
4. Plan a holdout before you send anything new: keep a small random group (the Duolingo test used 5%) on the old behaviour so you can tell whether the new message caused the repeat [V3].

Sources: V5, V3, V1 (D30 as the number that matters).

## Step 1: First-week trigger (right after the first completion)

1. Within a day of the first completed action, send one message that confirms it worked and names what they did, using their own details (their items, their day, their household). Not a generic thank-you [V4, V1].
2. Send it from a sender the user recognises as a person or as "their" thing, not as a company broadcast. The a16z point: a notification that reads as coming from a friend or the host of an event is welcome; one from the brand about something you don't care about is not [V1]. The post-purchase example is a plain-text note signed by the family that runs the shop [V4].
3. One job per message: say what happens next week in one sentence and give one action.

Sources: V1, V2 (instant celebration on first completion), V4. The exact "within a day" timing is in 2 videos without numbers; treat it as a starting point to test.

## Step 2: Make the repeat easier than the first time

Before writing any week-two message, cut the work the second time:

1. Carry last week forward: whatever they chose, entered or bought last time is pre-filled, so the repeat is a review, not a rebuild [V5: saved custom bottles and a one-tap quick add; V2: one big "log it" button].
2. Count the taps from the reminder to the done state. Make it shorter than the first-time path. Speed to value is the first of the a16z list [V1].
3. Fix anything that breaks trust in the result before nudging more people into it. Wrong results and small annoyances cause churn on their own [V5].

Sources: V1, V2, V5.

## Step 3: The week-two nudge

**Timing (inference).** Anchor to the user's own week-one day and time: send shortly before the day they acted last week, inside the hours your product already allows. Why: the videos agree messages should be triggered by what the user actually did [V1, V3, V4], and Duolingo's reminder in V2 arrived in the hour before the streak would break. No video tests a weekly send day, so test this.

**Channel.** Use the channel they used or opted into in week one. Do not add a channel to fix a number. Once someone turns notifications off, they rarely turn them back on [V1, opinion from experience, no number].

**Frequency.** One week-two nudge, not a series. The videos warn that over-sending is the fastest way to lose the channel [V1], Duolingo's system penalises re-sending a recently used message [V3], and the email example moves people to a lower-frequency channel instead of sending more [V4].

**Wording pattern** (fill in from your product):

> [Recognisable sender]: [Their thing from last week, named] is ready to go again. [One sentence on what is pre-filled or changed]. [One action, with how long it takes]. [Easy out: skip this week / stop these].

Rules for the wording:
- Their specifics, not a generic prompt. In Duolingo's own A/B test, choosing which message each person got (instead of a random one from the same pool) raised daily active users 0.5% and new-user day-7 retention 2.0% [V3; Duolingo's published result, at Duolingo's scale].
- Rotate the wording week to week. A message the person has seen recently works less well; Duolingo built in a recency penalty with a 15-day half-life [V3]. V2 also saw the wording change over the week.
- Stop the moment they act. The email flow in V4 exits anyone who has ordered since entering it; Duolingo only sends a message to people it applies to [V3].

Sources: V1, V2, V3, V4.

## Step 4: After a missed week

None of the five videos tests a missed-week message for a weekly product, so this step applies the tactics above and nothing more.

1. Send one message at their usual time the following week. Different wording from last week's nudge [V3 rotation].
2. Lead with what is already done for them (Step 2), not with what they missed.
3. Do not escalate: no extra channels, no guilt, no sad mascot. Guilt escalation appears in one video only [V2] and is listed as unproven.
4. After two missed weeks in a row, stop the weekly nudge and keep only the low-frequency channel the user chose [V1, V4 frequency restraint].

## Step 5: What to measure

| Measure | How | Source |
|---|---|---|
| Week-2 repeat rate | Of a signup cohort that acted in week 1, % who act again in week 2. Mature cohorts only. | V5, V1 |
| Message-caused repeat | Act within a fixed window after the message (Duolingo used 2 hours) vs the holdout | V3 |
| Opt-out per message | Stops/unsubscribes per message sent; a rising rate means you are spending the channel | V1 |
| Repeat path length | Taps from message to done, week 2 vs week 1 | V1, V5 |

Read small numbers as stories: with tens of users, look at who repeated and why before trusting a percentage.

## Unproven (do not build on these without your own test)

Single-source or two-source-without-numbers tactics from the same videos: streak counters [V1, V2], status or leaderboards [V1, V2], guilt or loss-aversion escalation after a lapse [V2], multi-channel escalation (push, email, widget) [V2], a commitment goal set during onboarding [V2], gating the product behind onboarding steps [V1], give-to-get reciprocity [V1], year-end "wrapped" summaries [V1], a discount on the next order [V4], a review ask about 12 days after purchase [V4].

## Sources

- V1: [7 Ways to Boost Retention, a16z with Bryan Kim](https://www.youtube.com/watch?v=2DisZWEb3bM)
- V2: [How I Designed My App to Be Impossible to Ignore (Duolingo teardown), Josh Mountain](https://www.youtube.com/watch?v=4hNpP-lH6c4)
- V3: [Paper club: A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications (Duolingo), CloudWalk](https://www.youtube.com/watch?v=mwlD4RYJLmA). Replaced the assigned push-notification video, which had no evidence behind its claims.
- V4: [How to Create a Post Purchase Flow (Klaviyo tutorial), Walshy Mails](https://www.youtube.com/watch?v=RzalILQOecU). Replaced the assigned 96-second Mailchimp clip.
- V5: [I Built An App (But Users KEEP dropping off), Chris Raroque](https://www.youtube.com/watch?v=oNRrjbKiF04)
