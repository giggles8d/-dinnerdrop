import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { createClient } from '@supabase/supabase-js'
import type { GroceryCategory, GroceryItem } from '@/types'

type GroceryListResponse = Record<GroceryCategory, GroceryItem[]>

export async function POST(request: Request) {
  try {
    const { meals, userId } = await request.json()

    // Auth gate — validate userId to prevent unauthorized Claude API credit usage
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    if (!profile) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input — reject empty or malformed requests to protect AI API credits
    if (!Array.isArray(meals) || meals.length === 0) {
      return Response.json({ error: 'meals must be a non-empty array' }, { status: 400 })
    }

    const allIngredients = meals.flatMap((meal: { ingredients: unknown[] }) =>
      Array.isArray(meal.ingredients) ? meal.ingredients : []
    )

    if (allIngredients.length === 0) {
      return Response.json({ error: 'No ingredients found in meals' }, { status: 400 })
    }

    const prompt = `You are a grocery list optimizer. Take this list of ingredients from 5 dinner recipes and:
1. Combine duplicates (e.g., 3 recipes need chicken → one line item with total quantity)
2. Normalize units (convert all to the same unit type where possible)
3. Use quantities a shopper can actually buy: whole counts for produce and packaged goods ("1 head garlic", "2 lemons", "1 bunch cilantro"), fractions no finer than 1/4 for weights ("1 1/4 lb", never "0.625 lbs"), tablespoons/teaspoons for spices and butter under 1/2 cup, and "1 can"/"1 jar"/"1 package" for pantry items. Use singular units ("lb", "cup", "clove") — never "lbs"
4. Organize by store section
5. Create a clean, shopper-friendly search term for each item

Ingredients:
${JSON.stringify(allIngredients, null, 2)}

Return ONLY valid JSON, no markdown:
{
  "Produce": [{ "name": "string", "quantity": "string", "unit": "string", "category": "Produce", "searchTerm": "string" }],
  "Meat & Seafood": [],
  "Dairy & Eggs": [],
  "Pantry & Dry Goods": [],
  "Frozen": []
}`

    const text = await generateWithClaude(prompt, 2000)
    const groceryList = parseClaudeJSON<GroceryListResponse>(text)

    return Response.json(groceryList)
  } catch (error) {
    console.error('Error generating grocery list:', error)
    return Response.json(
      { error: 'Failed to generate grocery list. Please try again.' },
      { status: 500 }
    )
  }
}
