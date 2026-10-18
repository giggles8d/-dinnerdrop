/**
 * Portion sanity for generated dinners.
 *
 * The model is asked for shoppable quantities sized to the household, but it
 * drifts toward "recipe for 4" amounts — and leftover-friendly dinners are
 * labeled for two nights without doubling the ingredients. This checks the
 * main protein per serving and scales every ingredient up when it's short.
 *
 * Floors (raw weight per serving): boneless meat/fish 6 oz, bone-in 8 oz,
 * ground meat 5.5 oz (it stretches with beans/pasta), dry pasta 3.5 oz,
 * dry rice 2.5 oz (~1/2 cup). Only scales UP, never down, and never more than 3×.
 */
import type { Ingredient, Meal } from '@/types'

const LB_UNITS = new Set(['lb', 'lbs', 'pound', 'pounds'])
const OZ_UNITS = new Set(['oz', 'ounce', 'ounces'])
/** "1 set salt and pepper", "1 assortment toppings" — pantry-ish lines that don't grow with servings. */
const NO_SCALE = /^(set|assortment|pinch|dash|to taste|drizzle|splash)s?$/i

export function parseQuantity(q: string | number | null | undefined): number | null {
  if (q == null) return null
  if (typeof q === 'number') return Number.isFinite(q) ? q : null
  const t = String(q).trim().replace(/[–-]\s*\d+(\.\d+)?$/, '') // "2-3" → "2"
  const m = t.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?$/)
  if (!m || (!m[1] && !m[2])) return null
  const whole = m[1] ? Number(m[1]) : 0
  const frac = m[2] && m[3] && Number(m[3]) ? Number(m[2]) / Number(m[3]) : 0
  return whole + frac
}

/** Format a scaled quantity the way a shopper reads it: lb/cups to quarters, counts to whole numbers. */
export function formatQuantity(n: number, unit: string): string {
  const u = (unit || '').toLowerCase()
  const step = LB_UNITS.has(u) || u === 'cup' || u === 'cups' ? 0.25 : OZ_UNITS.has(u) ? 1 : u === 'tbsp' || u === 'tsp' ? 0.5 : 1
  const v = Math.ceil(n / step - 1e-9) * step
  const whole = Math.floor(v)
  const rem = Math.round((v - whole) * 4) / 4
  const fr = rem === 0.25 ? '1/4' : rem === 0.5 ? '1/2' : rem === 0.75 ? '3/4' : ''
  if (fr) return whole ? `${whole} ${fr}` : fr
  return String(Math.round(v * 100) / 100)
}

function ouncesOf(i: Ingredient): number | null {
  const n = parseQuantity(i.quantity)
  if (n == null) return null
  const u = (i.unit || '').toLowerCase()
  if (LB_UNITS.has(u)) return n * 16
  if (OZ_UNITS.has(u)) return n
  return null
}

const BONE_IN = /bone-in|bone in|drumstick|thigh.*bone|wings|whole chicken|ribs|shank|t-bone|ribeye bone/i
const GROUND = /ground|mince|sausage|meatball/i
const PASTA = /pasta|penne|spaghetti|rigatoni|fettuccine|linguine|macaroni|rotini|orzo|noodle|ziti|farfalle|shells/i
const RICE = /\brice\b|quinoa|couscous|farro|barley/i

/** Returns the factor (≥1) every ingredient should be multiplied by so the dinner really feeds its servings. */
export function portionFactor(meal: Meal): number {
  const servings = Number(meal.servings) || 0
  if (servings <= 0) return 1
  let factor = 1
  const proteins = (meal.ingredients ?? []).filter((i) => i.category === 'Meat & Seafood')
  const proteinOz = proteins.map(ouncesOf).filter((x): x is number => x != null).reduce((a, b) => a + b, 0)
  if (proteins.length && proteinOz > 0) {
    const names = proteins.map((p) => p.name).join(' ')
    const floor = BONE_IN.test(names) ? 8 : GROUND.test(names) ? 5.5 : 6
    const perServing = proteinOz / servings
    if (perServing < floor) factor = Math.max(factor, floor / perServing)
  }
  const starch = (meal.ingredients ?? []).find((i) => PASTA.test(i.name) || RICE.test(i.name))
  if (starch) {
    const oz = ouncesOf(starch)
    if (oz != null && oz > 0) {
      const floor = PASTA.test(starch.name) ? 3.5 : 2.5
      const perServing = oz / servings
      if (perServing < floor) factor = Math.max(factor, floor / perServing)
    }
  }
  return Math.min(3, Math.round(factor * 100) / 100)
}

/** Scales ingredient quantities (and the cost estimate) so the dinner feeds its stated servings. No-op when already sized right. */
export function ensurePortions(meal: Meal): Meal {
  const f = portionFactor(meal)
  if (f <= 1.05) return meal
  const ingredients = (meal.ingredients ?? []).map((i) => {
    const n = parseQuantity(i.quantity)
    if (n == null || NO_SCALE.test((i.unit || '').trim())) return i
    return { ...i, quantity: formatQuantity(n * f, i.unit) }
  })
  const cost = Number(meal.estimatedCost) || 0
  return { ...meal, ingredients, estimatedCost: cost ? Math.round(cost * f * 100) / 100 : cost }
}
