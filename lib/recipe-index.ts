import { createClient } from '@supabase/supabase-js'
import { FULL_COLUMNS, toLibRow, type LibRow } from '@/lib/recipe-filters'

/** The whole public library as slim rows, most-kept first (server only). */
export async function libraryIndex(): Promise<LibRow[]> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // Supabase returns at most 1,000 rows per request, so page through.
  const all: Parameters<typeof toLibRow>[0][] = []
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await admin
      .from('recipes')
      .select(FULL_COLUMNS)
      .eq('is_public', true)
      .order('kept_count', { ascending: false }).order('times_planned', { ascending: false }).order('id')
      .range(from, from + 999)
    if (error) throw error
    all.push(...((data ?? []) as Parameters<typeof toLibRow>[0][]))
    if (!data || data.length < 1000) break
  }
  return all.map(toLibRow)
}
