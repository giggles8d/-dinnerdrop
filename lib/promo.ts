/**
 * Promo codes → Family days with no card (profiles.family_until). Server-only.
 *   redeemPromo(admin, userId, code)  → { ok, until, days, label } | { ok:false, reason }
 * One code per account; days stack on top of any Family time already granted.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const PROMO_RE = /^[A-Z0-9]{3,20}$/
export const PROMO_COOKIE = 'dd_promo'

export interface PromoRow { code: string; label: string; family_days: number; max_redemptions: number | null; redeemed: number; expires_at: string | null; active: boolean }

export type RedeemResult =
  | { ok: true; until: string; days: number; label: string; code: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'exhausted' | 'already_redeemed' | 'has_subscription' }

export async function lookupPromo(admin: SupabaseClient, raw: string): Promise<PromoRow | null> {
  const code = String(raw ?? '').trim().toUpperCase()
  if (!PROMO_RE.test(code)) return null
  const { data } = await admin.from('promo_codes').select('*').eq('code', code).maybeSingle()
  return (data as PromoRow | null) ?? null
}

export function promoState(p: PromoRow | null): 'ok' | 'invalid' | 'expired' | 'exhausted' {
  if (!p || !p.active) return 'invalid'
  if (p.expires_at && new Date(p.expires_at) < new Date()) return 'expired'
  if (p.max_redemptions != null && p.redeemed >= p.max_redemptions) return 'exhausted'
  return 'ok'
}

export async function redeemPromo(admin: SupabaseClient, userId: string, raw: string): Promise<RedeemResult> {
  const promo = await lookupPromo(admin, raw)
  const state = promoState(promo)
  if (state !== 'ok' || !promo) return { ok: false, reason: state === 'ok' ? 'invalid' : state }

  const { data: prior } = await admin.from('promo_redemptions').select('code').eq('user_id', userId).maybeSingle()
  if (prior) return { ok: false, reason: 'already_redeemed' }

  const { data: prof } = await admin.from('profiles').select('subscription_status, family_until').eq('id', userId).single()
  if (prof?.subscription_status === 'active') return { ok: false, reason: 'has_subscription' }

  const base = prof?.family_until && new Date(prof.family_until) > new Date() ? new Date(prof.family_until) : new Date()
  const until = new Date(base.getTime() + promo.family_days * 86400000).toISOString().slice(0, 10)

  const { error } = await admin.from('promo_redemptions').insert({ user_id: userId, code: promo.code, family_until: until })
  if (error) return { ok: false, reason: 'already_redeemed' }
  await admin.from('profiles').update({ family_until: until }).eq('id', userId)
  await admin.from('promo_codes').update({ redeemed: promo.redeemed + 1 }).eq('code', promo.code)
  return { ok: true, until, days: promo.family_days, label: promo.label, code: promo.code }
}

export function untilLabel(until: string): string {
  return new Date(until + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
