# Holiday push, Nov 27 2026 (Sarah's Task C)

Branch `claude/dinnerdrop-holiday`. Nothing here changes the site. No migration, no page edit, nothing merged to main.

Offer in every piece: every new family gets 14 days of Family free, no card. No other promo. Every piece says DinnerDrop does not deliver food.

## What is where

| Piece | Where it lives | State |
|---|---|---|
| Email | `email.html`, `email.txt`; Resend broadcast `afe0c9a5-e6c7-4db2-97f0-b9c09852a2e2` | Draft. NOT sent. Needs Sarah's yes. |
| Email test | Resend broadcast `8b0171cc-611e-41bf-abf6-17d0cdf713ff` | Sent to sarah@dinnerdrop.app only, delivered Nov 27 |
| Pins (12) | Publer, DinnerDrop (Pinterest), label "Holiday push Nov 2026" | Scheduled Nov 27 to Dec 3 |
| Shorts (5) | `../video/holiday-2026/` (scripts in each `cfg.json`); Publer, 7:30 PM slot | Scheduled Nov 27 to Dec 1 on YouTube, TikTok, Facebook |
| Final copy + ChatGPT/Gemini review | `CoworkOutputs\AppDev\DinnerDrop\2026-11-27_Holiday-Push-Copy.md` | Final |

## Sending the email (only after Sarah says yes)

The Resend segment "DinnerDrop families (holiday email, load on send)" (`6580bd57-736a-43c6-9913-58424055c739`) is empty on purpose, so the draft cannot reach anyone by accident and the list is fresh on the day it goes.

1. Read the list from Supabase `profiles`: has an email, `email_unsubscribed` is not true, not `settings.isTest`, and not `@dinnerdrop.app`, `setzl1979(+…)@gmail.com` or `@camcomfginc.com`. On Nov 27 that was 760 addresses.
2. Import them into that segment (Resend contact import, first name from `full_name`). Check the count matches and spot-check that nobody outside the query got in.
3. Send broadcast `afe0c9a5-…`.
4. Afterwards, copy Resend unsubscribes back to Supabase (`profiles.email_unsubscribed = true`). The broadcast uses Resend's own unsubscribe link, and Resend has no webhook into the app, so without this step the app would keep emailing people who opted out here.

## Facts worth keeping

- The 14 free days go only to accounts in their first 3 days (`lib/family-grant.ts`). The email list is existing signups, so the email offers the 14 days as a forward-to-a-friend line and sends existing families to their own dashboard.
- Pins use the live pin maker: `https://www.dinnerdrop.app/api/pin-image/<slug>?k=<tag>`. Publer needs `album_id` (the board id), not the board name. The destination link goes in `network_options.url`.
- Thanksgiving was Thu Nov 26. USDA: cooked leftovers keep 3 to 4 days in the fridge, so nothing dated after Mon Nov 30 calls fridge food "leftover".
- The daily video pipeline lives on the `content-pipeline` branch (`marketing/video/README.md`, `log.md`). These five Shorts sit in its 7:30 PM slot Nov 27 to Dec 1; its log was not edited from this branch.
