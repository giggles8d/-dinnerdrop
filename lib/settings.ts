/**
 * Typed shape of profiles.settings (jsonb) — the Settings screen's bag.
 * Everything has a default so old profiles ({}), partial saves, and new fields
 * all resolve to a complete object via mergeSettings().
 */

import type { ProteinMix } from '@/lib/protein-mix'

import type { TripSetting } from '@/lib/trips'

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const WEEKDAY_LABEL: Record<Weekday, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

export type Channel = 'email' | 'sms' | 'both' | 'off'

export interface Settings {
  plan: {
    dinnersPerWeek: number          // 3–7 cooked dinners
    optionsCount: number            // 5–10 options to pick from
    leftoverNight: boolean          // plan one fewer cook and mark a leftover night
    includeLunches: boolean         // add simple lunches to the grocery list
    includeBreakfasts: boolean
    cookDays: Weekday[]             // which nights get a planned dinner
    weekdayCookTimes: Partial<Record<Weekday, number>>  // per-night max minutes (overrides max_cook_time)
    maxLongCookNights: number       // slow-cooker / Instant Pot all-day dinners per week; -1 = no limit
    sundayDinner: { on: boolean; minutes: number; times: number[]; options: number; extraForMonday: boolean }  // one bigger sit-down Sunday dinner (Nov 7 2026); times = the lengths to mix (60 / 120 / 240), minutes = the longest
  }
  food: {
    style: string | null            // first picked food style (kept for older code); see `styles`
    styles: string[]                // every food style preset the family picked (lib/styles.ts); combine
    cuisines: string[]              // preferred cuisines (empty = mixed)
    avoidProteins: string[]
    neverIngredients: string[]      // hard exclusions (beyond dietary needs)
    spice: 'mild' | 'medium' | 'hot'
    equipment: string[]             // 'air fryer' | 'instant pot' | 'slow cooker' | 'sheet pan' | 'grill'
    kidFriendly: boolean            // one safe thing on every plate
    nutritionInfo: boolean          // show calories/protein per serving
    maxCalories: number             // per-serving calorie cap for planned dinners (0 = no cap)
    useSales: boolean               // build the week around this week's store sales when a flyer is loaded
    mix: ProteinMix                 // dinners per week by protein group (chicken 2, beef 1…); null = any mix
    mixEvery: Partial<Record<import('@/lib/protein-mix').MixKey, 1 | 2 | 4>>  // how often a group is on: every week (1), every other week (2), once a month (4)
    familyRecipesPerWeek: number    // the family's own recipes (lib/family-recipes) rotated into each week's options, 0–3
    productPrefs: import('@/lib/product-prefs').ProductPref[]  // "when a recipe needs X, buy Y" (lib/product-prefs)
    storeBrands: boolean            // prefer the store's own brand (Walmart, Kroger) when it matches as well
  }
  deals: {
    stockUp: boolean                // "Stock up while it's cheap" on the list (multi-buys, pantry/drink deals)
    weeklyText: boolean             // text the planner the best deals when a new ad lands
  }
  schedule: {
    weekStart: Weekday              // the family's week (default 'mon' = the original Monday weeks)
    trips: TripSetting[]            // shopping trips; empty = one weekly trip (the original setup)
    pantryFirstTrip: boolean        // later trips mark pantry items bought on the first trip as "have it"
    autoPlan: boolean               // create next week's menu automatically
    planDay: Weekday
    planTime: string                // 'HH:MM' local
    reminders: {
      planReady: Channel
      shopBy: { channel: Channel; day: Weekday; time: string }
      cookTonight: { channel: Channel; time: string }
    }
  }
  texting: {
    enabled: boolean
    voteDay: Weekday                // when the week's dinners are texted for votes
    againDay: Weekday               // "which should come back?" text
    quietStart: string              // 'HH:MM'
    quietEnd: string
    weeklyCap: number               // max texts per member per week
    ownerPhone: string              // where "everyone's voted" + reminders for the planner go (E.164)
    leaderTitle: string             // what the family calls the person in charge ("Mom", "Head Chef"); blank = first name
    reviewFirst: boolean            // the vote waits for the person in charge to review (drop / swap / add) before it goes out
    reviewHours: number             // …and goes out on its own this many hours later if they don't
    plainTextIds: string[]          // members whose phones can't get picture texts: their vote comes as plain text
    askDinner: boolean              // 7 PM "what was dinner tonight?" text to the planner on nights with no planned dinner; the answer is saved as a family recipe
    walmartLinks: 'list' | 'cart'   // a texted Walmart link: put it on the grocery list, or text the planner a one-tap Walmart-cart link
    optionsToText: number           // dinner ideas texted for the family to pick from (>= dinnersPerWeek)
    lastCall: {
      message: string               // template: {name} {store} {minutes}
      minutes: number               // how long the family has to reply (10–60)
    }
  }
  stores: {
    krogerLocationId?: string        // the family's Kroger-family store (for prices, stock, matches)
    krogerLocationName?: string
    mode: 'instacart' | 'kroger' | 'instore'
    fulfillment: 'delivery' | 'pickup'
    usualStore: string
    priceFactor: number             // what this family's store (+ Instacart fees) charges vs our typical-price estimates; learned from real orders
    myStores: Array<{ name: string; factor?: number }>   // the stores they compare (Wegmans, Tops, Aldi…), each with its own learned factor
    takeoutPerServing: number       // what a takeout/delivery dinner costs this family per person — the "you saved" comparison
  }
  notifications: {
    email: boolean
    sms: boolean
  }
  tastes: {
    hidden: Record<string, string[]>  // learned-taste chips the family removed, per household member id
  }
  health: Record<string, import('@/lib/member-needs').MemberNeed>  // per household member id: carbs at every meal / a daily carb limit (lib/member-needs)
}

