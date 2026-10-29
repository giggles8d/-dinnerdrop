import type { Meal } from '@/types'

/** Per-serving nutrition. calories in kcal; protein/carbs/fat/satFat/fiber/sugar in grams; sodium in mg. */
export interface Nutrition { calories: number; protein: number; carbs?: number; fat?: number; satFat?: number; fiber?: number; sugar?: number; sodium?: number }

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : NaN }

/**
 * Clean an estimate: sane bounds, rounded, and calories that agree with the macros
 * (4 kcal/g protein and carbs, 9 kcal/g fat). If they disagree by more than 20%, the macros win.
 */
export function cleanNutrition(raw: unknown): Nutrition | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const protein = num(r.protein), carbs = num(r.carbs), fat = num(r.fat)
  let calories = num(r.calories)
  if (Number.isNaN(protein) || protein > 150) return null
  const full = !Number.isNaN(carbs) && !Number.isNaN(fat) && carbs <= 300 && fat <= 150
  if (full) {
    const fromMacros = protein * 4 + carbs * 4 + fat * 9
    if (Number.isNaN(calories) || Math.abs(calories - fromMacros) / Math.max(fromMacros, 1) > 0.2) calories = fromMacros
  }
  if (Number.isNaN(calories) || calories < 80 || calories > 2500) return null
  const out: Nutrition = { calories: Math.round(calories / 10) * 10, protein: Math.round(protein) }
  if (full) {
    out.carbs = Math.round(carbs); out.fat = Math.round(fat)
    const satFat = num(r.satFat), fiber = num(r.fiber), sugar = num(r.sugar), sodium = num(r.sodium)
    if (!Number.isNaN(satFat) && satFat <= fat) out.satFat = Math.round(satFat)
    if (!Number.isNaN(fiber) && fiber <= carbs) out.fiber = Math.round(fiber)
    if (!Number.isNaN(sugar) && sugar <= carbs) out.sugar = Math.round(sugar)
    if (!Number.isNaN(sodium) && sodium <= 6000) out.sodium = Math.round(sodium / 10) * 10
  }
  return out
}

export const hasFullNutrition = (n: Meal['nutrition'] | null | undefined) => !!n && (n as Nutrition).carbs != null && (n as Nutrition).fat != null

/** Shares of calories from protein / carbs / fat (percent, sums to ~100). */
export function macroSplit(n: Nutrition): { protein: number; carbs: number; fat: number } | null {
  if (n.carbs == null || n.fat == null) return null
  const p = n.protein * 4, c = n.carbs * 4, f = n.fat * 9, t = p + c + f
  if (!t) return null
  return { protein: Math.round((p / t) * 100), carbs: Math.round((c / t) * 100), fat: 100 - Math.round((p / t) * 100) - Math.round((c / t) * 100) }
}

