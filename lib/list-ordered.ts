/**
 * After a list goes to a store, those lines leave the active list (ordered_at = now).
 * Matching is by item name, so a split order (two stores) only clears what each store got.
 * Server-only (admin client).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeItemName } from '@/lib/list'

export async function markListOrdered(db: SupabaseClient, userId: string, names: string[]): Promise<number> {
  const want = new Set(names.map((n) => normalizeItemName(n)).filter(Boolean))
  if (!want.size) return 0
  const { data: open } = await db.from('list_items').select('id, name, checked').eq('user_id', userId).is('ordered_at', null).eq('have', false)
  // The lines just sent, plus anything already checked off as bought — both leave the active list.
  const ids = (open ?? []).filter((r) => r.checked || want.has(normalizeItemName(r.name))).map((r) => r.id)
  if (!ids.length) return 0
  const { error } = await db.from('list_items').update({ ordered_at: new Date().toISOString() }).in('id', ids)
  return error ? 0 : ids.length
}
