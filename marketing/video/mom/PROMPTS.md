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
