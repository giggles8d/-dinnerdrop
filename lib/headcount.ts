/**
 * People at dinner, week by week (customer idea, Nov 13 2026: shared custody means "2 people one week and 4 the next").
 * settings.plan.headcount.alternate = true flips between two numbers every other week; anchor is a Monday that is an
 * "a" week. Otherwise the profile's family size. Client-safe.
 */
import type { Settings } from '@/lib/settings'

const DAY = 86400000

function mondayOf(iso: string): number {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  return d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY
}

/** People at dinner for the week containing `weekStart` (YYYY-MM-DD). */
export function headcountFor(settings: Pick<Settings, 'plan'>, weekStart: string, familySize: number): number {
  const h = settings.plan.headcount
  if (!h?.alternate || !h.anchor || !(h.a > 0) || !(h.b > 0)) return familySize
  const weeks = Math.round((mondayOf(weekStart) - mondayOf(h.anchor)) / (7 * DAY))
  return Math.abs(weeks) % 2 === 0 ? h.a : h.b
}

/** The people count a saved week was planned for (leftover-night dinners are made for two nights). */
export function plannedHeadcount(meals: Array<{ servings?: number; leftoverFriendly?: boolean }>): number | null {
  const counts = new Map<number, number>()
  for (const m of meals) {
    const n = m.leftoverFriendly ? Math.round((m.servings || 0) / 2) : m.servings || 0
    if (n > 0) counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  let best: number | null = null
  for (const [n, c] of Array.from(counts)) if (best == null || c > (counts.get(best) ?? 0)) best = n
  return best
}
