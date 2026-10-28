# DinnerDrop daily video pipeline (3 posts/day)

Sarah's standing instruction (2026-10-28): post **3 videos a day** on DinnerDrop's TikTok, YouTube Shorts and Facebook Reels:
1 **fruit video** (Fruit Moms episode), 1 **trend video**, 1 **recipe Short**. She approved the first batch (Oct 28/29); since then post without asking, then send her a short daily list of what went out.

## Rules (from Sarah)
- Speak as DinnerDrop or as the cartoon characters. **No fake testimonials, no real people.**
- **AI disclosure on every platform.** Publer's API has no AI-label switch, so put the disclosure in every caption (e.g. "🤖 AI-generated characters" / "AI voiceover").
- No real brand logos in generated images (regenerate if any appear). Instacart / DinnerDrop names in dialogue are fine.
- No "beta" or "founding" copy.

## Schedule (America/New_York)
| Slot | Time | Format |
|---|---|---|
| 1 | 11:30 AM | Recipe Short |
| 2 | 4:30 PM | Trend video |
| 3 | 7:30 PM | Fruit Moms episode |

Trend rotation by weekday: Mon "$X grocery haul" · Tue "Girl dinner vs real dinner" · Wed viral-ingredient remix · Thu "POV: it's 5 PM" · Fri fridge clean-out (pantry feature) · Sat ASMR ingredient→plate (no talking) · Sun "Sunday reset: plan the week in 60 s".

## Links in captions (so signups show their source in the Monday report)
- YouTube description: `https://dinnerdrop.app/?utm_source=youtube&utm_medium=shorts&utm_campaign=<slot>` (slot = fruit / recipe / trend)
- Facebook: `dinnerdrop.app/?utm_source=facebook&utm_medium=reels&utm_campaign=<slot>`
- TikTok captions can't hold clickable links — keep the bio link `dinnerdrop.app/go/fruit` (records as source "code · fruit").
- Fruit episodes can keep `dinnerdrop.app/go/fruit` on screen.

## Posting
Publer workspace "SkillPulses Media" (Business plan, 13 account slots). DinnerDrop account ids:
- TikTok `6a0cfcd01ce4f41e25dffbd4` (post_type `video`)
- YouTube `6ae27b77036420dc8f41b32f` (post_type `short`, set `title`)
- Facebook Page `6ae27af939b86c38eeb4e8b5` (post_type `reel`)
Flow: upload the mp4 to Higgsfield (media_upload → curl PUT → media_confirm) to get a public URL → `upload_publer_media_from_url` → `submit_publer_posts` when=`schedule`, one call per account.

## Building
- **Recipe Short** — `recipe/build.py`: pick a public library recipe with an image (`recipes` table, ≤30 min total, not posted before — see `log.md`), photo top / text below, Higgsfield `seed_audio` voiceover (voice Ainsley `731b4ffe-e95e-59f4-8c00-81608936091f`, ~0.5 credits), app cutaway, green end card. Edit the ingredient/step text and VO timings (ffmpeg silencedetect) per recipe.
- **Trend** — `trend/build_pov.py` is the Thursday template: 4 `nano_banana_pro` stills (2 credits each, prompt "no logos, no readable brand text"), seed_audio VO (voice Raina `1c3a4775-9afb-52c1-a2bf-b6543231a9a1`), on-screen text, app footage, end card.
- **Fruit Moms** — `fruit/assemble.py` (Ep 5 config). Characters: Peach (denim jacket), Lemon (pink hoodie), Blueberry (purple crown, mustard cardigan); reference `fruit/cast.jpg` (Higgsfield media `469bf210-6e62-4330-bef4-fd49ede5049e`). 3 start frames with `nano_banana_pro` (image_references) → 3× `veo3_1` 8 s 9:16 with dialogue in the prompt (retry with `declined_preset_id` if a preset is recommended; say "exactly three characters" — Veo once duplicated a character). ~145 credits/episode. Put clips in `fruit/clips/`, add an entry to `VIDEOS`, run `python3 assemble.py <key>`. Last clip carries "FOLLOW FOR EP n+1", "3 MONTHS FREE · CODE FRUIT" and `dinnerdrop.app/go/fruit`.
- App footage: `apps/mobile/store/review/2026-10-21_DinnerDrop_AppReview.mp4` (gitignored; if missing, download it to that path from https://d2ol7oe51mr4n9.cloudfront.net/user_3F5CX7FQgyc63KXE3gzU1BCzjOk/41a3929b-2ec1-444c-a267-106c7e44551f.mp4). Segments: (week 88–97 s, cards 54–62 s, list 110–122 s, Instacart 136–152 s).
- Always look at a contact sheet of every finished video before scheduling (logos, duplicate characters, text overflowing the frame).

Credits: check `mcp__Higgsfield__balance`. If under ~300, switch the fruit slot to every other day and tell Sarah.
