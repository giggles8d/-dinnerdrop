import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { cleanNutrition } from '@/lib/nutrition-shared'
import { allergyConflicts } from '@/lib/allergens'
import { createClient } from '@supabase/supabase-js'
import { mergeSettings, cookTimeFor, WEEKDAY_LABEL, type Settings, type Weekday } from '@/lib/settings'
import { upsertRecipes, pickLibraryRecipes, recipeToMeal, normalizeName, honestTags } from '@/lib/recipe-library'
import type { Meal } from '@/types'
import { ensurePortions } from '@/lib/portions'
import { currentSales, salesPromptBlock } from '@/lib/sales'
import { loadPantry, pantryPromptBlock } from '@/lib/pantry'
import { pickWithOverlap, isFresh } from '@/lib/overlap'

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
      weeklyBudget: body.weeklyBudget || profileRow.weekly_budget || '$150',
      maxCookTime: Number(body.maxCookTime) > 0 ? Number(body.maxCookTime) : (profileRow.max_cook_time || 30),
      cuisinePreference: body.cuisinePreference || profileRow.cuisine_preference || 'mixed',
      dietaryNeeds: Array.isArray(body.dietaryNeeds) ? body.dietaryNeeds as string[] : (profileRow.dietary_needs || []),
      favoriteMeals: Array.isArray(body.favoriteMeals) ? body.favoriteMeals as Meal[] : [],
    }
    // "Keep my picks, fill the rest": dinners the family already chose this week. New options
    // should not repeat them and should share fresh ingredients with them where it's natural.
    const keepMeals: Meal[] = Array.isArray(body.keepMeals) ? (body.keepMeals as Meal[]).slice(0, 7) : []

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
    // Allergy safety net by allergen, not just the word: each person's allergies plus household "-free" diets (Dairy-free → dairy).
    const freeDiets = profile.dietaryNeeds.filter((d: string) => /-free$/i.test(d.trim())).map((d: string) => d.replace(/-free$/i, '').trim())
    const allergyPeople = [...members.filter((m) => m.allergies?.length).map((m) => ({ name: m.name, allergies: m.allergies })), ...(freeDiets.length ? [{ name: '', allergies: freeDiets }] : [])]

    // ---------- plan shape ----------
    const cookDays = settings.plan.cookDays.length ? settings.plan.cookDays : (['mon', 'tue', 'wed', 'thu', 'fri'] as Weekday[])
    const dinnersPerWeek = Math.min(Math.max(settings.plan.dinnersPerWeek, 3), 7)
    const requested = Number(body.optionsCount) > 0 ? Number(body.optionsCount) : settings.plan.optionsCount
    const optionsCount = Math.min(Math.max(requested, dinnersPerWeek, 5), 12)
    const nightTimes = cookDays.map((d) => ({ day: d, label: WEEKDAY_LABEL[d], minutes: cookTimeFor(d, settings, profile.maxCookTime) }))
    const fastestNight = Math.min(...nightTimes.map((n) => n.minutes))
    const slowestNight = Math.max(...nightTimes.map((n) => n.minutes))
    // The family's budget is what they'll pay at their store; estimates are at typical prices,
    // so plan to budget ÷ priceFactor (learned from their real orders; 1 until the first one).
    const priceFactor = Number(settings.stores.priceFactor) > 0 ? Number(settings.stores.priceFactor) : 1
    const budgetNumber = (Number(String(profile.weeklyBudget).replace(/[^0-9.]/g, '')) || 100) / priceFactor
    const perMealBudget = (budgetNumber / dinnersPerWeek).toFixed(0)

    // ---------- taste profile (learned) + recent plans, fetched together ----------
    const [{ data: tasteProfile }, { data: recentPlans }, saleSets, pantryRows] = await Promise.all([
      supabase.from('taste_profiles').select('*').eq('user_id', profile.userId).single(),
      supabase.from('meal_plans').select('meals').eq('user_id', profile.userId).order('created_at', { ascending: false }).limit(3),
      settings.food.useSales ? currentSales(supabase, profile.userId).catch(() => []) : Promise.resolve([]),
      loadPantry(supabase, profile.userId).catch(() => []),
    ])
    const salesSection = salesPromptBlock(saleSets, dinnersPerWeek)
    const pantrySection = pantryPromptBlock(pantryRows, dinnersPerWeek)
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
    // Library first (instant): the library is grown nightly by /api/cron/grow-library, so
    // most weeks are filled entirely from it. AI writes live only to cover what the library
    // can't (tight diets / allergy combos), and those dinners join the library for next time.
    // ---------- "bring it back": dinners the family texted AGAIN for in the last month ----------
    let bringBack: Meal[] = []
    if (mode === 'fresh' && profileRow.household_id) {
      try {
        const { data: again } = await supabase.from('meal_votes').select('meal_name').eq('household_id', profileRow.household_id).eq('vote', 'again').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        const lastPlanNames = new Set((((recentPlans ?? [])[0]?.meals as Meal[]) ?? []).map((m) => normalizeName(m.name)))
        const wanted = Array.from(new Set((again ?? []).map((v) => normalizeName(v.meal_name)))).filter((n) => !lastPlanNames.has(n)).slice(0, 4)
        if (wanted.length) {
          const { data: rows } = await supabase.from('recipes').select('*').in('normalized_name', wanted).limit(4)
          bringBack = ((rows ?? []) as Parameters<typeof recipeToMeal>[0][]).slice(0, 2)
            .map((r, i) => ({ ...recipeToMeal(r, `B${i + 1}`, profile.familySize), tags: ['family pick', ...((r as { tags?: string[] }).tags ?? []).slice(0, 2)] }))
        }
      } catch (e) {
        console.error('bring-back lookup failed', e)
      }
    }

    let libraryMeals: Meal[] = []
    if (mode === 'fresh') {
      try {
        const picks = await pickLibraryRecipes(supabase, {
          limit: optionsCount + 16,
          maxCookTime: slowestNight,
          maxCalories: settings.food.maxCalories,
          dietary: profile.dietaryNeeds,
          excludeWords: [...settings.food.neverIngredients, ...settings.food.avoidProteins, ...allDislikes],
          allergies: allergyPeople.flatMap((p) => p.allergies),
          excludeNames: [...recentNames, ...profile.favoriteMeals.map((m) => m.name), ...keepMeals.map((m) => m.name)],
          cuisines: settings.food.cuisines,
        })
        // Sized to the family; skip dinners far over the per-dinner budget.
        const perDinner = Number(perMealBudget) || 20
        const affordable = picks
          .map((r, i) => recipeToMeal(r, `L${i + 1}`, profile.familySize))
          .filter((m) => (Number(m.estimatedCost) || 0) <= perDinner * 1.4)
        // Favor options that share fresh ingredients with each other (and with kept picks),
        // so whatever the family picks uses whole bunches/bags instead of half of each.
        const backNames = new Set(bringBack.map((m) => normalizeName(m.name)))
        libraryMeals = [...bringBack, ...pickWithOverlap(affordable.filter((m) => !backNames.has(normalizeName(m.name))), optionsCount - bringBack.length, [...keepMeals, ...bringBack])]
      } catch (e) {
        console.error('library picks failed', e)
      }
    }
    if (mode === 'fresh' && libraryMeals.length >= optionsCount) {
      return Response.json({
        meals: libraryMeals,
        totalEstimatedCost: libraryMeals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0),
        plan: { dinnersPerWeek, cookDays, nightTimes, leftoverNight: settings.plan.leftoverNight },
        source: 'library',
      })
    }
    const generateCount = mode === 'fresh' ? Math.max(optionsCount - libraryMeals.length, 2) : Math.max(optionsCount, 3)

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
    if (settings.food.equipment.length) constraintLines.push(`Equipment to lean on: ${settings.food.equipment.join(', ')}. Some options should use these, but keep most dinners stovetop/oven weeknight cooking.`)
    const maxLong = settings.plan.maxLongCookNights
    if (maxLong >= 0) constraintLines.push(maxLong === 0 ? `No slow-cooker or all-day dinners this week.` : `At most ${maxLong} slow-cooker / Instant-Pot all-day dinner${maxLong === 1 ? '' : 's'} (cookTime 90+ min) among the options.`)
    if (hasKids) constraintLines.push(`Kid-friendly by default: familiar flavors, components kept separate where possible, nothing "mixed" that a kid can't pick apart.`)
    if (settings.plan.leftoverNight) constraintLines.push(`Mark at least 2 options "leftoverFriendly": true — dinners that double well and reheat well (for the family's leftover night). Their servings should be ${profile.familySize * 2}.`)
    if (recentNames.length) constraintLines.push(`Do not repeat these recent dinners: ${recentNames.slice(0, 20).join(', ')}.`)
    constraintLines.push(`Share fresh ingredients across options where it's natural: if one dinner uses half a bunch of cilantro, a few green onions, part of a bag of spinach or a tub of sour cream, have another option use the rest (different dish, different protein). A family picking several options should use whole packages, not throw half away.`)
    if (keepMeals.length) {
      const keptFresh = Array.from(new Set(keepMeals.flatMap((m) => (m.ingredients ?? []).filter(isFresh).map((i) => i.name.toLowerCase()))))
      constraintLines.push(`The family already chose: ${keepMeals.map((m) => m.name).join(', ')}. Do not repeat them. These options fill the rest of the week${keptFresh.length ? `; where natural, reuse their fresh ingredients (${keptFresh.slice(0, 10).join(', ')})` : ''}.`)
    }

    const nightLines = nightTimes.map((n) => `- ${n.label}: ${n.minutes} min`).join('\n')
    const timeRule = fastestNight === slowestNight
      ? `- Every dinner must be completable in ${slowestNight} minutes or less, prep included.`
      : `- Cook nights and the time available each night:\n${nightLines}\n- At least ${Math.max(2, Math.ceil(generateCount / 3))} options must take ${fastestNight} minutes or less (for the fastest nights). No option may exceed ${slowestNight} minutes. Set "suggestedNight" to the night each dinner fits best.`

    const nutritionField = settings.food.nutritionInfo

    const prompt = `You are the meal planner for DinnerDrop. Generate exactly ${generateCount} diverse weeknight dinner options for one family to choose ${dinnersPerWeek} from.

Family:
- ${profile.familySize} people at dinner
- Weekly dinner budget at typical prices: $${budgetNumber.toFixed(0)} (about $${perMealBudget} per dinner)
- Default cook time: ${profile.maxCookTime} minutes
- Dietary needs: ${profile.dietaryNeeds.length ? profile.dietaryNeeds.join(', ') : 'none'}
${peopleSection}${favoritesSection}${tasteProfileSection}${salesSection}${pantrySection}
Rules:
${constraintLines.map((l) => `- ${l}`).join('\n')}
${timeRule}
- estimatedCost is the realistic grocery cost of the ingredients at typical US supermarket prices (most weeknight dinners for ${profile.familySize} run $12–$30); do not inflate it. The ${dinnersPerWeek} dinners they pick must fit in $${budgetNumber.toFixed(0)} at typical prices, so keep every option under $${perMealBudget}
- Make the options diverse — different proteins, cuisines, and cooking styles; no two options share a main protein + style
- Maximum 6 ingredients per dinner, maximum 4 short steps (one sentence each), written for a tired parent
- cookTime = minutes until it's on the table; prepTime = hands-on minutes. A slow-cooker dinner is cookTime 480 with prepTime 15 — only offer those when the night allows it (the family has a slow cooker; assume it's started in the morning). Set "servings" to exactly ${profile.familySize}${settings.plan.leftoverNight ? ` (${profile.familySize * 2} for leftover-friendly ones)` : ''}
- Ingredient quantities must be shoppable (what you'd buy: "1" "lb", "2" "cans", "1" "bunch"), with a "searchTerm" that matches a grocery product name
- "safeBite" is the one plain component of that dinner a picky eater can have on its own, in 2–4 words ("plain rice", "a plain tortilla", "chicken, sauce on the side"); every dinner must have one.
- Size every ingredient for the dinner's servings — this is a real family, not a recipe for 4. Per serving buy at least 6 oz raw boneless meat or fish (8 oz bone-in, 5 1/2 oz ground meat), 3 1/2 oz dry pasta or 1/2 cup dry rice, 1/2 lb potatoes, and 1 cup of vegetables. So ${profile.familySize} servings needs about ${(Math.ceil((profile.familySize * 6) / 4) / 4).toFixed(2).replace(/\.?0+$/, '')} lb of boneless meat${settings.plan.leftoverNight ? `, and a leftover-friendly dinner (${profile.familySize * 2} servings) needs double that` : ''}.
- Give each dinner 1–3 short tags from: quick, sheet-pan, one-pot, air-fryer, slow-cooker, instant-pot, grill, kid-favorite, leftover-friendly, budget, high-protein, vegetarian, 15-min
${settings.food.maxCalories ? `- Every dinner must be under ${settings.food.maxCalories} calories per serving (lean proteins, more vegetables, lighter sauces); include the nutrition estimate.` : ''}
${settings.food.nutritionInfo ? '- Estimate nutrition per serving from the ingredient amounts (calories; grams of protein, carbs, fat, saturated fat, fiber, sugar; mg sodium)' : ''}

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
      "leftoverFriendly": false,
      "safeBite": "plain rice",${pantrySection ? '\n      "usesPantry": ["chicken thighs"],' : ''}${salesSection ? '\n      "saleItems": ["chicken thighs $1.99/lb"],' : ''}${kidSafeFoods.length ? '\n      "kidNote": "plain rice on the side for Max",' : ''}${nutritionField ? '\n      "nutrition": { "calories": 520, "protein": 34, "carbs": 48, "fat": 18, "satFat": 6, "fiber": 7, "sugar": 9, "sodium": 890 },' : ''}
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
    const excl = [...settings.food.neverIngredients, ...settings.food.avoidProteins].map((w) => w.toLowerCase()) // allergies: checked by allergen below
    let generated = (planData.meals ?? []).filter((m) => {
      const hay = `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase()
      if (excl.some((w) => w && hay.includes(w))) return false
      if (settings.food.maxCalories && m.nutrition?.calories && m.nutrition.calories > settings.food.maxCalories * 1.1) return false
      return !allergyConflicts(m.ingredients ?? [], allergyPeople, m.name).length
    })
    // Pin servings to the family (the model drifts); leftover-friendly dinners are sized for two nights.
    generated = generated.map((m) => ({
      ...m,
      servings: m.leftoverFriendly ? profile.familySize * 2 : profile.familySize,
      cookTime: Number(m.cookTime) || 30,
      prepTime: Number(m.prepTime) || 0,
      nutrition: cleanNutrition(m.nutrition) ?? undefined,
    })).map(ensurePortions).map((m) => ({ ...m, tags: honestTags(m.tags ?? [], (m.cookTime ?? 0) + (m.prepTime ?? 0)) }))
    // Enforce the all-day dinner cap (the model over-leans on slow cookers when they're listed).
    if (maxLong >= 0) {
      let longSeen = 0
      generated = generated.filter((m) => {
        if ((Number(m.cookTime) || 0) < 90) return true
        longSeen++
        return longSeen <= maxLong
      })
    }
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
