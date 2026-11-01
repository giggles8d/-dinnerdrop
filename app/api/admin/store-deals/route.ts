import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { salesFromImage, salesFromText, type SaleItem } from '@/lib/sales'
import { canonicalStore, saveStoreDeals } from '@/lib/store-deals'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** Same pipeline token the recipe tasks use (app_kv.recipe_image_token), or SETUP_SECRET. */
async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const token = request.headers.get('x-image-token')
  if (!token || token.length < 32) return false
  const { data } = await admin().from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  return !!data?.value && (data.value as { token?: string }).token === token
}

function parseDataUrl(s: string): { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } | null {
  const m = s.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/)
  return m ? { mediaType: m[1] as 'image/jpeg', base64: m[2] } : null
}

/**
 * GET  /api/admin/store-deals?store=Tops          → sets for a store (newest first, last 3 weeks)
 * POST /api/admin/store-deals                      → read an ad and save/merge the shared set
 *   { store, region?, validFrom?, validTo?, source?, images?: [dataUrl…] | text?: string | items?: SaleItem[] }
 *   Each image is one ad page; pages merge into the set for (store, region, validFrom).
 *   validFrom/validTo override what the reader finds (the ad's own dates win when not given).
 * Used by the scheduled ad reader (Chrome on Sarah's PC) on each store's preview day.
 */
export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = request.nextUrl.searchParams.get('store')
  const since = new Date(Date.now() - 21 * 86400000).toISOString()
  let q = admin().from('store_deals').select('id, store, region, valid_from, valid_to, source, pages, updated_at, items').gte('updated_at', since).order('valid_from', { ascending: false }).limit(40)
  if (store) q = q.ilike('store', canonicalStore(store))
  const { data } = await q
  return NextResponse.json({ sets: (data ?? []).map((d) => ({ ...d, itemCount: Array.isArray(d.items) ? d.items.length : 0 })) })
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { store?: string; region?: string; validFrom?: string; validTo?: string; source?: string; images?: string[]; text?: string; items?: SaleItem[] }
  const store = String(body.store ?? '').trim()
  if (!store) return NextResponse.json({ error: 'store required' }, { status: 400 })
  const hint = `store: ${canonicalStore(store)}`
  let items: SaleItem[] = []
  let validFrom = body.validFrom ?? ''
  let validTo = body.validTo ?? ''
  let pages = 0
  try {
    if (Array.isArray(body.images) && body.images.length) {
      const imgs = body.images.slice(0, 12).map(parseDataUrl).filter((x): x is NonNullable<typeof x> => !!x)
      if (!imgs.length) return NextResponse.json({ error: 'images must be data URLs (jpeg/png/webp/gif)' }, { status: 400 })
      for (const img of imgs) {
        const r = await salesFromImage(img, hint)
        items.push(...r.items)
        validFrom = validFrom || r.validFrom
        validTo = validTo || r.validTo
        pages++
      }
    } else if (body.text?.trim()) {
      const r = await salesFromText(body.text.trim(), hint)
      items = r.items; validFrom = validFrom || r.validFrom; validTo = validTo || r.validTo; pages = 1
    } else if (Array.isArray(body.items) && body.items.length) {
      items = body.items.filter((i) => i && i.name && i.price).map((i) => ({ name: String(i.name).toLowerCase(), price: String(i.price), unit: i.unit, category: i.category, brand: i.brand, note: i.note }))
      pages = 1
    } else {
      return NextResponse.json({ error: 'Send images, text, or items.' }, { status: 400 })
    }
    if (!items.length) return NextResponse.json({ ok: false, error: 'No sale items found on those pages.', pages }, { status: 422 })
    const saved = await saveStoreDeals(admin(), { store, region: body.region, validFrom, validTo, source: body.source ?? 'ad', items, pages })
    return NextResponse.json({ ok: true, ...saved, validFrom, validTo, pages, read: items.length })
  } catch (e) {
    console.error('[store-deals] failed', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