export const DEFAULT_SETTINGS: Settings = {
  plan: {
    dinnersPerWeek: 5,
    optionsCount: 10,
    leftoverNight: false,
    includeLunches: false,
    includeBreakfasts: false,
    cookDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    weekdayCookTimes: {},
    maxLongCookNights: 1,
    sundayDinner: { on: false, minutes: 120, times: [120], options: 3, extraForMonday: true },
  },
  food: {
    style: null,
    styles: [],
    cuisines: [],
    avoidProteins: [],
    neverIngredients: [],
    spice: 'medium',
    equipment: [],
    kidFriendly: false,
    nutritionInfo: true,
    maxCalories: 0,
    useSales: true,
    mix: null,
    mixEvery: {},
    familyRecipesPerWeek: 1,
    productPrefs: [],
    storeBrands: false,
  },
  deals: {
    stockUp: true,
    weeklyText: false,
  },
  schedule: {
    weekStart: 'mon',
    trips: [],
    pantryFirstTrip: true,
    // On by default (2026-10-26): active families get next week planned and emailed on Sunday.
    autoPlan: true,
    planDay: 'sat',
    planTime: '08:00',
    reminders: {
      planReady: 'email',
      shopBy: { channel: 'off', day: 'sun', time: '17:00' },
      cookTonight: { channel: 'off', time: '15:30' },
    },
  },
  texting: {
    enabled: false,
    voteDay: 'sun',
    againDay: 'thu',
    quietStart: '21:00',
    quietEnd: '07:00',
    weeklyCap: 4,
    ownerPhone: '',
    askDinner: false,
    plainTextIds: [],
    leaderTitle: '',
    reviewFirst: false,
    reviewHours: 3,
    walmartLinks: 'list',
    optionsToText: 8,
    lastCall: {
      message: '{name} is ordering groceries from {store} in {minutes} min. Need anything? Reply ADD + the item (e.g. ADD granola bars), or send a photo of it.',
      minutes: 20,
    },
  },
  stores: {
    mode: 'instacart',
    fulfillment: 'delivery',
    usualStore: '',
    priceFactor: 1,
    myStores: [],
    takeoutPerServing: 15,
  },
  notifications: {
    email: true,
    sms: false,
  },
  tastes: {
    hidden: {},
  },
  health: {},
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isObj(patch)) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch)) {
    const b = (base as Record<string, unknown>)[k]
    if (isObj(b) && isObj(v)) out[k] = deepMerge(b, v)
    else if (v !== undefined) out[k] = v
  }
  return out as T
}

/** Full settings from whatever is stored (null, {}, partial, or stale). */
export function mergeSettings(stored: unknown): Settings {
  // A fresh copy every time: the merge shares untouched nested objects with DEFAULT_SETTINGS, so a caller that
  // edits the result (s.plan.cookDays = …) would otherwise change the defaults for every family (Nov 7 2026).
  const out = structuredClone(deepMerge(DEFAULT_SETTINGS, stored as DeepPartial<Settings>))
  // Sunday dinner saved before "times" existed: its one length is the list.
  const sd = (stored as { plan?: { sundayDinner?: { times?: unknown } } } | null)?.plan?.sundayDinner
  if (sd && !Array.isArray(sd.times)) out.plan.sundayDinner.times = [out.plan.sundayDinner.minutes]
  return out
}

