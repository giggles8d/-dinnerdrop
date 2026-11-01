/**
 * Pull dinner names out of an export pasted from another meal-planning app (Ollie, eMeals, Mealime…).
 * The format of Ollie's shutdown export isn't published, so this accepts JSON or plain text and keeps only
 * lines that look like dish names. No network, no AI: the family checks the list before it's rebuilt.
 */

const NAME_KEYS = /^(name|title|recipe|recipe_?name|meal|meal_?name|dish|dinner)$/i
const SKIP_KEYS = /^(ingredients?|instructions?|steps?|directions?|notes?|description|nutrition|tags?|url|image|photo|user|profile|account|household|members?|family|people|person|settings|preferences)$/i
const HEADER = /^(grocery|shopping|ingredients?|instructions?|directions?|steps?|method|notes?|nutrition|pantry|your\b|exported|export\b|meal plans?|week of|servings?|prep time|cook time|total time|calories|favou?rites|recipes|cookbook|saved|dinners|this week|next week|last week)\b/i
/** Headings after which lines are ingredients or steps, not dish names — skipped until a blank line or a dish heading. */
const NON_DISH_SECTION = /^(grocery( list)?|shopping( list)?|ingredients?|instructions?|directions?|steps?|method|notes?|nutrition|pantry)\s*:?\s*$/i
const DISH_SECTION = /^(favou?rites|recipes|cookbook|saved( recipes)?|dinners|meal plans?|week of\b.*|this week|next week|last week)\s*:?\s*$/i
const QUANTITY = /^(\d+([./]\d+)?|½|¼|¾|⅓|⅔|a|an|one|two|three|four|half)\s*(cups?|c\.|tbsp|tablespoons?|tsp|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|ml|l|liters?|cans?|cloves?|pinch|dash|slices?|pieces?|packages?|pkg|bunch(es)?|heads?|sticks?|large|medium|small|whole)\b/i
const DAY_PREFIX = /^(mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(r(s(day)?)?)?|fri(day)?|sat(urday)?|sun(day)?|day\s*\d+|dinner|lunch|breakfast|meal\s*\d*|night\s*\d+)\s*[:\-–—]\s*/i

function clean(line: string): string {
  let s = line.trim()
  s = s.replace(/^(\d+[.)]|[-*•·▪◦]|\[[ x]\])\s*/i, '')   // list markers
  s = s.replace(DAY_PREFIX, '')
  s = s.replace(/\s*[([].*?(servings?|serves|min(utes)?|cal(ories)?|mins?)[)\]]\s*$/i, '') // trailing "(4 servings)"
  s = s.replace(/\s*[-–—|]\s*\d+\s*(min(utes)?|mins?)\s*$/i, '')                         // trailing " - 30 min"
  s = s.replace(/^["'“”]+|["'“”]+$/g, '').replace(/\s+/g, ' ').trim()
  return s
}

function looksLikeDish(s: string): boolean {
  if (s.length < 3 || s.length > 70) return false
  if (/https?:\/\/|www\.|@|\bollie\b|\bexport/i.test(s)) return false
  if (HEADER.test(s) || QUANTITY.test(s)) return false
  if (/^\d[\d\s/:.,-]*$/.test(s)) return false                 // dates, times, numbers
  if (/[.!?]$/.test(s) && s.split(' ').length > 6) return false  // a sentence (instructions)
  if (!/[a-z]/i.test(s)) return false
  return s.split(' ').length <= 10
}

function fromJson(v: unknown, out: string[], key = ''): void {
  if (typeof v === 'string') {
    if (NAME_KEYS.test(key)) out.push(v)
    return
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === 'string' && (NAME_KEYS.test(key) || /^(recipes|meals|dinners|favorites|favourites|cookbook)$/i.test(key))) out.push(x)
      else fromJson(x, out, key)
    }
    return
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (SKIP_KEYS.test(k)) continue
      fromJson(x, out, k)
    }
  }
}

export function extractDinnerNames(text: string, max = 40): string[] {
  const raw = String(text ?? '').slice(0, 100_000)
  let candidates: string[] = []
  const trimmed = raw.trim()
  if (/^[[{]/.test(trimmed)) {
    try { fromJson(JSON.parse(trimmed), candidates) } catch { candidates = [] }
  }
  if (!candidates.length) {
    // CSV with a header row: take the name/title column.
    const lines = raw.split(/\r?\n/)
    const head = lines[0]?.split(',').map((h) => h.trim().replace(/^"|"$/g, '')) ?? []
    const col = head.findIndex((h) => NAME_KEYS.test(h))
    if (col >= 0 && lines.length > 1) {
      candidates = lines.slice(1).map((l) => (l.split(',')[col] ?? '').replace(/^"|"$/g, ''))
    } else {
      candidates = lines
    }
  }
  const seen = new Set<string>()
  const out: string[] = []
  let skipping = false
  for (const c of candidates) {
    const line = c.trim()
    if (!line) { skipping = false; continue }
    if (NON_DISH_SECTION.test(line.replace(/^[-*•#\s]+/, ''))) { skipping = true; continue }
    if (DISH_SECTION.test(line.replace(/^[-*•#\s]+/, ''))) { skipping = false; continue }
    if (skipping) continue
    const s = clean(c)
    if (!looksLikeDish(s)) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
    if (out.length >= max) break
  }
  return out
}
