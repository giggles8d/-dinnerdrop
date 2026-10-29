import { createClient } from '@supabase/supabase-js'
import { FULL_COLUMNS, toLibRow, type LibRow } from '@/lib/recipe-filters'

/** The whole public library as slim rows, most-kept first (server only). */
export async function libraryIndex(): Promise<LibRow[]> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin
    .from('recipes')
    .select(FULL_COLUMNS)
    .eq('is_public', true)
    .order('kept_count', { ascending: false }).order('times_planned', { ascending: false }).limit(2000)
  return ((data ?? []) as Parameters<typeof toLibRow>[0][]).map(toLibRow)
}
