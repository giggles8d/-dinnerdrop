/**
 * Kroger sign-in tokens live in their own server-only table (migration 042, Nov 21 2026 review): RLS on with no
 * policies, no grants to signed-in users, so they can never be read by a browser — not even a partner's, which the
 * old profiles columns allowed. Only routes using the service key read or write them.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface KrogerTokens { access_token: string | null; refresh_token: string | null; expires_at: string | null }

export function serviceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function getKrogerTokens(admin: SupabaseClient, userId: string): Promise<KrogerTokens | null> {
  const { data } = await admin.from('kroger_tokens').select('access_token, refresh_token, expires_at').eq('user_id', userId).maybeSingle()
  return (data as KrogerTokens | null) ?? null
}

export async function saveKrogerTokens(admin: SupabaseClient, userId: string, t: { access_token: string; refresh_token: string; expires_in: number }): Promise<void> {
  const expires_at = new Date(Date.now() + t.expires_in * 1000).toISOString()
  const { error } = await admin.from('kroger_tokens').upsert({ user_id: userId, access_token: t.access_token, refresh_token: t.refresh_token, expires_at, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export function krogerConnected(t: KrogerTokens | null): boolean {
  if (!t?.access_token) return false
  const fresh = !t.expires_at || new Date(t.expires_at) > new Date()
  return fresh || !!t.refresh_token
}