export const CUISINE_OPTIONS = ['American', 'Mexican', 'Italian', 'Asian', 'Mediterranean', 'Indian', 'Southern', 'Tex-Mex', 'Middle Eastern']
export const PROTEIN_OPTIONS = ['chicken', 'beef', 'pork', 'turkey', 'shrimp', 'salmon', 'fish', 'tofu', 'beans', 'eggs']
export const EQUIPMENT_OPTIONS = ['air fryer', 'instant pot', 'slow cooker', 'sheet pan', 'grill', 'wok']
export const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Low-carb', 'Keto', 'Paleo', 'Low-sodium', 'Diabetic-friendly', 'Heart-healthy', 'Halal', 'Kosher-style']
export const AGE_BANDS = [
  { value: 'toddler', label: 'Toddler (1–3)' },
  { value: 'kid', label: 'Kid (4–8)' },
  { value: 'tween', label: 'Tween (9–12)' },
  { value: 'teen', label: 'Teen (13–17)' },
  { value: 'adult', label: 'Adult' },
]

/** Max cook time for a given weekday, honoring per-night overrides. */
export function cookTimeFor(day: Weekday, settings: Settings, fallback: number): number {
  const v = settings.plan.weekdayCookTimes[day]
  return typeof v === 'number' && v > 0 ? v : fallback
}

/** The trip setup the planner, list and texting read (defaults reproduce the original Monday week, one trip). */
export function tripsConfig(s: Settings): import('@/lib/trips').TripsConfig {
  return { weekStart: s.schedule.weekStart, trips: s.schedule.trips ?? [], cookDays: s.plan.cookDays, shopDay: s.schedule.reminders.shopBy.day }
}

/**
 * Sunday family dinner on/off, kept in step with the cook nights the planner already reads:
 * on → Sunday is a cook night with its own (longer) time; off → Sunday comes back out.
 */
export function setSundayDinner(s: Settings, on: boolean, times?: number[], extraForMonday?: boolean): void {
  const prev = s.plan.sundayDinner.times?.length ? s.plan.sundayDinner.times : [s.plan.sundayDinner.minutes || 120]
  const t = Array.from(new Set((times ?? prev).map((n) => Math.min(Math.max(Number(n) || 120, 45), 300)))).sort((a, b) => a - b)
  const list = t.length ? t : [120]
  const mins = Math.max(...list)
  const wasOn = s.plan.sundayDinner.on
  s.plan.sundayDinner = { on, minutes: mins, times: list, options: s.plan.sundayDinner.options || 3, extraForMonday: extraForMonday ?? s.plan.sundayDinner.extraForMonday }
  if (on) {
    if (!s.plan.cookDays.includes('sun')) { s.plan.cookDays = [...s.plan.cookDays, 'sun']; if (!wasOn) s.plan.dinnersPerWeek = Math.min(7, s.plan.dinnersPerWeek + 1) }
    s.plan.weekdayCookTimes.sun = mins
  } else if (wasOn) {
    if (s.plan.cookDays.includes('sun')) { s.plan.cookDays = s.plan.cookDays.filter((d) => d !== 'sun'); s.plan.dinnersPerWeek = Math.max(3, s.plan.dinnersPerWeek - 1) }
    delete s.plan.weekdayCookTimes.sun
  }
}

/** How many Sunday dinner ideas the family is sent (2–5); 0 when Sunday dinner is off. */
export const sundayOptions = (s: Settings) => (s.plan.sundayDinner?.on ? Math.min(Math.max(Number(s.plan.sundayDinner.options) || 3, 2), 5) : 0)

/** Sunday-dinner option = one the planner marked for Sunday. */
export const isSundayDinner = (m: { suggestedNight?: string | null }) => /^sun/i.test(String(m.suggestedNight ?? ''))

/**
 * The voted week keeps exactly one Sunday dinner when the family has Sunday dinner on: the top-voted Sunday
 * idea goes in even if it ranked below the cut, and a second Sunday idea gives its spot to the next best
 * weeknight dinner. `chosen` and `ranked` are in vote order; `meal` reads the dinner from an item.
 */
export function keepOneSunday<T>(chosen: T[], ranked: T[], meal: (t: T) => { suggestedNight?: string | null }, on: boolean): T[] {
  if (!on) return chosen
  const out = [...chosen]
  const suns = out.filter((t) => isSundayDinner(meal(t)))
  if (!suns.length) {
    const best = ranked.find((t) => isSundayDinner(meal(t)))
    const lastWeek = [...out].reverse().findIndex((t) => !isSundayDinner(meal(t)))
    if (best && lastWeek >= 0) out[out.length - 1 - lastWeek] = best
  } else if (suns.length > 1) {
    for (const extra of suns.slice(1)) {
      const sub = ranked.find((t) => !out.includes(t) && !isSundayDinner(meal(t)))
      const idx = out.indexOf(extra)
      if (sub && idx >= 0) out[idx] = sub
    }
  }
  return out
}
