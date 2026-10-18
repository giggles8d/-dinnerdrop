import { createClient } from '@supabase/supabase-js'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import type { Meal } from '@/types'
import { mergeSettings } from '@/lib/settings'
import { upsertRecipes } from '@/lib/recipe-library'

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
    if (profileRow.household_id) {
      const { data: members } = await supabase
        .from('household_members')
        .select('name, role, likes, dislikes, allergies, safe_foods')
        .eq('household_id', profileRow.household_id)
      for (const m of members ?? []) {
        hardExclusions.push(...(m.allergies ?? []))
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

    const text = await generateWithClaude(prompt, 2000)
    const data = parseClaudeJSON<SwapMealResponse>(text)
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
