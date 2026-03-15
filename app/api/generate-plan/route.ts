import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { createClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

interface GeneratePlanResponse {
  meals: Meal[]
  totalEstimatedCost: number
}

export async function POST(request: Request) {
  try {
    const profile = await request.json()

    const favoriteMeals: Meal[] = profile.favoriteMeals || []

    // Fetch taste profile for personalization
    let tasteProfileSection = ''
    if (profile.userId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
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
    }
    let favoritesSection = ''

    if (favoriteMeals.length > 0) {
      const favoriteNames = favoriteMeals.map(m => m.name)
      favoritesSection = `
The user has these favorite meals: ${favoriteNames.join(', ')}
IMPORTANT: Include 1-2 of these favorites in the plan. Use them exactly as named but you may adjust servings to match the family size. Fill the remaining slots with new meals.
`
    }

    const prompt = `You are a meal planning assistant for DinnerDrop. Generate exactly 5 dinner meal plans.

User profile:
- Family size: ${profile.familySize} people
- Weekly grocery budget: ${profile.weeklyBudget}
- Max cook time per dinner: ${profile.maxCookTime} minutes
- Cuisine preference: ${profile.cuisinePreference}
- Dietary needs: ${profile.dietaryNeeds.length > 0 ? profile.dietaryNeeds.join(', ') : 'none'}
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

    // Validate dietary restrictions if any
    if (profile.dietaryNeeds && profile.dietaryNeeds.length > 0) {
      const needs = profile.dietaryNeeds.map((n: string) => n.toLowerCase())
      for (const meal of planData.meals) {
        if (needs.includes('vegetarian') || needs.includes('vegan')) {
          const meatCategories = ['Meat & Seafood']
          const hasMeat = meal.ingredients.some(i => meatCategories.includes(i.category))
          if (hasMeat) {
            // Retry once if dietary violation detected
            const retryText = await generateWithClaude(prompt, 4000)
            const retryData = parseClaudeJSON<GeneratePlanResponse>(retryText)
            return Response.json(retryData)
          }
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
