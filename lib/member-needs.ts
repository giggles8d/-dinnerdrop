import type { Meal, Ingredient } from '@/types'

/**
 * Health-driven dinner needs, per household member (Sarah, Nov 3 2026: a family texted that one person
 * needs carbs at every meal — pancreatitis — while another is limited to 100 g of carbs a day on her
 * medicine; the bot had saved "you like carbs").
 *
 * Stored on the planner's settings (`settings.health[memberId]`), so no schema change. The planner keeps
 * the household's shared main dish and fits each person on the plate:
 *  - carbs 'every_meal' → a separate starch side (gluten-free and mild when the household needs that)
 *    for every dinner whose main has no starch, with a note saying who it's for;
 *  - carbsPerDay → a note with the carbs in that person's portion of the main and the side.
 * DinnerDrop never gives medical advice: numbers are estimates from the recipe, and copy says so.
 */
export interface MemberNeed {
  carbs?: 'every_meal' | 'limit'
  carbsPerDay?: number   // grams, when the person stated a daily limit
  notes?: string[]       // their own words, short ("no lemon — stomach", "mild only")
  updatedAt?: string
}
export type HealthNeeds = Record<string, MemberNeed>

export interface NeedPerson { id: string; name: string }

const STARCH = /\b(rice|pasta|spaghetti|penne|noodles?|tortillas?|potato(es)?|fries|bread|buns?|rolls?|naan|pita|couscous|quinoa|polenta|grits|gnocchi|lasagna|pizza|sandwich|wraps?|tacos?|burrito|quesadilla|tots|orzo|macaroni)\b/
const SWAPPED_STARCH = /\b(cauliflower rice|zucchini noodles|zoodles|lettuce (wraps?|cups?)|low[- ]carb tortillas?|keto)\b/

/** Does the main itself bring real starch (cauliflower rice and lettuce wraps don't count)? */
export function mainHasStarch(meal: Pick<Meal, 'name' | 'ingredients'>): boolean {
  const names = (meal.ingredients ?? []).map((i) => i.name.toLowerCase()).filter((n) => !SWAPPED_STARCH.test(n))
  const hay = `${SWAPPED_STARCH.test(meal.name.toLowerCase()) ? '' : meal.name.toLowerCase()} ${names.join(' | ')}`
  return STARCH.test(hay)
}

interface StarchSide { name: string; minutes: number; carbsPerServing: number; items: Ingredient[] }

// Plain, mild starches that suit a sensitive stomach and are naturally gluten-free (except the rolls).
const STARCHES: Record<string, StarchSide> = {
  rice: { name: 'Plain white rice', minutes: 20, carbsPerServing: 45, items: [{ name: 'Long grain white rice', quantity: '1', unit: 'cup', category: 'Pantry & Dry Goods' }] },
  mash: { name: 'Mashed potatoes', minutes: 20, carbsPerServing: 35, items: [{ name: 'Yukon gold potatoes', quantity: '1.5', unit: 'lb', category: 'Produce' }] },
  roastPotatoes: { name: 'Roasted potatoes', minutes: 30, carbsPerServing: 30, items: [{ name: 'Baby potatoes', quantity: '1.5', unit: 'lb', category: 'Produce' }] },
  rolls: { name: 'Dinner rolls', minutes: 5, carbsPerServing: 26, items: [{ name: 'Dinner rolls', quantity: '1', unit: 'package', category: 'Bakery' }] },
  gfRolls: { name: 'Gluten-free dinner rolls', minutes: 5, carbsPerServing: 28, items: [{ name: 'Gluten-free dinner rolls', quantity: '1', unit: 'package', category: 'Bakery' }] },
}

/** The starch side that fits this dinner: rice with stir-fries and curries, potatoes with steak and bakes. */
export function starchFor(meal: Pick<Meal, 'name' | 'ingredients' | 'cuisine'>, opts: { glutenFree: boolean }, i = 0): StarchSide {
  const h = `${meal.name} ${meal.cuisine ?? ''}`.toLowerCase()
  if (/\b(asian|thai|teriyaki|stir[- ]fry|hibachi|curry|shawarma|mexican|taco|fajita|burrito|bowl|shrimp|indian)\b/.test(h)) return STARCHES.rice
  if (/\b(steak|meatloaf|pot roast|pork chop|chicken thigh|roast|bake|skillet)\b/.test(h)) return i % 2 ? STARCHES.roastPotatoes : STARCHES.mash
  if (/\b(salad|soup|chili|stew)\b/.test(h)) return opts.glutenFree ? STARCHES.gfRolls : STARCHES.rolls
  return [STARCHES.rice, STARCHES.mash, STARCHES.roastPotatoes][i % 3]
}

