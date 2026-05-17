import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { createClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

// Extend serverless timeout — AI generation needs up to 55s
export const maxDuration = 60

interface GeneratePlanResponse {
  meals: Meal[]
  totalEstimatedCost: number
}

export async function POST(request: Request) {
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
      .select('subscription_status')
      .eq('id', body.userId)
      .single()

    if (!profileRow) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const dietaryInstructions = profile.dietaryNeeds.length > 0
      ? `STRICT dietary requirements — every meal MUST comply:\n${profile.dietaryNeeds.map(d => `- ${d}`).join('\n')}\nDo NOT include any ingredients that violate these restrictions.`
      : ''

    const prompt = `You are a meal planning assistant for DinnerDrop. Generate exactly 10 diverse dinner ideas for a family to choose from.

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
- Each meal individually must cost within ${profile.weeklyBudget} divided by 5
- Make the 10 ideas diverse — different cuisines, proteins, and styles
- Maximum 8 ingredients per meal
- Prioritize meals a tired parent can actually cook on a weeknight
- The user will pick their favorites, so make every option appealing

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
      "ingredients": [
        { "name": "string", "quantity": "1.5", "unit": "lbs", "category": "Meat & Seafood", "searchTerm": "chicken breast" }
      ],
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ],
  "totalEstimatedCost": 87.50
}

Use "day" values "1" through "10" as unique identifiers for each meal idea.`

    const text = await generateWithClaude(prompt, 4000)
    let planData: GeneratePlanResponse
    try {
      planData = parseClaudeJSON<GeneratePlanResponse>(text)
    } catch {
      console.error('Failed to parse Claude response:', text.slice(0, 200))
      return Response.json({ error: 'AI returned an unexpected format. Please try again.' }, { status: 500 })
    }

    // Dietary validation enforced via prompt — sync retry removed to prevent 60s Vercel timeout
    return Response.json(planData)
  } catch (error) {
    console.error('Error generating meal plan:', error)
    return Response.json(
      { error: 'Failed to generate meal plan. Please try again.' },
      { status: 500 }
    )
  }
}
