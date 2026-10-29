/**
 * "You saved $X vs takeout" (Sarah, Oct 29 2026 — Gemini's idea from the competitor review).
 * Counts only weeks the family actually shopped (a plan whose list went to a store within 8 days of
 * being planned). Grocery cost = that week's dinners at our estimates × the family's learned store
 * factor (or the order's real total scaled to dinners when they reported one). Takeout = servings ×
 * the family's "takeout per person" setting (default $15, editable). Server-only.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'
import { mergeSettings } from '@/lib/settings'
import { effectiveFactor } from '@/lib/price-factor'

export interface Savings { weeks: number; dinners: number; servings: number; groceryCost: number; takeoutCost: number; saved: number; perServing: number; takeoutPerServing: number }

export async function familySavings(admin: SupabaseClient, userId: string): Promise<Savings> {
  const [{ data: prof }, { data: plans }, { data: hs }] = await Promise.all([
    admin.from('profiles').select('settings').eq('id', userId).single(),
    admin.from('meal_plans').select('id, meals, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
    admin.from('grocery_handoffs').select('created_at, est_total, actual_total').eq('user_id', userId).order('created_at', { ascending: true }),
  ])
  const settings = mergeSettings(prof?.settings)
  const takeoutPerServing = Number(settings.stores.takeoutPerServing) > 0 ? Number(settings.stores.takeoutPerServing) : 15
  const factor = effectiveFactor(settings.stores.priceFactor)
  const handoffs = (hs ?? []) as Array<{ created_at: string; est_total: number | null; actual_total: number | null }>
  const rows = (plans ?? []) as Array<{ id: string; meals: Meal[]; created_at: string }>

  let weeks = 0, dinners = 0, servings = 0, groceryCost = 0, takeoutCost = 0
  rows.forEach((p, i) => {
    const start = new Date(p.created_at).getTime()
    const next = rows[i + 1] ? new Date(rows[i + 1].created_at).getTime() : Infinity
    const end = Math.min(start + 8 * 86400000, next)
    const sent = handoffs.find((h) => { const t = new Date(h.created_at).getTime(); return t >= start && t < end })
    if (!sent) return
    const meals = Array.isArray(p.meals) ? p.meals : []
    if (!meals.length) return
    const estimate = meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
    const serv = meals.reduce((s, m) => s + (Number(m.servings) || 4), 0)
    // A reported real total covers the whole order (snacks, milk…); only use it to set the price level.
    const real = sent.actual_total && sent.est_total && Number(sent.est_total) > 0 ? Number(sent.actual_total) / Number(sent.est_total) : null
    const cost = estimate * (real && real > 0.5 && real < 3 ? real : factor)
    weeks++; dinners += meals.length; servings += serv; groceryCost += cost; takeoutCost += serv * takeoutPerServing
  })
  const round = (n: number) => Math.round(n)
  return { weeks, dinners, servings, groceryCost: round(groceryCost), takeoutCost: round(takeoutCost), saved: Math.max(0, round(takeoutCost - groceryCost)), perServing: servings ? Math.round((groceryCost / servings) * 100) / 100 : 0, takeoutPerServing }
}
