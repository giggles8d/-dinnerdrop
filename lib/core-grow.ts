/**
 * The core everyday dinners grow from family favorites (Sarah, Nov 10 2026: "start with 200 and it will grow as we
 * get more favorites"). Run nightly with the library job:
 * - In: a public dinner outside the core that families keep (kept ≥ 4 and kept at least twice its skips).
 * - Out: a core dinner families pass on (skipped ≥ 6 and more than twice its keeps). Not deleted; it stays in the
 *   wider library as a "try something new" dinner.
 * Every change is logged in app_kv `core_recipes.log` (last 200).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

type CoreKv = { ids?: string[]; log?: Array<{ at: string; id: string; name: string; change: 'in' | 'out'; kept: number; skipped: number }>; [k: string]: unknown }

export async function growCore(admin: SupabaseClient): Promise<{ added: string[]; removed: string[]; size: number }> {
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'core_recipes').maybeSingle()
  const v = ((kv?.value ?? {}) as CoreKv)
  const ids = new Set((v.ids ?? []).map(String))
  if (!ids.size) return { added: [], removed: [], size: 0 }
  const { data: rows } = await admin.from('recipes').select('id, name, kept_count, skipped_count, is_public, image_url').or('kept_count.gte.4,skipped_count.gte.6')
  const now = new Date().toISOString()
  const log = [...(v.log ?? [])]
  const added: string[] = [], removed: string[] = []
  for (const r of (rows ?? []) as Array<{ id: string; name: string; kept_count: number; skipped_count: number; is_public: boolean; image_url: string | null }>) {
    const kept = r.kept_count ?? 0, skipped = r.skipped_count ?? 0
    if (!ids.has(r.id) && r.is_public && r.image_url && kept >= 4 && kept >= 2 * skipped) {
      ids.add(r.id); added.push(r.name); log.push({ at: now, id: r.id, name: r.name, change: 'in', kept, skipped })
    } else if (ids.has(r.id) && skipped >= 6 && skipped > 2 * kept) {
      ids.delete(r.id); removed.push(r.name); log.push({ at: now, id: r.id, name: r.name, change: 'out', kept, skipped })
    }
  }
  if (added.length || removed.length) {
    await admin.from('app_kv').upsert({ key: 'core_recipes', value: { ...v, ids: Array.from(ids), log: log.slice(-200), grownAt: now }, updated_at: now })
  }
  return { added, removed, size: ids.size }
}
