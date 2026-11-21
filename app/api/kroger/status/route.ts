import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { serviceClient, getKrogerTokens, krogerConnected } from '@/lib/kroger-tokens'

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
  return NextResponse.json({ connected: krogerConnected(await getKrogerTokens(serviceClient(), user.id)) })
}
