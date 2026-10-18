import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { currentSales, salesFromImage, salesFromText, salesFromUrl, saveSales, type SaleItem } from '@/lib/sales'

export const maxDuration = 60

/**
 * GET  /api/sales            → this week's sales sets for the planner (owner's, shared with partners)
 * POST /api/sales            → import: { images: [dataUrl,...] } | { url } | { text }, optional { store }
 * DELETE /api/sales?id=…     → remove a set
 */
export async function GET() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  const sets = await currentSales(admin, ownerId)
  // Real per-store basket quotes (from the Saturday price read), newest per store, last 7 days.
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: q } = await admin.from('store_quotes').select('store, total, item_count, missing, items, week_start, created_at').eq('user_id', ownerId).gte('created_at', since).order('created_at', { ascending: false }).limit(40)
  const seen = new Set<string>()
  const quotes = (q ?? []).filter((r) => { const k = r.store.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
  return NextResponse.json({ sets, quotes })
}

export async function POST(req: NextRequest) {
  try {
    const auth = createServerSupabaseClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => ({})) as { images?: string[]; url?: string; text?: string; store?: string }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { ownerId, householdId } = await resolvePlanOwner(admin, user.id)
    const { data: prof } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
    const addedBy = (prof?.full_name || '').split(' ')[0] || null

    let store = (body.store ?? '').trim(), validFrom = '', validTo = ''
    let items: SaleItem[] = []
    let source = 'text'
    let note = ''

    if (Array.isArray(body.images) && body.images.length) {
      source = 'photo'
      for (const dataUrl of body.images.slice(0, 6)) {
        const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/i.exec(dataUrl)
        if (!m) continue
        const r = await salesFromImage({ base64: m[2], mediaType: m[1].toLowerCase() as 'image/jpeg' }, store ? `store: ${store}` : '')
        store = store || r.store; validFrom = validFrom || r.validFrom; validTo = validTo || r.validTo
        items.push(...r.items)
      }
    } else if (body.url?.trim()) {
      source = 'link'
      const r = await salesFromUrl(body.url.trim())
      store = store || r.store || new URL(body.url.trim()).hostname.replace(/^www\./, '').split('.')[0]
      validFrom = r.validFrom; validTo = r.validTo; items = r.items
      if (!items.length) note = r.pageText < 400
        ? 'That page is built with scripts, so there was no readable ad text behind the link. Snap a photo of the flyer (or screenshots of the ad pages) and send those instead.'
        : 'I could read the page but found no sale items on it. Try the printable or PDF version of the ad, or photos of it.'
    } else if (body.text?.trim()) {
      const r = await salesFromText(body.text.trim(), store ? `store: ${store}` : '')
      store = store || r.store; validFrom = r.validFrom; validTo = r.validTo; items = r.items
    } else {
      return NextResponse.json({ error: 'Send images, a url, or text.' }, { status: 400 })
    }

    if (!items.length) return NextResponse.json({ ok: false, items: [], note: note || 'No sale items found.' })
    const saved = await saveSales(admin, { userId: ownerId, householdId, store, validFrom, validTo, source, items, addedBy: addedBy ?? undefined })
    return NextResponse.json({ ok: true, id: saved.id, store, validFrom, validTo, count: saved.items.length, merged: saved.merged, items: saved.items })
  } catch (e) {
    console.error('sales import failed', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Import failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id)
  await admin.from('weekly_sales').delete().eq('id', id).eq('user_id', ownerId)
  return NextResponse.json({ ok: true })
}
