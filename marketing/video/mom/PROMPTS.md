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
