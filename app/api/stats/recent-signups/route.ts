import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // cache 60s server-side

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [betaCount, recent24h, recent7d] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_beta_member', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    ])

    return NextResponse.json({
      betaMembers: betaCount.count ?? 0,
      newLast24h: recent24h.count ?? 0,
      newLast7d: recent7d.count ?? 0,
    })
  } catch (e) {
    console.error('recent-signups error:', e)
    return NextResponse.json({ betaMembers: 0, newLast24h: 0, newLast7d: 0 }, { status: 200 })
  }
}
