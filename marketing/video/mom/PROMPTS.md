# Mom video prompts (reuse pattern)

Start frames: `nano_banana_pro`, 9:16, prompt starts with `<<<43682e65-f5f6-4cb3-8ffa-c854db262259>>>` then
"Photorealistic vertical selfie-style frame ... The same woman: light grey hoodie, sunglasses pushed up on her head, curly hair in a loose bun. <SCENE>. <EXPRESSION>, mouth closed. Only one person. No logos, no readable brand text, no text anywhere."

Clips: `veo3_1`, quality `high` (basic below 400 credits), 8 s, 9:16, start_image = the frame's job id.
Higgsfield recommends preset "IN THE DARK" on first submit — resubmit with `declined_preset_id: 24bae836-2c4a-48e0-89b6-49fcc0b21612`.

```
No subtitles. No captions. No music.
SHOT: Handheld vertical selfie, phone at arm's length, slight natural sway.
SUBJECT: The same woman from the start frame: light grey hoodie, sunglasses pushed up on her head, curly hair in a loose bun. Only one person in the shot.
SCENE: <location, time of day, light>.
VISUAL DETAILS: Natural skin texture, real smartphone look, no logos, no readable text.
ACTION: She ... says, with natural lip sync: "<line>"
CINEMATOGRAPHY: Eye-level, ...
AUDIO: Her voice only, dry, warm, real-mom tone, <room tone>.
STYLE: Authentic UGC phone video, photorealistic.
```

Lines used:
- 2026-11-01 (kitchen, Sunday): c1 "If your meal planning app is shutting down this week... here's where I moved my family's dinners." / c2 "I just typed in the dinners we actually loved... and it rebuilt them into this week's plan." / c3 "Five dinners, one grocery list, one tap to Instacart. Code's on the screen."
- 2026-11-02 (work parking lot, Monday): c1 "My meal planning app is closing this week. So no, I'm not starting from scratch. Watch this." / c2 "No card to try it. Three quick questions... and five dinners just show up." / c3 "The grocery list builds itself too. One tap to Instacart. Code's on the screen."

Build: put c1..c3.mp4 + cfg.json in `mom/<date>/`, run `python3 build_mom.py mom/<date>`, check `sheet.jpg`.
Poppins has no "→" glyph — don't use arrows in on-screen text.
- 2026-11-03 (soccer sideline, Tue; angle 3 family votes by text): c1 "Our meal planning app shuts down this week. So I'm planning dinner from the soccer sideline. Watch this." / c2 (kitchen, second phone in hand, screen away) "Here's the good part. Everybody in the house votes on dinner by text. Even my teenager answers." / c3 (dining table) "Five dinners everybody picked, one grocery list, one tap to Instacart. Code's on the screen." Start frames: 35043efb… / f8c48504… / dd874c31…

Fruit Moms note (Nov 2): `fruit/cast.jpg` is a 3-panel sheet, so nano_banana_pro copies the grid. Use the single-panel crop (Higgsfield media `fe5de01d-3e4f-49b5-b7fa-bd1d228dd5f1`) and start the prompt with "ONE single continuous vertical 9:16 image ... Not a collage, no panels". For veo, add "locked-off camera, all three stay visible the entire clip" — Ep 9 take 1 lost Peach mid-clip.
Recipe note (Nov 2): seed_audio said "DinnerDrop. DinnerDrop." for the line "DinnerDrop. Plan your week free." — use "Plan your week free at DinnerDrop." and always transcribe.
- 2026-11-04 (grocery store parking lot, Wed; angle 4 snap the fridge): c1 (driver's seat) "My meal planning app shuts down this week. And I'm not walking in there without a plan. Watch this." / c2 (open fridge, phone screen away, static counter cam) "I just snap the fridge... and it tells me what we can make for dinner tonight." / c3 (at the stove, skillet) "Dinner from what we already had. The rest of the week goes to Instacart in one tap. Code's on the screen." veo3_1 basic/veo-3-1-fast (credits < 400) — same 32 credits/clip as high. Start frames: 0201eff2… / 67682de8… / 3de1baf5…
Fruit Ep 10 (Nov 3, "Practice Ran Late"): start frames dd345141… / 1458168c… / 93f0fe33… (single-panel ref fe5de01d…), clips c131–c133; "IN THE DARK" preset fires on most veo submits — just resend with declined_preset_id.
Recipe (Nov 4): recipe/salmon via build_sections.py; ~49 s with 8 VO sections — fine but on the long side.

## Nurse Mom (second presenter, from Nov 3 2026)
Element `DinnerDrop-NurseMom` 87811554-86f2-4e7c-bab3-7f283e89276c — late-30s single working mom, nurse: navy scrubs, plain charcoal zip fleece, blank badge card, short dark wavy bob, small gold studs. 3 kids (teen ~15, tween ~11 with practice, ~7 picky eater). Alternates days with DinnerDrop-Mom in the 4:30 PM slot.
Start-frame prompt: "<<<87811554-...>>> Photorealistic vertical selfie-style frame ... The same woman: navy scrubs, plain charcoal zip fleece with no logo, short dark wavy bob, small gold studs. <SCENE>. <EXPRESSION>, mouth closed. Only one person. No logos, no readable text anywhere."
NO CHILDREN IN FRAME: a veo clip with her 7-year-old at the table came back "nsfw" (blocked). Show kids with props or off-screen.
- 2026-11-03 Ep 1 "12-Hour Shift" (posted 8:45 PM after ChatGPT/Gemini review): c1 hospital parking garage, in car: "Twelve-hour shift. Three kids. Practice at seven. And nobody's planned dinner." / c2 kitchen table, homework, phone buzzes: "My kids vote on dinner by text. And it plans around my picky one." / c3 gym bleachers at practice: "And when I'm stuck, I just text it a cooking question. It texts me back." / c4 stove, sheet-pan salmon: "Whole list goes to my cart in one tap. Free to try, no card. Code's on the screen." veo3_1 high. 2 app segments, app_seconds 6 (3 segments = 10 s of silence, too long).
