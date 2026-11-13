import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { mayActFor } from '@/lib/route-auth'
import { createClient } from '@supabase/supabase-js'
import type { GroceryCategory, GroceryItem, Ingredient } from '@/types'
import { scaleSideItems } from '@/lib/side-steps'
import { preppedIngredients } from '@/lib/prepped'

type GroceryListResponse = Record<GroceryCategory, GroceryItem[]>

// Big weeks (7 people, 5 dinners) produce 30–40 line items — needs room and time.
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { meals, userId, prepped } = await request.json()

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
    if (!(await mayActFor(request, supabase, String(userId)))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input — reject empty or malformed requests to protect AI API credits
    if (!Array.isArray(meals) || meals.length === 0) {
      return Response.json({ error: 'meals must be a non-empty array' }, { status: 400 })
    }

    // A side added for someone's health need (lib/member-needs: "Carson: add the rice") or to complete the plate
    // (lib/full-plate: protein + starch + vegetable) is part of the shop.
    // Sides are written for 4 and sized to the dinner's servings here (lib/side-steps).
    // Pre-cut shortcuts (settings.food.prepped): "dice the onion" buys diced onion, "shred the chicken" buys a rotisserie chicken.
    const allIngredients = meals.flatMap((meal: { servings?: number; ingredients: Ingredient[]; steps?: string[]; tags?: string[]; name?: string; side?: { for?: string[]; onList?: boolean; items?: Ingredient[] } }) => [
      ...(Array.isArray(meal.ingredients) ? (prepped ? preppedIngredients(meal).ingredients : meal.ingredients) : []),
      ...((meal.side?.for?.length || meal.side?.onList) && Array.isArray(meal.side.items) ? scaleSideItems(meal.side, meal.servings) : []),
    ])

    if (allIngredients.length === 0) {
      return Response.json({ error: 'No ingredients found in meals' }, { status: 400 })
    }

    const prompt = `You are a grocery list optimizer. Take this list of ingredients from ${meals.length} dinner recipes and:
1. Combine duplicates (e.g., 3 recipes need chicken → one line item with total quantity)
2. Normalize units (convert all to the same unit type where possible)
3. Use quantities a shopper can actually buy: whole counts for produce and packaged goods ("1 head garlic", "2 lemons", "1 bunch cilantro"), fractions no finer than 1/4 for weights ("1 1/4 lb", never "0.625 lbs"), tablespoons/teaspoons for spices and butter under 1/2 cup, and "1 can"/"1 jar"/"1 package" for pantry items. Use singular units ("lb", "cup", "clove") — never "lbs"
4. Organize by store section
5. Create a clean, shopper-friendly search term for each item
6. Keep ready-to-use items as written ("diced onion", "jarred minced garlic", "rotisserie chicken", "coleslaw mix"): never turn them back into whole produce or raw meat, and don't merge them with whole ones (diced onion and a whole red onion stay two lines)

Ingredients:
${JSON.stringify(allIngredients, null, 2)}

Return ONLY valid, compact JSON (no pretty-printing, no comments), no markdown:
{
  "Produce": [{ "name": "string", "quantity": "string", "unit": "string", "category": "Produce", "searchTerm": "string" }],
  "Meat & Seafood": [],
  "Dairy & Eggs": [],
  "Pantry & Dry Goods": [],
  "Frozen": [],
  "Bakery": [],
  "Beverages": []
}`

    const text = await generateWithClaude(prompt, 6000)
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
