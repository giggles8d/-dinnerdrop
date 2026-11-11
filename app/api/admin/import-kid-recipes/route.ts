import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import rows from '@/data/kid-recipes-2026-11.json'

export const dynamic = 'force-dynamic'

/**
 * One-time, preview deployments only (Nov 10 2026): add the 60 kid-friendly dinners Sarah asked for (new names,
 * our own steps; ingredient lists only from her collection) to the library and the core. Skips names already in the
 * library. Returns the new ids so photos can be attached. Does nothing in production.
 */
export async function POST() {
  if (process.env.VERCEL_ENV !== 'preview') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const list = rows as Array<Record<string, unknown> & { normalized_name: string; name: string }>
  const { data: have } = await admin.from('recipes').select('normalized_name').in('normalized_name', list.map((r) => r.normalized_name))
  const exists = new Set((have ?? []).map((h) => h.normalized_name as string))
  const fresh = list.filter((r) => !exists.has(r.normalized_name)).map((r) => ({ ...r, source: 'generated', is_public: true, times_planned: 0 }))
  const { data: ins, error } = fresh.length ? await admin.from('recipes').insert(fresh).select('id, name') : { data: [], error: null }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Into the core everyday dinners.
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'core_recipes').maybeSingle()
  const v = (kv?.value ?? {}) as { ids?: string[] }
  const { data: all } = await admin.from('recipes').select('id').in('normalized_name', list.map((r) => r.normalized_name))
  const ids = Array.from(new Set([...(v.ids ?? []), ...(all ?? []).map((r) => String(r.id))]))
  await admin.from('app_kv').upsert({ key: 'core_recipes', value: { ...v, ids, kidCollectionAddedAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
  return NextResponse.json({ inserted: (ins ?? []).length, skipped: list.length - fresh.length, core: ids.length, recipes: ins })
}