/** People with a need, matched to the household's members (drops needs for people no longer in the household). */
export function activeNeeds(needs: HealthNeeds | undefined | null, people: NeedPerson[]): Array<NeedPerson & MemberNeed> {
  if (!needs) return []
  return people.filter((p) => needs[p.id] && (needs[p.id].carbs || needs[p.id].notes?.length)).map((p) => ({ ...p, ...needs[p.id] }))
}

const first = (name: string) => name.trim().split(/\s+/)[0] || name

/**
 * Fit every dinner to the people with needs. Keeps the main as planned; adds a starch side (for
 * 'every_meal' people) and short plate notes. Returns new meal objects; meals without anyone to fit are unchanged.
 */
export function applyNeeds(meals: Meal[], people: Array<NeedPerson & MemberNeed>, opts: { glutenFree: boolean }): Meal[] {
  const carbEveryMeal = people.filter((p) => p.carbs === 'every_meal')
  const limited = people.filter((p) => p.carbs === 'limit' || (p.carbsPerDay ?? 0) > 0)
  if (!carbEveryMeal.length && !limited.length) return meals
  return meals.map((meal, i) => {
    const notes: string[] = []
    let side = meal.side
    const hasStarch = mainHasStarch(meal)
    let sideCarbs: number | null = null
    if (carbEveryMeal.length && !hasStarch) {
      const s = starchFor(meal, opts, i)
      side = { name: s.name, minutes: s.minutes, items: s.items, for: carbEveryMeal.map((p) => first(p.name)) }
      sideCarbs = s.carbsPerServing
      notes.push(`${carbEveryMeal.map((p) => first(p.name)).join(' and ')}: add the ${s.name.toLowerCase()} (about ${s.carbsPerServing} g carbs a serving).`)
    } else if (carbEveryMeal.length && hasStarch) {
      notes.push(`${carbEveryMeal.map((p) => first(p.name)).join(' and ')}: this one already has a starch — take a full portion.`)
    }
    const mainCarbs = meal.nutrition?.carbs
    for (const p of limited) {
      const limit = p.carbsPerDay ? ` (daily limit ${p.carbsPerDay} g)` : ''
      const mainPart = mainCarbs != null ? `the main is about ${mainCarbs} g carbs a serving` : `carbs for the main aren't known yet`
      const sidePart = sideCarbs != null ? `; skip the side or take a small scoop` : ''
      notes.push(`${first(p.name)}: ${mainPart}${sidePart}${limit}.`)
    }
    return { ...meal, side, plateNotes: notes.length ? notes : meal.plateNotes }
  })
}

/** Lines for the AI planner prompt (when the library can't cover the week). */
export function needsPromptLines(people: Array<NeedPerson & MemberNeed>): string[] {
  return people.map((p) => {
    const bits: string[] = []
    if (p.carbs === 'every_meal') bits.push('needs a real starch (rice, potatoes, bread) at every dinner — if the main is low-carb, give a plain starch side for them')
    if (p.carbs === 'limit' || p.carbsPerDay) bits.push(`keeps carbs low${p.carbsPerDay ? ` (about ${p.carbsPerDay} g a day total)` : ''} — keep starch on the side so they can skip it`)
    if (p.notes?.length) bits.push(p.notes.join('; '))
    return `- ${p.name}: ${bits.join('; ')}`
  })
}

/** The confirmation the bot texts back (never medical advice). */
export function needsConfirmation(saved: Array<{ name: string; need: MemberNeed }>, isSelf: (name: string) => boolean): string {
  const parts = saved.map(({ name, need }) => {
    const who = isSelf(name) ? 'you' : first(name)
    const bits: string[] = []
    if (need.carbs === 'every_meal') bits.push(`a starch with every dinner (we'll add rice or potatoes on the side when the main is low-carb)`)
    if (need.carbs === 'limit' || need.carbsPerDay) bits.push(`about ${need.carbsPerDay ? `${need.carbsPerDay} g of ` : 'low '}carbs a day (each dinner will show the carbs in ${who === 'you' ? 'your' : 'their'} portion, starch on the side)`)
    if (need.notes?.length) bits.push(need.notes.join(', '))
    return `${who === 'you' ? 'for you' : `for ${who}`}: ${bits.join('; ')}`
  })
  return `Saved ${parts.join(' · ')}. The planner will build around this from the next plan. Carb counts are estimates from the recipes — please follow your doctor's guidance; DinnerDrop can't give medical advice.`
}
