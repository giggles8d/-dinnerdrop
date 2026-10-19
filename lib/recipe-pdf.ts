/**
 * One clean, printable PDF per dinner — the recipe card a parent props up on the counter.
 * Pure pdf-lib (no browser, no fonts to ship); standard Helvetica, so text is kept to WinAnsi
 * characters (fractions ¼ ½ ¾, dashes, accents are fine; emoji are stripped).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Meal } from '@/types'
import { parseQuantity } from '@/lib/portions'
import { safeBite, cookware } from '@/lib/meal-insights'

const GREEN = rgb(0.10, 0.36, 0.22)
const GOLD = rgb(0.91, 0.66, 0.22)
const INK = rgb(0.13, 0.13, 0.13)
const MUTED = rgb(0.42, 0.45, 0.50)
const PAGE_W = 612, PAGE_H = 792, MARGIN = 54

const clean = (s: string) => (s ?? '')
  .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\uFE0F/g, '')   // emoji (surrogate pairs + symbols)
  .replace(/’/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...')
  .replace(/[^\x20-\x7E -ÿ–—•]/g, '')        // keep Latin-1 + dashes + bullet
  .replace(/\s+/g, ' ').trim()

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = clean(text).split(' ')
  const lines: string[] = []; let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(t, size) <= maxW) line = t
    else { if (line) lines.push(line); line = w }
  }
  if (line) lines.push(line)
  return lines
}

/** "1.5" → "1 1/2", "0.25" → "1/4", "2" → "2"; non-numeric text passes through. */
function qtyText(q: string | number): string {
  const n = parseQuantity(q)
  if (n == null) return String(q ?? '')
  const whole = Math.floor(n), rem = n - whole
  const fr = rem >= 0.9 ? '' : rem >= 0.7 ? '3/4' : rem >= 0.6 ? '2/3' : rem >= 0.45 ? '1/2' : rem >= 0.3 ? '1/3' : rem >= 0.2 ? '1/4' : rem >= 0.1 ? '1/8' : ''
  const w = rem >= 0.9 ? whole + 1 : whole
  return fr ? (w ? `${w} ${fr}` : fr) : String(w)
}

export interface RecipePdfOptions { familyName?: string; weekLabel?: string; nightLabel?: string }

