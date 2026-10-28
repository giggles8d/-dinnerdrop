/**
 * Honest list totals and per-store price calibration.
 *
 * - estimatePrices(): typical-US-supermarket price for a purchase line ("1 gallon almond milk",
 *   "1 pack Freshpet dog food") — used for texted / added / basics lines, which have no recipe cost.
 * - priceFactor: learned from real orders (what the store + Instacart actually charged ÷ what we
 *   estimated at typical prices). Stored in settings.stores.priceFactor; 1.0 = not learned yet,
 *   in which case effectiveFactor() uses DEFAULT_FACTOR.
 */
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { fallbackPrice } from '@/lib/price-factor'
export { DEFAULT_FACTOR, effectiveFactor, factorAtSend, fallbackPrice } from '@/lib/price-factor'

export interface PriceLine { name: string; quantity?: string | null; unit?: string | null }

async function estimateChunk(lines: PriceLine[]): Promise<number[]> {
  try {
    const text = await generateWithClaude(
      `Estimate the typical US supermarket shelf price (USD, 2026) for each grocery purchase below — the whole package as a shopper would buy it (a bag of grapes, a 12-pack of soda, a 35 lb bag of dog food if that's what's named). Return ONLY a JSON array of numbers in the same order, one per line, no text.\n${JSON.stringify(lines.map((l) => `${l.quantity ?? '1'} ${l.unit ?? ''} ${l.name}`.replace(/\s+/g, ' ').trim()))}`,
      400,
    )
    const out = parseClaudeJSON<unknown[]>(text)
    if (Array.isArray(out)) return lines.map((l, i) => { const n = Math.round(Number(out[i]) * 100) / 100; return n > 0 ? n : fallbackPrice(l.name) })
  } catch { /* fall through */ }
  return lines.map((l) => fallbackPrice(l.name))
}

/** Every line gets a price: model estimate in chunks of 20, per-line aisle fallback when it can't. */
export async function estimatePrices(lines: PriceLine[]): Promise<number[]> {
  if (!lines.length) return []
  const chunks: PriceLine[][] = []
  for (let i = 0; i < lines.length; i += 20) chunks.push(lines.slice(i, i + 20))
  const parts = await Promise.all(chunks.map(estimateChunk))
  return parts.flat()
}

export function clampFactor(f: number): number {
  if (!Number.isFinite(f) || f <= 0) return 1
  return Math.min(2.5, Math.max(0.7, Math.round(f * 100) / 100))
}

/** Blend a new observation into the stored factor (first order sets it; later ones move it by half). */
export function blendFactor(current: number | undefined, observed: number): number {
  const o = clampFactor(observed)
  if (!current || current === 1) return o
  return clampFactor((current + o) / 2)
}
