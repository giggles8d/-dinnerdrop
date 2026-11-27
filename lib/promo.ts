/**
 * Promo codes → Family days with no card (profiles.family_until). Server-only.
 *   redeemPromo(admin, userId, code)  → { ok, until, days, label } | { ok:false, reason }
 * One code per account.
 *
 * Nov 22 2026 review, Sarah approved ("14 days of Family free for everyone, then ask for a card; no new 90-day
 * stacking offers"):
 *  - A code that gives more than PROMO_MAX_DAYS (14) is closed to NEW redemptions. It answers 'expired', so /start
 *    shows no promo banner and Settings says the code has ended. On Nov 22 that is every live code: EMEALS, OLLIE,
 *    MAPLE, MEALIME, FRUIT, NURSE, THANKYOU, WELCOMEBACK (90 days each), FRIENDS and FULLTABLE (730 days each).
 *  - A code of 14 days or less still works, and no longer stacks: it sets Family to at least that many days from
 *    today, never past it, and never shortens Family a family already has.
 *  - Nothing in promo_codes or promo_redemptions changes, and families who already redeemed a code keep their days.
 *  - LONG_CODES is the explicit allow-list of codes that keep their full length. Adding a code is a reviewed code change.
 *
 * Nov 27 2026, Sarah: FRIENDS (her own friends and family, max 25 uses) goes back to 730 days = 2 years of Family
 * free. It is the ONLY long code; every other code is still capped at 14 days (a longer one stays closed). Like every
 * code, FRIENDS doesn't stack: Family runs to today + 730 days, or longer if the family already has more.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { PROMO_MAX_DAYS } from '@/lib/offer-policy'

export const PROMO_RE = /^[A-Z0-9]{3,20}$/
export const PROMO_COOKIE = 'dd_promo'
/** The only codes allowed past the 14-day cap (Sarah, Nov 27 2026). */
export const LONG_CODES: readonly string[] = ['FRIENDS']
const LONG_CODE_SET: ReadonlySet<string> = new Set(LONG_CODES)

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

/** True when a code gives more free Family than the 14-day rule allows and isn't on LONG_CODES. */
export function promoTooLong(p: Pick<PromoRow, 'code' | 'family_days'>): boolean {
  return p.family_days > PROMO_MAX_DAYS && !LONG_CODE_SET.has(p.code)
}

/**
 * When Family ends after redeeming this code (ms). Family runs to the later of what the family has now and
 * today + the code's days; it never stacks and never shortens. A code over the cap that isn't on LONG_CODES is
 * capped here too, as a second guard behind promoState.
 */
export function promoUntilMs(p: Pick<PromoRow, 'code' | 'family_days'>, currentUntilMs: number, now: number): number {
  const days = LONG_CODE_SET.has(p.code) ? p.family_days : Math.min(p.family_days, PROMO_MAX_DAYS)
  return Math.max(currentUntilMs, now + days * 86400000)
}
export function promoState(p: PromoRow | null): 'ok' | 'invalid' | 'expired' | 'exhausted' {
  if (!p || !p.active) return 'invalid'
  if (p.expires_at && new Date(p.expires_at) < new Date()) return 'expired'
  if (promoTooLong(p)) return 'expired'
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

  // No stacking (Nov 22 2026): Family runs to the later of what they have now and today + the code's days.
  const now = Date.now()
  const current = prof?.family_until ? new Date(prof.family_until).getTime() : 0
  const untilMs = promoUntilMs(promo, current, now)
  const until = new Date(untilMs).toISOString().slice(0, 10)

  const { error } = await admin.from('promo_redemptions').insert({ user_id: userId, code: promo.code, family_until: until })
  if (error) return { ok: false, reason: 'already_redeemed' }
  if (untilMs > current) await admin.from('profiles').update({ family_until: until }).eq('id', userId)
  await admin.from('promo_codes').update({ redeemed: promo.redeemed + 1 }).eq('code', promo.code)
  return { ok: true, until, days: Math.max(0, Math.round((untilMs - Math.max(current, now)) / 86400000)), label: promo.label, code: promo.code }
}

export function untilLabel(until: string): string {
  return new Date(until + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
