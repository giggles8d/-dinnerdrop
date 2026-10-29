import { createClient } from '@supabase/supabase-js'
import RecipesClient from './RecipesClient'
import { FULL_COLUMNS, toLibRow, type LibRow } from '@/lib/recipe-filters'

// Server-rendered so a logged-out parent (and Google) sees the dinners in the first HTML, not an empty shell.
// Sends a slim index of the whole library (no steps) so filters run instantly in the browser.
export const revalidate = 600

export default async function RecipesPage() {
  let rows: LibRow[] = []
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin
      .from('recipes')
      .select(FULL_COLUMNS)
      .eq('is_public', true)
      .order('kept_count', { ascending: false }).order('times_planned', { ascending: false }).limit(2000)
    rows = ((data ?? []) as Parameters<typeof toLibRow>[0][]).map(toLibRow)
  } catch { /* client fetch takes over */ }
  return <RecipesClient initialRows={rows} />
}
