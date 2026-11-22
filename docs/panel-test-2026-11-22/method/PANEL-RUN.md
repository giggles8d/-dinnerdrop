# How to run a panel batch (simulated)

Read BRIEF.md in this folder first. All rules there apply. You do NOT browse the live sites; you evaluate the captured phone-size screenshots and page text (that keeps every panelist on identical pages and keeps the sites untouched).

Invoke the `icp-website-review` skill (Skill tool) and use its **scorecard mode** for each site, then its **head-to-head mode** for the final pick. Its persona file path does not apply: your personas are in `C:\Users\setzl\dinnerdrop\docs\panels\<panel file>.json`. Its five B2B dimensions are replaced by the five measures below.

## Sites and the files each panelist looks at
| Site | 5-second view (look at the image only) | Full page on a phone |
|---|---|---|
| DD dinnerdrop.app | screenshots\dinnerdrop-home-390-first.png | dinnerdrop-home-390-full.png + text\dinnerdrop-home.txt; pricing = text\dinnerdrop-pricing.txt (/pricing lands on /start) + dinnerdrop-pricing-390-first.png; sign-up = dinnerdrop-signup-390-first.png + text |
| EM eMeals | emeals-home-390-first.png | emeals-home-390-full.png + text\emeals-home.txt, text\emeals-mealplans.txt, text\emeals-faq.txt |
| PTE Plan to Eat | plantoeat-home-390-first.png | plantoeat-home-390-full.png + text\plantoeat-home.txt, text\plantoeat-pricing.txt |
| OL Ollie (family meal planning) | ollie-mealplanning-390-first.png | ollie-mealplanning-390-full.png + text\ollie-mealplanning.txt, text\ollie-pricing.txt (+ ollie-home-390-first.png if they tap the logo: a general assistant) |
| HF HelloFresh | hellofresh-home-390-first.png | hellofresh-home-390-full.png + text\hellofresh-home.txt (prices hidden behind a zip box: hellofresh-plans-390-first.png) |

Screenshots folder: C:\Users\setzl\dinnerdrop\docs\panel-test-2026-11-22\screenshots\
Text folder: C:\Users\setzl\AppData\Local\Temp\claude\892371aab147352f\b4d5bf10-12c9-4c08-9db3-94c4a01f3895\scratchpad\text\
Full-page screenshots are tall; use the Read tool on them (it will scale) and use the text file for detail. Load each first-screen image with Read before forming the 5-second impression.

## Order
Each panelist sees the sites in the order given in `orders.json` (same folder) under their id. Follow it exactly; DinnerDrop is not always last.

## Keep each person separate
Handle one person at a time. Before each person, re-read that person's JSON entry (age, tech comfort, income, complication, sceptic, current meal service, voice, deal breakers). Answer in their voice and vocabulary. Write that person's file BEFORE starting the next person. Do not look at other people's answers. Different people should disagree where their profiles differ; a low-tech grandparent, a frugal Aldi shopper and a celiac parent should not sound alike or score alike. Be honest and critical; do not be nice to DinnerDrop because it is the client. Do not over-punish it either.

## What each panelist answers, per site (in their order)
1. After 5 seconds (first-screen image only): what is this, who is it for, do I trust it (low/medium/high + why), what would I do next. Also: do I think this delivers food? (yes / no / unsure) and what on the screen made me think so.
2. After the full page on a phone: would I sign up (yes/maybe/no), what stopped me, what is missing, what would I pay per month (a dollar number; 0 is allowed).
3. Scores 1-10 (integers): clarity, trust, value, ease, want_to_sign_up.
4. One short in-character quote about the site (under 30 words) that references something specific on the page.

## DinnerDrop offer question (DD only)
- Is "14 days of Family free, no card" clear? (clear / partly / unclear) and why.
- What do I expect to happen on day 15? (in their words; note if it is WRONG versus the truth: they drop back to the free plan, nothing is charged unless they added a card).

## Head-to-head (after all five)
- Overall winner for me among the five, and the one reason.
- Pairwise: DinnerDrop vs each competitor: winner (DD or the competitor) and the one reason.

## Output: one JSON file per person
Path: scratchpad\responses\<id>.json
{
 "id": "P1-03", "name": "...", "simulated": true, "order": ["EM","DD",...],
 "sites": {
   "DD": {"five_sec": {"what_is_it":"","who_for":"","trust":"low|medium|high","trust_why":"","next_step":"","delivers_food":"yes|no|unsure","delivers_food_why":""},
          "full_page": {"would_sign_up":"yes|maybe|no","what_stopped_me":"","whats_missing":"","pay_per_month":0},
          "scores": {"clarity":0,"trust":0,"value":0,"ease":0,"want_to_sign_up":0},
          "quote": ""},
   "EM": {...}, "PTE": {...}, "OL": {...}, "HF": {...}
 },
 "dd_offer": {"clear":"clear|partly|unclear","why":"","expect_day_15":"","expectation_correct":true},
 "head_to_head": {"winner":"DD|EM|PTE|OL|HF","reason":"",
   "pairwise": {"EM":{"winner":"DD|EM","reason":""},"PTE":{...},"OL":{...},"HF":{...}}},
 "dd_fix_that_would_move_me": "the single change to DinnerDrop's pages that would most raise my want_to_sign_up, with the page"
}
Write valid JSON (use the Write tool). Scores are simulated opinions, not predictions.
