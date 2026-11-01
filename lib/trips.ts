/**
 * Shopping trips (Nov 1 2026, Sarah). A family can start its week on any day and shop 1–3 times a week; each trip
 * plans its own dinners for the nights it covers. Defaults reproduce the original behavior exactly: week starts
 * Monday, one trip, and every period key is the Monday date (mondayOf), so existing families see no change.
 *
 * Pure date math on 'YYYY-MM-DD' strings (UTC arithmetic, no time zones): callers pass the family's local date.
 */
import { WEEKDAYS, type Weekday } from '@/lib/settings'

export interface TripSetting {
  shopDay: Weekday
  nights?: Weekday[]        // explicit nights (a night the family moved); omitted = assigned automatically
  store?: string
  vote?: boolean            // family vote text the day before (Family plan)
}

export interface TripsConfig {
  weekStart: Weekday
  trips: TripSetting[]      // empty = one trip, the original setup
  cookDays: Weekday[]
  shopDay: Weekday          // the original single shop-by day (used when trips is empty)
}

export interface ResolvedTrip {
  index: number
  shopDay: Weekday
  nights: Weekday[]         // in the order they happen after the shop day
  store?: string
  vote: boolean
}

export interface TripInstance {
  index: number             // which trip in the family's setup
  shopDate: string          // YYYY-MM-DD
  nights: Array<{ day: Weekday; date: string }>
  key: string               // stored as week_start for this trip's plan, list and votes
}

const IDX: Record<Weekday, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }

function toDate(s: string): Date { return new Date(`${s}T00:00:00Z`) }
function iso(d: Date): string { return d.toISOString().slice(0, 10) }
export function addDays(s: string, n: number): string { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
export function weekdayOf(s: string): Weekday { return WEEKDAYS[(toDate(s).getUTCDay() + 6) % 7] }

/** Days forward from `a` to `b` (0–6). */
function ahead(a: Weekday, b: Weekday): number { return (IDX[b] - IDX[a] + 7) % 7 }

/** True when the family uses the original setup (Monday week, one trip): keys are plain Monday dates. */
export function isClassic(c: TripsConfig): boolean {
  // One trip = the original setup, whatever day the week is shown from (review, Nov 1: changing only the
  // week start must not switch a family into trip mode).
  return c.trips.length <= 1
}

/** The family's trips with their nights filled in. A trip covers the cook nights after its shop day, up to and including the next trip's shop day. */
export function resolveTrips(c: TripsConfig): ResolvedTrip[] {
  const cook = new Set(c.cookDays.length ? c.cookDays : (['mon', 'tue', 'wed', 'thu', 'fri'] as Weekday[]))
  const raw: TripSetting[] = c.trips.length ? c.trips : [{ shopDay: c.shopDay, vote: true }]
  // Order trips through the family's week, starting at its first shop day on or after the week start.
  const sorted = raw.map((t, i) => ({ t, i })).sort((a, b) => ahead(c.weekStart, a.t.shopDay) - ahead(c.weekStart, b.t.shopDay))
  const explicit = new Set<Weekday>(sorted.flatMap(({ t }) => t.nights ?? []))
  const after = (shop: Weekday, d: Weekday) => ahead(shop, d) || 7   // a dinner on the shop day itself is a week out
  return sorted.map(({ t }, k) => {
    // Automatic nights: after this shop day, up to and including the next trip's shop day.
    const next = sorted.length > 1 ? sorted[(k + 1) % sorted.length].t.shopDay : t.shopDay
    const span = sorted.length > 1 ? (ahead(t.shopDay, next) || 7) : 7
    const auto: Weekday[] = []
    for (let s = 1; s <= span; s++) {
      const d = WEEKDAYS[(IDX[t.shopDay] + s) % 7]
      if (cook.has(d)) auto.push(d)
    }
    // Nights a family moved stay where they put them; any cook night nobody claimed keeps its automatic trip.
    const mine = (t.nights ?? []).filter((d) => cook.has(d))
    const nights = Array.from(new Set([...mine, ...auto.filter((d) => !explicit.has(d))])).sort((a, b) => after(t.shopDay, a) - after(t.shopDay, b))
    return { index: k, shopDay: t.shopDay, nights, store: t.store, vote: t.vote !== false }
  })
}

/** Start date of the family's week containing `date`. */
export function weekStartOf(date: string, weekStart: Weekday): string {
  return addDays(date, -ahead(weekStart, weekdayOf(date)))
}

/** The Monday date of the week containing `date` (same as lib/plan mondayOf). */
export function mondayOfDate(date: string): string { return weekStartOf(date, 'mon') }

/**
 * Trip instances (each actual shopping trip with real dates) for the family's week containing `date`,
 * plus the following week, in date order. In the classic setup there is one per week, keyed by its Monday.
 */
export function tripInstances(c: TripsConfig, date: string, weeks = 2): TripInstance[] {
  const trips = resolveTrips(c)
  const out: TripInstance[] = []
  const ws0 = weekStartOf(date, c.weekStart)
  for (let w = -1; w < weeks; w++) {
    const ws = addDays(ws0, 7 * w)
    for (const t of trips) {
      const shopDate = addDays(ws, ahead(c.weekStart, t.shopDay))
      const nights = t.nights.map((d) => ({ day: d, date: addDays(shopDate, ahead(t.shopDay, d) || 7) }))
      const key = isClassic(c) ? mondayOfDate(nights[0]?.date ?? addDays(shopDate, 1)) : (nights[0]?.date ?? addDays(shopDate, 1))
      out.push({ index: t.index, shopDate, nights, key })
    }
  }
  out.sort((a, b) => (a.shopDate < b.shopDate ? -1 : a.shopDate > b.shopDate ? 1 : a.index - b.index))
  // Drop duplicate keys (classic: one per Monday).
  const seen = new Set<string>()
  return out.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)))
}

/** The trip a family is shopping for on `date`: the next trip whose shop day is today or later. */
export function shoppingTrip(c: TripsConfig, date: string): TripInstance {
  const list = tripInstances(c, date)
  return list.find((t) => t.shopDate >= date && t.nights.length > 0) ?? list[list.length - 1]
}

/** The trip whose dinner is tonight (or null on a night with no planned dinner). */
export function tonightTrip(c: TripsConfig, date: string): TripInstance | null {
  return tripInstances(c, date).find((t) => t.nights.some((n) => n.date === date)) ?? null
}

/** The trip whose family vote happens on `date` (the day before its shop day), if any. */
export function voteTripOn(c: TripsConfig, date: string): TripInstance | null {
  return tripInstances(c, date).find((t) => t.nights.length > 0 && addDays(t.shopDate, -1) === date) ?? null
}

/** The trip whose list is "current" on `date`: the first one that still has a dinner tonight or later. */
export function currentTrip(c: TripsConfig, date: string): TripInstance {
  const list = tripInstances(c, date)
  return list.find((t) => (t.nights[t.nights.length - 1]?.date ?? t.shopDate) >= date) ?? list[list.length - 1]
}

/** The week_start key for `date`. Classic setup: exactly the Monday date, as before. */
export function currentKey(c: TripsConfig, date: string): string {
  return isClassic(c) ? mondayOfDate(date) : currentTrip(c, date).key
}

/** The trip instance whose key is `key` (keys are first-night dates, or Monday dates in the classic setup). */
export function tripByKey(c: TripsConfig, key: string): TripInstance | null {
  return tripInstances(c, key).find((t) => t.key === key) ?? null
}
