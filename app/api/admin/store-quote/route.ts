import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'setzl1979@gmail.com'

async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const tok = request.headers.get('x-image-token')
  if (tok && tok.length >= 32) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
    if (data?.value && (data.value as { token?: string }).token === tok) return true
  }
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL
  } catch { return false }
}

/**
 * Per-store basket quotes, written by the Saturday price read (runs in Sarah's Chrome against
 * the family's Instacart list page, which already reflects each store's current/sale prices).
 *
 * GET ?email=            → the family's open list (name, quantity, unit) + their stores, so the reader knows what to price
 * POST { email, weekStart, quotes: [{ store, total, itemCount, missing: [names], items: [{name, price}] }] }
 */
export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = (new URL(request.url).searchParams.get('email') ?? ADMIN_EMAIL).toLowerCase()
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: prof } = await admin.from('profiles').select('id, settings').eq('email', email).single()
  if (!prof) return NextResponse.json({ error: 'No such user' }, { status: 404 })
  const { data: plan } = await admin.from('meal_plans').select('week_start').eq('user_id', prof.id).order('created_at', { ascending: false }).limit(1).single()
  const { data: rows } = await admin.from('list_items').select('name, quantity, unit, category').eq('user_id', prof.id).eq('week_start', plan?.week_start ?? '').eq('have', false).eq('checked', false)
  const stores = ((prof.settings as { stores?: { myStores?: Array<{ name: string }> } })?.stores?.myStores ?? []).map((s) => s.name)
  return NextResponse.json({ weekStart: plan?.week_start ?? null, items: rows ?? [], stores })
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { email?: string; weekStart?: string; quotes?: Array<{ store: string; total: number; itemCount?: number; missing?: string[]; items?: Array<{ name: string; price: number }> }> }
  const email = (body.email ?? ADMIN_EMAIL).toLowerCase()
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: prof } = await admin.from('profiles').select('id').eq('email', email).single()
  if (!prof) return NextResponse.json({ error: 'No such user' }, { status: 404 })
  const quotes = (body.quotes ?? []).filter((q) => q.store && Number(q.total) > 0)
  if (!quotes.length) return NextResponse.json({ error: 'quotes required' }, { status: 400 })
  const rows = quotes.map((q) => ({ user_id: prof.id, week_start: body.weekStart ?? null, store: q.store.slice(0, 40), total: Math.round(Number(q.total) * 100) / 100, item_count: q.itemCount ?? null, missing: q.missing ?? [], items: (q.items ?? []).slice(0, 200), source: 'instacart' }))
  const { error } = await admin.from('store_quotes').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, saved: rows.length })
}
