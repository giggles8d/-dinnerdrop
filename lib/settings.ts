/**
 * Typed shape of profiles.settings (jsonb) — the Settings screen's bag.
 * Everything has a default so old profiles ({}), partial saves, and new fields
 * all resolve to a complete object via mergeSettings().
 */

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
  }
  food: {
    cuisines: string[]              // preferred cuisines (empty = mixed)
    avoidProteins: string[]
    neverIngredients: string[]      // hard exclusions (beyond dietary needs)
    spice: 'mild' | 'medium' | 'hot'
    equipment: string[]             // 'air fryer' | 'instant pot' | 'slow cooker' | 'sheet pan' | 'grill'
    kidFriendly: boolean            // one safe thing on every plate
    nutritionInfo: boolean          // show calories/protein per serving
  }
  schedule: {
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
    optionsToText: number           // dinner ideas texted for the family to pick from (>= dinnersPerWeek)
  }
  stores: {
    mode: 'instacart' | 'kroger' | 'instore'
    fulfillment: 'delivery' | 'pickup'
    usualStore: string
  }
  notifications: {
    email: boolean
    sms: boolean
  }
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
  },
  food: {
    cuisines: [],
    avoidProteins: [],
    neverIngredients: [],
    spice: 'medium',
    equipment: [],
    kidFriendly: false,
    nutritionInfo: true,
  },
  schedule: {
    autoPlan: false,
    planDay: 'sun',
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
    optionsToText: 8,
  },
  stores: {
    mode: 'instacart',
    fulfillment: 'delivery',
    usualStore: '',
  },
  notifications: {
    email: true,
    sms: false,
  },
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
  return deepMerge(DEFAULT_SETTINGS, stored as DeepPartial<Settings>)
}

export const CUISINE_OPTIONS = ['American', 'Mexican', 'Italian', 'Asian', 'Mediterranean', 'Indian', 'Southern', 'Tex-Mex', 'Middle Eastern']
export const PROTEIN_OPTIONS = ['chicken', 'beef', 'pork', 'turkey', 'shrimp', 'salmon', 'fish', 'tofu', 'beans', 'eggs']
export const EQUIPMENT_OPTIONS = ['air fryer', 'instant pot', 'slow cooker', 'sheet pan', 'grill', 'wok']
export const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Keto', 'Halal', 'Kosher', 'Pescatarian', 'Low-sodium']
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
