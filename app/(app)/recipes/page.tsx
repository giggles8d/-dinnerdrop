import RecipesClient from './RecipesClient'
import { libraryIndex } from '@/lib/recipe-index'
import type { LibRow } from '@/lib/recipe-filters'

// Server-rendered so a logged-out parent (and Google) sees real dinners in the first HTML.
// Only the first page of cards ships in the HTML; the full slim index loads from /api/recipes/library for the filters.
export const revalidate = 600
const FIRST = 48

export default async function RecipesPage() {
  let rows: LibRow[] = []
  let total = 0
  try { const all = await libraryIndex(); total = all.length; rows = all.slice(0, FIRST) } catch { /* client fetch takes over */ }
  return <RecipesClient initialRows={rows} total={total} />
}
