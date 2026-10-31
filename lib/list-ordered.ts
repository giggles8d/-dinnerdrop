/**
 * Lines leave the active list (ordered_at = now) once the family CONFIRMS the order went through —
 * the "Order placed" banner, the "what did it cost" box, a texted "order $X", or a receipt. Sending
 * the list to Instacart/Kroger alone no longer clears it (Sarah, Oct 31 2026: items vanished even
 * when nothing was bought). Matching is by item name so a split order only clears what each store got.
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

/** Everything still open (not 'have') that was on the list at `before` → ordered. Used by confirmations. */
export async function markAllOpenOrdered(db: SupabaseClient, userId: string, before: string | Date = new Date()): Promise<number> {
  const cutoff = typeof before === 'string' ? before : before.toISOString()
  const { data: open } = await db.from('list_items').select('id').eq('user_id', userId).is('ordered_at', null).eq('have', false).lte('created_at', cutoff)
  const ids = (open ?? []).map((r) => r.id)
  if (!ids.length) return 0
  const { error } = await db.from('list_items').update({ ordered_at: new Date().toISOString() }).in('id', ids)
  return error ? 0 : ids.length
}
