import type { Settings } from '@/lib/settings'

/**
 * Food styles — a one-tap way to say what kind of week you want (like eMeals' 15 menus), mapped onto the
 * settings and diet tags DinnerDrop already plans with. A style is a preset, not a separate menu: picking one
 * sets diets / time / calories / equipment / kid mode, and the family can still change any of those.
 */
export interface FoodStyle {
  key: string
  name: string
  blurb: string
  emoji: string
  /** Diets to require (library tag + planner rule). */
  diets?: string[]
  /** Per-serving calorie cap. */
  maxCalories?: number
  /** Max minutes to the table. */
  maxCookTime?: number
  /** Settings patch. */
  food?: Partial<Settings['food']>
  plan?: Partial<Settings['plan']>
  /** Cuisines to lean on. */
  cuisines?: string[]
  /** Budget per week (string the profile stores). */
  weeklyBudget?: string
  /** Prompt line for the planner. */
  rule?: string
}

export const FOOD_STYLES: FoodStyle[] = [
  { key: 'family', name: 'Family favorites', emoji: '🍝', blurb: 'Crowd-pleasers kids eat — tacos, pasta, sheet-pan chicken.', food: { kidFriendly: true }, rule: 'Familiar, kid-approved dinners; keep components separate where it helps picky eaters.' },
  { key: 'quick', name: '30-minute', emoji: '⏱️', blurb: 'On the table in 30 minutes or less, every night.', maxCookTime: 30 },
  { key: 'budget', name: 'Budget', emoji: '💵', blurb: 'Under $3 a serving — beans, eggs, ground meat, seasonal produce.', weeklyBudget: '$75', rule: 'Keep every dinner under $3 per serving at typical prices; lean on beans, eggs, ground meat, rice, pasta and seasonal produce.' },
  { key: 'healthy', name: 'Quick & healthy', emoji: '🥗', blurb: 'Lean proteins, lots of vegetables, under 600 calories.', maxCalories: 600, maxCookTime: 35, rule: 'Lean proteins, at least two vegetables per dinner, whole grains over refined, light on cheese and cream.' },
  { key: 'lowcarb', name: 'Low-carb', emoji: '🥑', blurb: 'No pasta, rice, bread or potatoes; vegetables carry the plate.', diets: ['Low-carb'] },
  { key: 'keto', name: 'Keto', emoji: '🥓', blurb: 'Very low carb, higher fat.', diets: ['Keto'] },
  { key: 'mediterranean', name: 'Mediterranean', emoji: '🫒', blurb: 'Olive oil, fish, beans, greens, herbs.', cuisines: ['Mediterranean'], rule: 'Mediterranean pattern: olive oil, fish or legumes most nights, vegetables, whole grains, herbs and lemon; red meat at most once.' },
  { key: 'plant', name: 'Plant-based', emoji: '🌱', blurb: 'Vegetarian, with vegan options.', diets: ['Vegetarian'] },
  { key: 'glutenfree', name: 'Gluten-free', emoji: '🌾', blurb: 'No wheat, barley or rye; compliant swaps named.', diets: ['Gluten-free'] },
  { key: 'diabetic', name: 'Diabetic-friendly', emoji: '🩺', blurb: 'Lower carb and sugar, steady portions, more fiber.', diets: ['Diabetic-friendly'], maxCalories: 600, rule: 'Diabetic-friendly: no added sugar or sweet sauces, carbs from vegetables, beans and whole grains in modest portions (no more than 45 g carbs per serving), fiber-rich, lean protein.' },
  { key: 'heart', name: 'Heart-healthy', emoji: '❤️', blurb: 'Lower sodium and saturated fat; fish, poultry, beans.', diets: ['Heart-healthy'], rule: 'Heart-healthy: under 600 mg sodium and under 6 g saturated fat per serving; no bacon, sausage, deli meat or salty sauces; fish, poultry, beans, olive oil, vegetables.' },
  { key: 'slowcooker', name: 'Slow cooker & Instant Pot', emoji: '🍲', blurb: 'Set it in the morning, dinner is done.', food: { equipment: ['slow cooker', 'instant pot'] }, plan: { maxLongCookNights: 4 }, rule: 'At least 3 of the dinners use a slow cooker or Instant Pot (hands-off), the rest are quick.' },
  { key: 'paleo', name: 'Paleo', emoji: '🥩', blurb: 'Meat, fish, eggs, vegetables, fruit, nuts. No grains, dairy or legumes.', diets: ['Paleo'] },
]

export const styleByKey = (key: string | null | undefined) => FOOD_STYLES.find((s) => s.key === key) ?? null
