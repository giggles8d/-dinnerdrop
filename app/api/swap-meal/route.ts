import { createClient } from '@supabase/supabase-js'
import { allergyConflicts } from '@/lib/allergens'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import type { Meal } from '@/types'
import { ensurePortions } from '@/lib/portions'
import { mergeSettings } from '@/lib/settings'
import { upsertRecipes, pickLibraryRecipes, recipeToMeal, normalizeName } from '@/lib/recipe-library'

interface SwapMealResponse {
  meal: Meal
}

export async function POST(request: Request) {
  try {
    const { currentMeal, profile, userId } = await request.json()

    // Auth gate: reject unauthenticated callers to protect Claude API credits
    if (!userId || typeof userId !== 'string') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, settings, household_id, dietary_needs')
      .eq('id', userId)
      .single()
    if (!profileRow) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Household rules: allergies, never-ingredients, dislikes, kid safe foods.
    const settings = mergeSettings(profileRow.settings)
    let memberLines = ''
    const hardExclusions = [...settings.food.neverIngredients, ...settings.food.avoidProteins]
    const allergyPeople: Array<{ name: string; allergies: string[] }> = []
    const freeDiets = ((profileRow.dietary_needs ?? []) as string[]).filter((d) => /-free$/i.test(d.trim())).map((d) => d.replace(/-free$/i, '').trim())
    if (freeDiets.length) allergyPeople.push({ name: '', allergies: freeDiets })
    if (profileRow.household_id) {
      const { data: members } = await supabase
        .from('household_members')
        .select('name, role, likes, dislikes, allergies, safe_foods')
        .eq('household_id', profileRow.household_id)
      for (const m of members ?? []) {
        hardExclusions.push(...(m.allergies ?? []))
        if (m.allergies?.length) allergyPeople.push({ name: m.name, allergies: m.allergies })
        const bits: string[] = []
        if (m.likes?.length) bits.push(`loves ${m.likes.join(', ')}`)
        if (m.dislikes?.length) bits.push(`won't eat ${m.dislikes.join(', ')}`)
        if (m.safe_foods?.length) bits.push(`safe foods: ${m.safe_foods.join(', ')}`)
        if (bits.length) memberLines += `- ${m.name} (${m.role}): ${bits.join('; ')}\n`
      }
    }
    const rulesSection = [
      hardExclusions.length ? `- NEVER use: ${Array.from(new Set(hardExclusions)).join(', ')}` : '',
      settings.food.cuisines.length ? `- Cuisines the family likes: ${settings.food.cuisines.join(', ')}` : '',
      `- Spice: ${settings.food.spice}`,
      settings.food.equipment.length ? `- Equipment available: ${settings.food.equipment.join(', ')}` : '',
      memberLines ? `Who's eating:\n${memberLines}` : '',
    ].filter(Boolean).join('\n')

    // Allergy safety net: never hand back a swap that hits someone's allergy (by allergen, so "dairy" also catches cheese).
    const unsafeMeal = (m: Meal | undefined) => !m || allergyConflicts(m.ingredients ?? [], allergyPeople, m.name).length > 0
      || [...settings.food.neverIngredients, ...settings.food.avoidProteins].some((w) => w && `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase().includes(w.toLowerCase()))

    // Library first: a proven dinner that fits the family, never the ones already on this week's plan.
    // AI writes a swap only when the library has nothing left that fits.
    try {
      const { data: plans } = await supabase.from('meal_plans').select('meals').eq('user_id', userId).order('created_at', { ascending: false }).limit(2)
      const onPlan = (plans ?? []).flatMap((p) => ((p.meals as Meal[]) ?? []).map((m) => m.name)).filter(Boolean)
      const familySize = Number(profile?.familySize) || 4
      const maxCook = Number(profile?.maxCookTime) || 45
      const dietary: string[] = Array.isArray(profileRow.dietary_needs) ? profileRow.dietary_needs : []
      const baseOpts = {
        limit: 12,
        maxCookTime: maxCook,
        maxCalories: settings.food.maxCalories,
        dietary,
        excludeWords: hardExclusions,
        allergies: allergyPeople.flatMap((p) => p.allergies),
        excludeNames: [...onPlan, currentMeal?.name ?? ''],
        cuisines: settings.food.cuisines,
      }
      let rows = await pickLibraryRecipes(supabase, baseOpts)
      if (!rows.length) rows = await pickLibraryRecipes(supabase, { ...baseOpts, cuisines: [], maxCookTime: maxCook + 20, maxCalories: 0 })
      if (rows.length) {
        const target = Number(currentMeal?.estimatedCost) || 0
        const curProtein = String(currentMeal?.protein ?? '').toLowerCase()
        const curCuisine = String(currentMeal?.cuisine ?? '').toLowerCase()
        // Prefer a fresh dinner in the same lane (same cuisine or protein), near the same cost, with a photo.
        const ranked = rows.map((r) => ({
          r,
          score: Math.random()
            + (r.cuisine && r.cuisine.toLowerCase() === curCuisine ? 0.6 : 0)
            + (r.protein && r.protein.toLowerCase() === curProtein ? 0.3 : 0)
            + (r.image_url ? 0.4 : 0)
            - (target > 0 ? Math.min(Math.abs((Number(r.estimated_cost) || target) - target) / target, 1) * 0.5 : 0),
        })).sort((a, b) => b.score - a.score)
        const pick = ranked.find((x) => normalizeName(x.r.name) !== normalizeName(currentMeal?.name ?? ''))?.r
        if (pick) {
          const meal = recipeToMeal(pick, currentMeal?.day ?? 'Monday', familySize)
          if (!unsafeMeal(meal)) return Response.json({ meal, source: 'library' })
        }
      }
    } catch (e) {
      console.error('[swap-meal] library pick failed, falling back to AI', e)
    }

    const prompt = `You are a meal planning assistant for DinnerDrop. The user wants to swap out a meal from their weekly plan.

Current meal being replaced:
- Name: ${currentMeal.name}
- Day: ${currentMeal.day}

User profile:
- Family size: ${profile.familySize} people
- Weekly grocery budget: ${profile.weeklyBudget}
- Max cook time per dinner: ${profile.maxCookTime} minutes
- Cuisine preference: ${profile.cuisinePreference}
- Dietary needs: ${profile.dietaryNeeds?.length > 0 ? profile.dietaryNeeds.join(', ') : 'none'}

Requirements:
- Generate exactly 1 replacement meal for ${currentMeal.day}
- It must be different from "${currentMeal.name}"
- Similar style/cuisine but a fresh option
- Must be completable in ${profile.maxCookTime} minutes or less
- Estimated cost should be around $${currentMeal.estimatedCost}
- Maximum 8 ingredients
- Prioritize meals a tired parent can actually cook on a weeknight
- Quantities must be shoppable (what you'd buy) with a searchTerm matching a grocery product name
${rulesSection}

Return ONLY valid JSON with this exact structure, no markdown:
{
  "meal": {
    "day": "${currentMeal.day}",
    "name": "string",
    "cookTime": 25,
    "prepTime": 10,
    "servings": ${profile.familySize},
    "estimatedCost": 18.50,
    "ingredients": [
      { "name": "string", "quantity": "1.5", "unit": "lbs", "category": "Meat & Seafood", "searchTerm": "chicken breast" }
    ],
    "steps": ["Step 1", "Step 2", "Step 3"]
  }
}`

    const unsafe = unsafeMeal
    let data = parseClaudeJSON<SwapMealResponse>(await generateWithClaude(prompt, 2000))
    if (unsafe(data.meal)) {
      const hit = allergyConflicts(data.meal?.ingredients ?? [], allergyPeople, data.meal?.name ?? '').map((c) => `${c.allergy} (${c.items.join(', ')})`).join('; ')
      data = parseClaudeJSON<SwapMealResponse>(await generateWithClaude(`${prompt}\n\nIMPORTANT: your last answer broke the family's allergy rules${hit ? `: ${hit}` : ''}. Use none of those ingredients or anything containing them.`, 2000))
      if (unsafe(data.meal)) return Response.json({ error: 'Couldn\u2019t find a swap that fits your family\u2019s allergies. Try again, or pick one from the recipe library.' }, { status: 422 })
    }
    data.meal = ensurePortions({ ...data.meal, servings: Number(data.meal.servings) || profile.familySize })
    try {
      const [stored] = await upsertRecipes(supabase, [data.meal], { userId, dietary: profileRow.dietary_needs ?? [] })
      if (stored) data.meal = stored
    } catch (e) {
      console.error('recipe upsert failed', e)
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error swapping meal:', error)
    return Response.json(
      { error: 'Failed to swap meal. Please try again.' },
      { status: 500 }
    )
  }
}
