# Nurse Mom Ep 1 — "ER nurse vs. what's for dinner" (POSTED Nov 3, 2026, 7:56 PM ET)

The model for future Nurse Mom episodes. Posted on TikTok, YouTube Shorts and Facebook Reels via Publer. 31.7 s, 9:16.
Repo: branch `content-pipeline`, `marketing/video/mom/nurse/2026-11-03b/` (cfg.json, clips.json, scripts, reviews, captions).
Final video: https://d2ol7oe51mr4n9.cloudfront.net/user_3F5CX7FQgyc63KXE3gzU1BCzjOk/ff6e2f6b-6578-4ae3-ab9d-f57ff97bc597.mp4

## Reviews (ChatGPT + Gemini, same chats both rounds)
| | Round 1 (V2) | Round 2 (V3) |
|---|---|---|
| ChatGPT | 7.2, changes needed | **8.8, APPROVE** |
| Gemini | 6.5, changes needed | **9.1, APPROVE** |

## Final script
| Scene | Spoken (Higgsfield voice "Hallie" on every clip) | On screen |
|---|---|---|
| Inside her parked car, hospital garage at night, selfie | "I kept fourteen people alive today. I can't figure out dinner for three kids. So they vote now." | Red title "ER nurse vs. “what's for dinner”"; incoming bubbles "what's for dinner" / "MOM" / "????" |
| Kitchen counter ~1 s, then real app screens (her voice continues) | "DinnerDrop texts them dinner ideas. They reply with numbers. No app. And it plans around my picky seven-year-old." | "Reply the numbers you want" → "1 4 5" / "3 4 5"; "They vote by text. No app." / "Plans around every kid" |
| Couch ~1 s, then real grocery list + Instacart hand-off | "Then one tap sends the whole grocery list to Instacart, Walmart or Kroger." | "One tap. Whole week's groceries." / "Instacart, Walmart or Kroger" |
| Family table selfie, her 3 kids eating behind her | "Dinner's handled. Try it free at DinnerDrop dot app, no card. Use code NURSE for three months of Family free." | "Code NURSE = 3 months of Family free" · "dinnerdrop.app/go/nurse" |
| End card 1.8 s | — | "Try it free, no card" · DinnerDrop · code · URL |

Features covered: family votes by text, one-tap cart (3 stores), no card / no app, plans around the picky kid, price (code). Not covered (future episodes): text-a-cook assistant (planned Ep 2), texting items onto the list, health needs on the plate, swap to save, store deals, fridge photo, receipt check.

## Sarah's rules learned on this episode
- No AI label anywhere on screen; AI disclosure lives only in the caption ("🤖 AI-generated presenter, real app screens").
- It must look real: every shot a phone selfie inside a real location (car = actual car interior), nothing that glitches (no second phone, no "phone buzzes" effects, no logo patches). Check every clip at 2 fps before building.
- One set voice: voice_change to "Hallie" on every clip, including the family clip.
- Kids on camera: veo3_1 blocks them. Use seedance_2_5 (omni_reference, start image + the Hallie line as audio reference, 1080p) — it lip-syncs her with the kids eating behind her.
- Show Sarah before posting; post only on her OK.

## Captions
TikTok: ER nurse vs. "what's for dinner" 😮‍💨 / Try DinnerDrop free, no card. Code NURSE = 3 months of Family free: dinnerdrop.app/go/nurse (link in bio) / The kids vote on dinner by text (no app), it plans around the picky eater, and one tap sends the whole list to Instacart, Walmart or Kroger. / #nursesoftiktok #workingmom #momlife #dinnerideas #mealplanning / 🤖 AI-generated presenter, real app screens
YouTube title: I Kept 14 People Alive Today. Dinner Beat Me. #shorts (description with utm link; Facebook same as TikTok with utm link instead of "link in bio")
