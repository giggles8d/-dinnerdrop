import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { createClient } from '@supabase/supabase-js'
import { mergeSettings, cookTimeFor, WEEKDAY_LABEL, type Settings, type Weekday } from '@/lib/settings'
import { upsertRecipes, pickLibraryRecipes, recipeToMeal, normalizeName } from '@/lib/recipe-library'
import type { Meal } from '@/types'

// Extend serverless timeout — AI generation needs up to 55s
export const maxDuration = 60

interface GeneratePlanResponse {
  meals: Meal[]
  totalEstimatedCost: number
}

interface MemberRow {
  name: string
  role: 'adult' | 'kid'
  age_band: string | null
  likes: string[]
  dislikes: string[]
  allergies: string[]
  safe_foods: string[]
}

function list(a: string[] | null | undefined): string {
  return (a ?? []).filter(Boolean).join(', ')
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  try {
    const body = await request.json()

    if (!body.userId || typeof body.userId !== 'string') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs, settings, household_id')
      .eq('id', body.userId)
      .single()

    if (!profileRow) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings: Settings = mergeSettings(profileRow.settings)
    const mode: 'fresh' | 'favorites' = body.mode === 'favorites' ? 'favorites' : 'fresh'

    const profile = {
      userId: body.userId as string,
      familySize: Number(body.familySize) > 0 ? Number(body.familySize) : (profileRow.family_size || 4),
      weeklyBudget: body.weeklyBudget || profileRow.weekly_budget || '$100',
      maxCookTime: Number(body.maxCookTime) > 0 ? Number(body.maxCookTime) : (profileRow.max_cook_time || 30),
      cuisinePreference: body.cuisinePreference || profileRow.cuisine_preference || 'mixed',
      dietaryNeeds: Array.isArray(body.dietaryNeeds) ? body.dietaryNeeds as string[] : (profileRow.dietary_needs || []),
      favoriteMeals: Array.isArray(body.favoriteMeals) ? body.favoriteMeals as Meal[] : [],
    }

    // ---------- household members: per-person likes / won't-eats / allergies / safe foods ----------
    let members: MemberRow[] = []
    if (profileRow.household_id) {
      const { data } = await supabase
        .from('household_members')
        .select('name, role, age_band, likes, dislikes, allergies, safe_foods')
        .eq('household_id', profileRow.household_id)
      members = (data as MemberRow[]) ?? []
    }
    const allAllergies = Array.from(new Set(members.flatMap((m) => m.allergies ?? [])))
    const allDislikes = Array.from(new Set(members.flatMap((m) => m.dislikes ?? [])))
    const kidSafeFoods = members.filter((m) => m.role === 'kid').flatMap((m) => m.safe_foods ?? [])
    const hasKids = members.some((m) => m.role === 'kid') || settings.food.kidFriendly
    const hardExclusions = Array.from(new Set([...allAllergies, ...settings.food.neverIngredients, ...settings.food.avoidProteins]))

    // ---------- plan shape ----------
    const cookDays = settings.plan.cookDays.length ? settings.plan.cookDays : (['mon', 'tue', 'wed', 'thu', 'fri'] as Weekday[])
    const dinnersPerWeek = Math.min(Math.max(settings.plan.dinnersPerWeek, 3), 7)
    const optionsCount = Math.min(Math.max(settings.plan.optionsCount, dinnersPerWeek, 5), 12)
    const nightTimes = cookDays.map((d) => ({ day: d, label: WEEKDAY_LABEL[d], minutes: cookTimeFor(d, settings, profile.maxCookTime) }))
    const fastestNight = Math.min(...nightTimes.map((n) => n.minutes))
    const slowestNight = Math.max(...nightTimes.map((n) => n.minutes))
    const budgetNumber = Number(String(profile.weeklyBudget).replace(/[^0-9.]/g, '')) || 100
    const perMealBudget = (budgetNumber / dinnersPerWeek).toFixed(0)

    // ---------- taste profile (learned) + recent plans, fetched together ----------
    const [{ data: tasteProfile }, { data: recentPlans }] = await Promise.all([
      supabase.from('taste_profiles').select('*').eq('user_id', profile.userId).single(),
      supabase.from('meal_plans').select('meals').eq('user_id', profile.userId).order('created_at', { ascending: false }).limit(3),
    ])
    let tasteProfileSection = ''

    if (tasteProfile && tasteProfile.total_signals >= 3) {
      const cuisineScores: Record<string, number> = tasteProfile.cuisine_scores ?? {}
      const sorted = Object.entries(cuisineScores).sort((a, b) => (b[1] as number) - (a[1] as number))
      const preferred = sorted.filter(([, s]) => (s as number) > 0).map(([c]) => c)
      const avoided = sorted.filter(([, s]) => (s as number) < -1).map(([c]) => c)
      const avoidedProteins: string[] = tasteProfile.avoided_proteins ?? []
      const lines: string[] = []
      if (preferred.length) lines.push(`Preferred cuisines: ${preferred.join(', ')}`)
      if (avoided.length) lines.push(`Cuisines to avoid: ${avoided.join(', ')}`)
      if (avoidedProteins.length) lines.push(`Avoided proteins: ${avoidedProteins.join(', ')}`)
      if (lines.length) tasteProfileSection = `\nLearned from this family's past choices:\n${lines.join('\n')}\n`
    }

    // ---------- recent plans: don't repeat ----------
    const recentNames = Array.from(new Set(
      (recentPlans ?? []).flatMap((p) => ((p.meals as Meal[]) ?? []).map((m) => m.name)).filter(Boolean)
    ))

    // ---------- library picks: proven dinners that fit, no generation needed ----------
    let libraryMeals: Meal[] = []
    if (mode === 'fresh' && optionsCount >= 8) {
      try {
        const picks = await pickLibraryRecipes(supabase, {
          limit: 2,
          maxCookTime: slowestNight,
          dietary: profile.dietaryNeeds,
          excludeWords: [...hardExclusions, ...allDislikes],
          excludeNames: [...recentNames, ...profile.favoriteMeals.map((m) => m.name)],
          cuisines: settings.food.cuisines,
        })
        libraryMeals = picks.map((r, i) => recipeToMeal(r, `L${i + 1}`, profile.familySize))
      } catch (e) {
        console.error('library picks failed', e)
      }
    }
    const generateCount = Math.max(optionsCount - libraryMeals.length, 3)

    // ---------- favorites ----------
    let favoritesSection = ''
    if (mode === 'favorites' && profile.favoriteMeals.length > 0) {
      favoritesSection = `
PLAN FROM FAVORITES MODE. The family's saved favorites are: ${profile.favoriteMeals.map((m) => m.name).join(', ')}.
Build the ${generateCount} options primarily from these favorites (use them as named; adjust servings and quantities for ${profile.familySize}). If there are fewer favorites than options, fill the rest with new dinners in the same spirit.
`
    } else if (profile.favoriteMeals.length > 0) {
      favoritesSection = `
The family has these saved favorites: ${profile.favoriteMeals.map((m) => m.name).join(', ')}
Include 1–2 of them (exactly as named; adjust servings to ${profile.familySize}). Fill the remaining slots with new dinners.
`
    }

    // ---------- people ----------
    let peopleSection = ''
    if (members.length) {
      const lines = members.map((m) => {
        const bits: string[] = []
        if (m.likes?.length) bits.push(`loves ${list(m.likes)}`)
        if (m.dislikes?.length) bits.push(`won't eat ${list(m.dislikes)}`)
        if (m.allergies?.length) bits.push(`ALLERGIC to ${list(m.allergies)}`)
        if (m.safe_foods?.length) bits.push(`safe foods: ${list(m.safe_foods)}`)
        const who = `${m.name} (${m.role}${m.age_band && m.age_band !== 'adult' ? `, ${m.age_band}` : ''})`
        return `- ${who}${bits.length ? ': ' + bits.join('; ') : ''}`
      })
      peopleSection = `\nWho's eating:\n${lines.join('\n')}\n`
      if (kidSafeFoods.length) {
        peopleSection += `RULE: every dinner must include, as a component or simple side, at least one of the kids' safe foods (${list(kidSafeFoods)}) OR be built from ingredients a picky kid already eats. Say which in the "kidNote" field.\n`
      }
    }

    // ---------- constraints ----------
    const constraintLines: string[] = []
    if (profile.dietaryNeeds.length) constraintLines.push(`STRICT dietary requirements, every dinner complies: ${profile.dietaryNeeds.join(', ')}.`)
    if (hardExclusions.length) constraintLines.push(`NEVER use these ingredients (allergies and hard no's): ${hardExclusions.join(', ')}.`)
    if (allDislikes.length) constraintLines.push(`Avoid or make optional/on-the-side: ${allDislikes.join(', ')}.`)
    if (settings.food.cuisines.length) constraintLines.push(`Cuisines this family likes: ${settings.food.cuisines.join(', ')} (lean on these; one or two outside is fine).`)
    else if (profile.cuisinePreference && profile.cuisinePreference !== 'mixed') constraintLines.push(`Cuisine preference: ${profile.cuisinePreference}.`)
    constraintLines.push(`Spice level: ${settings.food.spice}${settings.food.spice === 'mild' ? ' (kids at the table; heat goes on the side)' : ''}.`)
    if (settings.food.equipment.length) constraintLines.push(`Equipment to lean on: ${settings.food.equipment.join(', ')}. At least a third of the options should use one of these.`)
    if (hasKids) constraintLines.push(`Kid-friendly by default: familiar flavors, components kept separate where possible, nothing "mixed" that a kid can't pick apart.`)
    if (settings.plan.leftoverNight) constraintLines.push(`Mark at least 2 options "leftoverFriendly": true — dinners that double well and reheat well (for the family's leftover night). Their servings should be ${profile.familySize * 2}.`)
    if (recentNames.length) constraintLines.push(`Do not repeat these recent dinners: ${recentNames.slice(0, 20).join(', ')}.`)

    const nightLines = nightTimes.map((n) => `- ${n.label}: ${n.minutes} min`).join('\n')
    const timeRule = fastestNight === slowestNight
      ? `- Every dinner must be completable in ${slowestNight} minutes or less, prep included.`
      : `- Cook nights and the time available each night:\n${nightLines}\n- At least ${Math.max(2, Math.ceil(generateCount / 3))} options must take ${fastestNight} minutes or less (for the fastest nights). No option may exceed ${slowestNight} minutes. Set "suggestedNight" to the night each dinner fits best.`

    const nutritionField = settings.food.nutritionInfo

    const prompt = `You are the meal planner for DinnerDrop. Generate exactly ${generateCount} diverse weeknight dinner options for one family to choose ${dinnersPerWeek} from.

Family:
- ${profile.familySize} people at dinner
- Weekly dinner budget: ${profile.weeklyBudget} (about $${perMealBudget} per dinner)
- Default cook time: ${profile.maxCookTime} minutes
- Dietary needs: ${profile.dietaryNeeds.length ? profile.dietaryNeeds.join(', ') : 'none'}
${peopleSection}${favoritesSection}${tasteProfileSection}
Rules:
${constraintLines.map((l) => `- ${l}`).join('\n')}
${timeRule}
- estimatedCost is the realistic grocery cost of the ingredients at typical US supermarket prices (most weeknight dinners for ${profile.familySize} run $12–$30); do not inflate it. The ${dinnersPerWeek} dinners they pick must fit in ${profile.weeklyBudget}, so keep every option under $${perMealBudget}
- Make the options diverse — different proteins, cuisines, and cooking styles; no two options share a main protein + style
- Maximum 6 ingredients per dinner, maximum 4 short steps (one sentence each), written for a tired parent
- Ingredient quantities must be shoppable (what you'd buy: "1" "lb", "2" "cans", "1" "bunch"), with a "searchTerm" that matches a grocery product name
- Give each dinner 1–3 short tags from: quick, sheet-pan, one-pot, air-fryer, slow-cooker, instant-pot, grill, kid-favorite, leftover-friendly, budget, high-protein, vegetarian, 15-min
${settings.food.nutritionInfo ? '- Estimate nutrition per serving (calories, grams of protein)' : ''}

Return ONLY valid JSON with this exact structure, no markdown:
{
  "meals": [
    {
      "day": "1",
      "name": "string",
      "cuisine": "Italian",
      "protein": "chicken",
      "cookTime": 25,
      "prepTime": 10,
      "servings": ${profile.familySize},
      "estimatedCost": 18.50,
      "tags": ["quick", "kid-favorite"],
      "suggestedNight": "Tuesday",
      "leftoverFriendly": false,${kidSafeFoods.length ? '\n      "kidNote": "plain rice on the side for Max",' : ''}${nutritionField ? '\n      "nutrition": { "calories": 520, "protein": 34 },' : ''}
      "ingredients": [
        { "name": "string", "quantity": "1 1/2", "unit": "lb", "category": "Meat & Seafood", "searchTerm": "chicken breast" }
      ],
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ],
  "totalEstimatedCost": 87.50
}

Categories must be one of: Produce, Meat & Seafood, Dairy & Eggs, Pantry & Dry Goods, Frozen, Bakery, Beverages.
Use "day" values "1" through "${generateCount}" as unique identifiers.`

    const text = await generateWithClaude(prompt, 7000)
    let planData: GeneratePlanResponse
    try {
      planData = parseClaudeJSON<GeneratePlanResponse>(text)
    } catch {
      console.error('Failed to parse Claude response:', text.slice(0, 200))
      return Response.json({ error: 'AI returned an unexpected format. Please try again.' }, { status: 500 })
    }

    // Safety net on hard exclusions (allergies / never list): drop any option that slipped through.
    const excl = hardExclusions.map((w) => w.toLowerCase())
    let generated = (planData.meals ?? []).filter((m) => {
      const hay = `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase()
      return !excl.some((w) => w && hay.includes(w))
    })
    // De-dupe against library picks by name.
    const libNames = new Set(libraryMeals.map((m) => normalizeName(m.name)))
    generated = generated.filter((m) => !libNames.has(normalizeName(m.name)))

    // Store generated dinners in the library (once each) and pick up stored images —
    // unless generation already used most of the 60s budget, in which case respond first.
    const elapsed = Date.now() - startedAt
    if (elapsed < 46000) {
      try {
        generated = await upsertRecipes(supabase, generated, { userId: profile.userId, dietary: profile.dietaryNeeds, fetchImages: elapsed < 40000 })
      } catch (e) {
        console.error('recipe upsert failed', e)
      }
    } else {
      console.warn(`[generate-plan] skipped library upsert, generation took ${elapsed}ms`)
    }

    const meals = [...generated, ...libraryMeals]
    const totalEstimatedCost = meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)

    return Response.json({
      meals,
      totalEstimatedCost,
      plan: { dinnersPerWeek, cookDays, nightTimes, leftoverNight: settings.plan.leftoverNight },
    })
  } catch (error) {
    console.error('Error generating meal plan:', error)
    return Response.json(
      { error: 'Failed to generate meal plan. Please try again.' },
      { status: 500 }
    )
  }
}
