# Recipe library pipeline

Grows the shared `public.recipes` library with ORIGINAL DinnerDrop recipes (no copying other sites' text).

1. Pull current names: `select name from public.recipes order by name;` → `existing.txt`
2. Writers follow `BRIEF.md` (theme per writer) → `out_*.json`
3. `EXISTING=existing.txt OUT=batch.json node validate.js out_*.json` — fix anything it flags (butter lettuce / corn tortilla hits are false positives)
4. `RECIPE_TOKEN=<app_kv.recipe_image_token> ./push.sh batch.json` → POST /api/admin/recipes-bulk (dupes by name are skipped)
5. Photos are added later by the scheduled OpenArt photo task (/api/admin/recipe-image).
