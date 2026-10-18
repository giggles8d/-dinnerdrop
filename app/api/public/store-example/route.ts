import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 1800

const EXAMPLE_EMAIL = 'setzl1979@gmail.com'   // the founder's household — the public "real example" on / and /start

/**
 * Public, anonymized: the latest week's per-store basket totals read from Instacart for the example
 * household, so the marketing pages can show real numbers that refresh every Sunday.
 */
export async function GET() {
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: prof } = await admin.from('profiles').select('id').eq('email', EXAMPLE_EMAIL).single()
    if (!prof) return NextResponse.json({ quotes: [] })
    const { data } = await admin.from('store_quotes').select('store, total, item_count, missing, week_start, created_at').eq('user_id', prof.id).order('created_at', { ascending: false }).limit(40)
    if (!data?.length) return NextResponse.json({ quotes: [] })
    // Newest read per store, from the newest batch only (same hour as the newest row).
    const newest = new Date(data[0].created_at).getTime()
    const seen = new Set<string>()
    const quotes = data
      .filter((r) => newest - new Date(r.created_at).getTime() < 6 * 3600 * 1000)
      .filter((r) => { const k = r.store.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
      .map((r) => ({ store: r.store, total: Number(r.total), itemCount: r.item_count, swaps: Array.isArray(r.missing) ? r.missing.length : 0 }))
      .sort((a, b) => a.total - b.total)
    return NextResponse.json({ readAt: data[0].created_at, weekStart: data[0].week_start, itemCount: Math.max(...quotes.map((q) => q.itemCount ?? 0)), quotes }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' } })
  } catch {
    return NextResponse.json({ quotes: [] })
  }
}
