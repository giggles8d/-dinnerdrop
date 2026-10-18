/**
 * Plan-shape helpers shared by the dashboard (client) and the auto-plan cron (server).
 */
import { WEEKDAY_LABEL, type Weekday } from '@/lib/settings'
import type { Meal } from '@/types'

export interface PlanShape {
  dinnersPerWeek: number
  cookDays: Weekday[]
  nightTimes: Array<{ day: Weekday; label: string; minutes: number }>
  leftoverNight: boolean
}

export const DEFAULT_SHAPE: PlanShape = {
  dinnersPerWeek: 5,
  cookDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  nightTimes: [],
  leftoverNight: false,
}

/**
 * Give each chosen dinner a night. Honors the family's cook days, uses the
 * planner's suggestedNight when it names one of those days, and fills the
 * rest in order.
 */
export function assignNights(selected: Meal[], shape: PlanShape): Meal[] {
  const days = shape.cookDays.length ? shape.cookDays : DEFAULT_SHAPE.cookDays
  const labels = days.map((d) => WEEKDAY_LABEL[d])
  const placed: Array<Meal | null> = new Array(labels.length).fill(null)
  const rest: Meal[] = []
  for (const m of selected) {
    const idx = m.suggestedNight ? labels.indexOf(m.suggestedNight) : -1
    if (idx >= 0 && placed[idx] === null) placed[idx] = m
    else rest.push(m)
  }
  const out: Meal[] = []
  let r = 0
  for (let i = 0; i < labels.length; i++) {
    const m = placed[i] ?? rest[r++]
    if (m) out.push({ ...m, day: labels[i] })
  }
  for (; r < rest.length; r++) out.push({ ...rest[r], day: `Day ${out.length + 1}` })
  return out
}

/** ISO date (YYYY-MM-DD) of the Monday that starts the week containing `d`. */
export function mondayOf(d: Date): string {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7))
  return x.toISOString().split('T')[0]
}

/** Local weekday key + hour for a timezone right now. */
export function localNow(timezone: string, at: Date = new Date()): { weekday: Weekday; hour: number; minute: number; dateStr: string } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at)
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at)
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const weekday = get('weekday').slice(0, 3).toLowerCase() as Weekday
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))
  return { weekday, hour, minute, dateStr: `${get('year')}-${get('month')}-${get('day')}` }
}
