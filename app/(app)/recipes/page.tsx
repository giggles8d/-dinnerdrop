import { createClient } from '@supabase/supabase-js'
import RecipesClient, { type RecipeRow } from './RecipesClient'

// Server-rendered so a logged-out parent (and Google) sees the dinners in the first HTML, not an empty shell.
export const revalidate = 600

export default async function RecipesPage() {
  let rows: RecipeRow[] = []
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin
      .from('recipes')
      .select('id, name, slug, cuisine, protein, cook_time, prep_time, servings, estimated_cost, ingredients, steps, tags, image_url, nutrition, source, created_by, kept_count, times_planned')
      .order('kept_count', { ascending: false }).order('times_planned', { ascending: false }).limit(400)
    rows = (data as RecipeRow[]) ?? []
  } catch { /* client fetch takes over */ }
  return <RecipesClient initialRows={rows} />
}
