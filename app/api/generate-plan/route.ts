import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { createClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

interface GeneratePlanResponse {
  meals: Meal[]
  totalEstimatedCost: number
}

// Dietary restriction keywords mapped to ingredient categories / terms to avoid
const DIETARY_CHECKS: Record<string, { label: string; blocked: string[] }> = {
  vegetarian: { label: 'vegetarian', blocked: ['Meat & Seafood'] },
  vegan: { label: 'vegan', blocked: ['Meat & Seafood', 'Dairy & Eggs'] },
  'gluten-free': { label: 'gluten-free', blocked: [] }, // handled in prompt; no reliable category signal
  'dairy-free': { label: 'dairy-free', blocked: ['Dairy & Eggs'] },
  'nut-free': { label: 'nut-free', blocked: [] }, // handled in prompt
  keto: { label: 'keto', blocked: [] }, // no category signal; enforced via prompt
  halal: { label: 'halal', blocked: [] }, // no category signal; enforced via prompt
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // ── Auth gate: userId is required and must match a real profile ──
    if (!body.userId || typeof body.userId !== 'string') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', body.userId)
      .single()

    if (!profileRow) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Null-safe profile field extraction ──
    const profile = {
      userId: body.userId as string,
      familySize: Number(body.familySize) > 0 ? Number(body.familySize) : 4,
      weeklyBudget: body.weeklyBudget || '$100',
      maxCookTime: Number(body.maxCookTime) > 0 ? Number(body.maxCookTime) : 30,
      cuisinePreference: body.cuisinePreference || 'mixed',
      dietaryNeeds: Array.isArray(body.dietaryNeeds) ? body.dietaryNeeds as string[] : [],
      favoriteMeals: Array.isArray(body.favoriteMeals) ? body.favoriteMeals as Meal[] : [],
    }

    // Fetch taste profile for personalization
    let tasteProfileSection = ''
    const { data: tasteProfile } = await supabase
      .from('taste_profiles')
      .select('*')
      .eq('user_id', profile.userId)
      .single()

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
      if (lines.length) tasteProfileSection = `\nLearned user preferences (from past behavior):\n${lines.join('\n')}\n`
    }

    let favoritesSection = ''
    if (profile.favoriteMeals.length > 0) {
      const favoriteNames = profile.favoriteMeals.map(m => m.name)
      favoritesSection = `
The user has these favorite meals: ${favoriteNames.join(', ')}
IMPORTANT: Include 1-2 of these favorites in the plan. Use them exactly as named but you may adjust servings to match the family size. Fill the remaining slots with new meals.
`
    }

    // Build dietary restriction instructions for the prompt
    const dietaryInstructions = profile.dietaryNeeds.length > 0
      ? `STRICT dietary requirements — every meal MUST comply:\n${profile.dietaryNeeds.map(d => `- ${d}`).join('\n')}\nDo NOT include any ingredients that violate these restrictions.`
      : ''

    const prompt = `You are a meal planning assistant for DinnerDrop. Generate exactly 5 dinner meal plans.

User profile:
- Family size: ${profile.familySize} people
- Weekly grocery budget: ${profile.weeklyBudget}
- Max cook time per dinner: ${profile.maxCookTime} minutes
- Cuisine preference: ${profile.cuisinePreference}
- Dietary needs: ${profile.dietaryNeeds.length > 0 ? profile.dietaryNeeds.join(', ') : 'none'}
${dietaryInstructions}
${favoritesSection}${tasteProfileSection}
Requirements:
- Each meal must be completable in ${profile.maxCookTime} minutes or less
- Total grocery cost must stay within ${profile.weeklyBudget}
- Use overlapping ingredients across meals to minimize waste
- Maximum 8 ingredients per meal
- Prioritize meals a tired parent can actually cook on a weeknight

Return ONLY valid JSON with this exact structure, no markdown:
{
  "meals": [
    {
      "day": "Monday",
      "name": "string",
      "cuisine": "Italian",
      "protein": "chicken",
      "cookTime": 25,
      "prepTime": 10,
      "servings": ${profile.familySize},
      "estimatedCost": 18.50,
      "ingredients": [
        { "name": "string", "quantity": "1.5", "unit": "lbs", "category": "Meat & Seafood", "searchTerm": "chicken breast" }
      ],
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ],
  "totalEstimatedCost": 87.50
}`

    const text = await generateWithClaude(prompt, 4000)
    const planData = parseClaudeJSON<GeneratePlanResponse>(text)

    // ── Dietary validation (category-based check for supported restriction types) ──
    if (profile.dietaryNeeds.length > 0) {
      const needs = profile.dietaryNeeds.map((n: string) => n.toLowerCase())
      const blockedCategories = new Set<string>()

      for (const need of needs) {
        const check = DIETARY_CHECKS[need]
        if (check) {
          check.blocked.forEach(cat => blockedCategories.add(cat))
        }
      }

      if (blockedCategories.size > 0) {
        const hasViolation = planData.meals.some(meal =>
          meal.ingredients.some(i => blockedCategories.has(i.category))
        )
        if (hasViolation) {
          // Retry once with stronger prompt emphasis
          const retryText = await generateWithClaude(
            prompt + '\n\nCRITICAL: The previous response violated dietary restrictions. Try again. Absolutely no ' +
            Array.from(blockedCategories).join(' or ') + ' ingredients.',
            4000
          )
          const retryData = parseClaudeJSON<GeneratePlanResponse>(retryText)
          return Response.json(retryData)
        }
      }
    }

    return Response.json(planData)
  } catch (error) {
    console.error('Error generating meal plan:', error)
    return Response.json(
      { error: 'Failed to generate meal plan. Please try again.' },
      { status: 500 }
    )
  }
}
