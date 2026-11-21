import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET → { connected } for the signed-in user's Kroger account (Nov 21 2026 review).
 * Kroger access tokens last 30 minutes; add-to-cart refreshes them with the refresh token, so a family is
 * connected while either is usable. Tokens stay on the server — the page only gets yes/no.
 */
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })
  const { data: p } = await supabase.from('profiles').select('kroger_access_token, kroger_refresh_token, kroger_token_expires_at').eq('id', user.id).single()
  const fresh = !!p?.kroger_access_token && (!p.kroger_token_expires_at || new Date(p.kroger_token_expires_at) > new Date())
  return NextResponse.json({ connected: fresh || !!(p?.kroger_access_token && p?.kroger_refresh_token) })
}