export async function recipePdf(meal: Meal, opts: RecipePdfOptions = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${meal.name} — DinnerDrop`)
  doc.setAuthor('DinnerDrop')
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const reg = await doc.embedFont(StandardFonts.Helvetica)
  const obl = await doc.embedFont(StandardFonts.HelveticaOblique)

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN
  const W = PAGE_W - MARGIN * 2

  const newPage = () => { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; footer(page) }
  const ensure = (h: number) => { if (y - h < MARGIN + 24) newPage() }
  const footer = (p: PDFPage) => {
    p.drawText('dinnerdrop.app', { x: MARGIN, y: MARGIN - 20, size: 9, font: reg, color: MUTED })
    const r = clean(`${opts.familyName ? `${opts.familyName} · ` : ''}${opts.weekLabel ?? ''}`)
    if (r) p.drawText(r, { x: PAGE_W - MARGIN - reg.widthOfTextAtSize(r, 9), y: MARGIN - 20, size: 9, font: reg, color: MUTED })
  }
  footer(page)

  // Header band
  page.drawRectangle({ x: 0, y: PAGE_H - 28, width: PAGE_W, height: 28, color: GREEN })
  page.drawText('DinnerDrop', { x: MARGIN, y: PAGE_H - 19, size: 12, font: bold, color: GOLD })
  const night = clean(opts.nightLabel ?? meal.day ?? meal.suggestedNight ?? '')
  if (night) page.drawText(night.toUpperCase(), { x: PAGE_W - MARGIN - bold.widthOfTextAtSize(night.toUpperCase(), 10), y: PAGE_H - 18, size: 10, font: bold, color: rgb(1, 1, 1) })
  y -= 10

  // Title
  for (const l of wrap(meal.name, bold, 24, W)) { page.drawText(l, { x: MARGIN, y: y - 24, size: 24, font: bold, color: GREEN }); y -= 30 }
  y -= 4

  // Meta line
  const total = (meal.cookTime ?? 0) + (meal.prepTime ?? 0)
  const meta = [
    total ? `${total} min total (${meal.prepTime ?? 0} prep + ${meal.cookTime ?? 0} cook)` : '',
    `serves ${meal.servings}`,
    cookware(meal).label,
    meal.estimatedCost > 0 ? `about $${meal.estimatedCost.toFixed(2)}` : '',
    meal.nutrition ? `${meal.nutrition.calories} cal / ${meal.nutrition.protein}g protein per serving` : '',
  ].filter(Boolean).join('  ·  ')
  for (const l of wrap(meta, reg, 10.5, W)) { page.drawText(l, { x: MARGIN, y: y - 11, size: 10.5, font: reg, color: MUTED }); y -= 15 }

  const sb = safeBite(meal)
  if (sb) {
    y -= 4
    const t = `Safe bet for the picky one: ${sb}`
    for (const l of wrap(t, obl, 10.5, W)) { page.drawText(l, { x: MARGIN, y: y - 11, size: 10.5, font: obl, color: GREEN }); y -= 15 }
  }
  y -= 10
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
  y -= 22

  // Ingredients — two columns when there are many
  page.drawText('INGREDIENTS', { x: MARGIN, y: y - 10, size: 10, font: bold, color: GREEN })
  y -= 24
  const ings = (meal.ingredients ?? []).map((i) => clean(`${qtyText(i.quantity)} ${i.unit ?? ''} ${i.name}`.replace(/\s+/g, ' ').trim()))
  const twoCol = ings.length > 7
  const colW = twoCol ? (W - 18) / 2 : W
  const perCol = twoCol ? Math.ceil(ings.length / 2) : ings.length
  let colStartY = y
  let maxDrop = 0
  ings.forEach((t, i) => {
    const col = twoCol && i >= perCol ? 1 : 0
    if (col === 0 && i === 0) colStartY = y
    const x = MARGIN + col * (colW + 18)
    const row = col ? i - perCol : i
    const yy = colStartY - row * 16
    // rough multi-line: shrink long names instead of wrapping to keep rows aligned
    let size = 11
    while (reg.widthOfTextAtSize(`• ${t}`, size) > colW && size > 8) size -= 0.5
    page.drawText(`• ${t}`, { x, y: yy - 11, size, font: reg, color: INK })
    maxDrop = Math.max(maxDrop, (row + 1) * 16)
  })
  y = colStartY - maxDrop - 10
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
  y -= 22

  // Steps
  ensure(40)
  page.drawText('STEPS', { x: MARGIN, y: y - 10, size: 10, font: bold, color: GREEN })
  y -= 26
  ;(meal.steps ?? []).forEach((s, i) => {
    const lines = wrap(s, reg, 11.5, W - 30)
    ensure(lines.length * 16 + 10)
    page.drawCircle({ x: MARGIN + 8, y: y - 6, size: 8, color: GREEN })
    const n = String(i + 1)
    page.drawText(n, { x: MARGIN + 8 - bold.widthOfTextAtSize(n, 9) / 2, y: y - 9.5, size: 9, font: bold, color: rgb(1, 1, 1) })
    lines.forEach((l) => { page.drawText(l, { x: MARGIN + 30, y: y - 11, size: 11.5, font: reg, color: INK }); y -= 16 })
    y -= 8
  })

  if (meal.tags?.length || meal.leftoverFriendly) {
    ensure(30); y -= 6
    const t = clean([meal.leftoverFriendly ? 'leftover-friendly' : '', ...(meal.tags ?? [])].filter(Boolean).join('  ·  '))
    page.drawText(t, { x: MARGIN, y: y - 10, size: 9.5, font: obl, color: MUTED })
  }
  return doc.save()
}

/** A short, filesystem-safe name: "Mon-Beef-Chili.pdf" */
export function recipeFileName(meal: Meal, night?: string): string {
  const d = clean(night ?? meal.day ?? meal.suggestedNight ?? '').slice(0, 3)
  const n = clean(meal.name).replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).slice(0, 5).join('-')
  return `${d ? `${d}-` : ''}${n}.pdf`
}
