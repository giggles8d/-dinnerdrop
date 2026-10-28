/**
 * Record what the store actually charged for the most recent handoff and learn this family's
 * price factor from it. Shared by POST /api/handoff/actual (typed in by the user) and the
 * forwarded-receipt pipeline (read off the receipt).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings } from '@/lib/settings'
import { blendFactor, factorAtSend } from '@/lib/prices'

export async function recordActualTotal(
  admin: SupabaseClient,
  ownerId: string,
  actual: number,
  store?: string | null,
  handoffId?: string | null,
): Promise<{ handoffId: string | null; factor: number | null }> {
  if (!Number.isFinite(actual) || actual <= 0) return { handoffId: null, factor: null }
  const q = admin.from('grocery_handoffs').select('id, est_total, created_at').eq('user_id', ownerId)
  const { data: h } = handoffId
    ? await q.eq('id', handoffId).single()
    : await q.order('created_at', { ascending: false }).limit(1).single()
  if (!h) return { handoffId: null, factor: null }
  const storeName = store ? String(store).slice(0, 40) : ''
  await admin.from('grocery_handoffs').update({ actual_total: actual, ...(storeName ? { store: storeName } : {}) }).eq('id', h.id)
  let factor: number | null = null
  if (h.est_total && Number(h.est_total) > 0) {
    const { data: prof } = await admin.from('profiles').select('settings').eq('id', ownerId).single()
    const settings = mergeSettings(prof?.settings)
    // est_total was the list at typical prices × the factor in use when it was sent; learn against the typical-price base.
    const observed = actual / (Number(h.est_total) / factorAtSend(h.created_at, settings.stores.priceFactor))
    factor = blendFactor(settings.stores.priceFactor, observed)
    const myStores = [...settings.stores.myStores]
    if (storeName) {
      const i = myStores.findIndex((s) => s.name.toLowerCase() === storeName.toLowerCase())
      if (i >= 0) myStores[i] = { ...myStores[i], factor: blendFactor(myStores[i].factor, observed) }
      else myStores.push({ name: storeName, factor: blendFactor(undefined, observed) })
    }
    await admin.from('profiles').update({ settings: { ...(prof?.settings as object ?? {}), stores: { ...settings.stores, priceFactor: factor, myStores } } }).eq('id', ownerId)
  }
  return { handoffId: h.id as string, factor }
}
