/**
 * Gift subscriptions (Sarah, Oct 29 2026 — eMeals sells these; ours lands before the holidays).
 * Buy: Stripe Checkout, one-time payment (no webhook needed — the thank-you page and the daily job
 * both turn a paid session into a gift, idempotently). Redeem: the GIFT code works exactly like a promo
 * code (?code= on /start → applied on the first dashboard load) and adds Family days to family_until.
 * Server-only.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { emailShell, sendEmail } from '@/lib/notify'
import type { RedeemResult } from '@/lib/promo'

export type GiftPlanId = '3' | '6' | '12'
export const GIFT_PLANS: Record<GiftPlanId, { months: number; days: number; cents: number; label: string; note: string }> = {
  '3': { months: 3, days: 92, cents: 1497, label: '3 months', note: 'Same as 3 months of Family' },
  '6': { months: 6, days: 183, cents: 2499, label: '6 months', note: 'Save $5' },
  '12': { months: 12, days: 365, cents: 3900, label: '1 year', note: 'Best value — same as a Family year' },
}

const APP = 'https://www.dinnerdrop.app'
export const giftLink = (code: string) => `${APP}/start?code=${code}&utm_source=gift&utm_medium=link`
export const isGiftCode = (code: string) => /^GIFT[A-Z0-9]{6,12}$/.test(code)

function newCode(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return 'GIFT' + Array.from(bytes, (b) => abc[b % abc.length]).join('')
}

export interface GiftRow {
  code: string; months: number; family_days: number; amount_cents: number; stripe_session_id: string
  buyer_name: string | null; buyer_email: string | null; recipient_name: string | null; recipient_email: string | null; message: string | null
  emailed_recipient_at: string | null; emailed_buyer_at: string | null; redeemed_by: string | null; redeemed_at: string | null
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Paid Checkout session → gift (created once), plus the buyer's receipt and, if asked, the recipient's email. */
export async function giftFromSession(admin: SupabaseClient, session: Stripe.Checkout.Session): Promise<GiftRow | null> {
  const md = session.metadata ?? {}
  if (md.kind !== 'gift' || session.payment_status !== 'paid') return null
  const plan = GIFT_PLANS[(md.plan as GiftPlanId) ?? '3'] ?? GIFT_PLANS['3']
  const { data: existing } = await admin.from('gift_cards').select('*').eq('stripe_session_id', session.id).maybeSingle()
  let gift = existing as GiftRow | null
  if (!gift) {
    const row = {
      code: newCode(), months: plan.months, family_days: plan.days, amount_cents: session.amount_total ?? plan.cents, stripe_session_id: session.id,
      buyer_name: md.buyer_name || null, buyer_email: session.customer_details?.email || session.customer_email || null,
      recipient_name: md.recipient_name || null, recipient_email: md.recipient_email || null, message: md.message || null,
    }
    const { data, error } = await admin.from('gift_cards').insert(row).select('*').single()
    if (error) {
      // Lost a race with the other path (thank-you page vs daily job): read the winner.
      const { data: again } = await admin.from('gift_cards').select('*').eq('stripe_session_id', session.id).maybeSingle()
      gift = again as GiftRow | null
    } else gift = data as GiftRow
  }
  if (!gift) return null

  const from = gift.buyer_name || 'Someone who loves you'
  const to = gift.recipient_name || 'there'
  const length = GIFT_PLANS[String(gift.months) as GiftPlanId]?.label ?? `${gift.months} months`
  if (gift.recipient_email && md.deliver === 'now' && !gift.emailed_recipient_at) {
    const body = `<p>Hi ${esc(to)},</p><p><strong>${esc(from)}</strong> gave your family <strong>${length} of DinnerDrop Family</strong> — 5 dinners planned for your family and budget every week, one grocery list, and one tap to your Instacart cart.</p>${gift.message ? `<blockquote style="margin:14px 0;padding:10px 14px;border-left:3px solid #e8a838;background:#fff8e8">${esc(gift.message)}</blockquote>` : ''}<p>Your gift code: <strong style="font-size:18px;letter-spacing:.06em">${gift.code}</strong><br><span style="color:#5b6660;font-size:13px">No card needed. It starts when you sign up.</span></p>`
    const r = await sendEmail(gift.recipient_email, `${from} gave you ${length} of DinnerDrop 🎁`, emailShell(`A gift for your dinner table 🎁`, body, { label: 'Claim my gift', href: giftLink(gift.code) }))
    if (r.ok) await admin.from('gift_cards').update({ emailed_recipient_at: new Date().toISOString() }).eq('code', gift.code)
  }
  if (gift.buyer_email && !gift.emailed_buyer_at) {
    const sent = gift.recipient_email && md.deliver === 'now'
    const body = `<p>Thank you${gift.buyer_name ? `, ${esc(gift.buyer_name)}` : ''}! Your gift of <strong>${length} of DinnerDrop Family</strong>${gift.recipient_name ? ` for <strong>${esc(gift.recipient_name)}</strong>` : ''} is ready.</p><p>Gift code: <strong style="font-size:18px;letter-spacing:.06em">${gift.code}</strong></p><p>${sent ? `We emailed it to ${esc(gift.recipient_email!)}. You can also share this link:` : 'Share this link (or print the card from the thank-you page):'}<br><a href="${giftLink(gift.code)}">${giftLink(gift.code)}</a></p><p style="color:#5b6660;font-size:13px">It starts when they sign up — no card needed, nothing to cancel. Questions? Just reply.</p>`
    const r = await sendEmail(gift.buyer_email, `Your DinnerDrop gift is ready — code ${gift.code}`, emailShell('Your gift is ready 🎁', body, { label: 'See the gift card', href: `${APP}/gift/thanks?session_id=${session.id}` }))
    if (r.ok) await admin.from('gift_cards').update({ emailed_buyer_at: new Date().toISOString() }).eq('code', gift.code)
  }
  return gift
}

export async function lookupGift(admin: SupabaseClient, code: string): Promise<GiftRow | null> {
  if (!isGiftCode(code)) return null
  const { data } = await admin.from('gift_cards').select('*').eq('code', code).maybeSingle()
  return (data as GiftRow | null) ?? null
}

/** Redeem a gift for a family: adds its days to family_until. Gifts don't count against the one-promo-per-account rule. */
export async function redeemGift(admin: SupabaseClient, userId: string, code: string): Promise<RedeemResult> {
  const gift = await lookupGift(admin, code)
  if (!gift) return { ok: false, reason: 'invalid' }
  if (gift.redeemed_by && gift.redeemed_by !== userId) return { ok: false, reason: 'exhausted' }
  if (gift.redeemed_by === userId) return { ok: false, reason: 'already_redeemed' }
  const { data: prof } = await admin.from('profiles').select('subscription_status, family_until').eq('id', userId).single()
  if (prof?.subscription_status === 'active') return { ok: false, reason: 'has_subscription' }
  // Claim it first (only if still unclaimed), so two accounts can't both use one code.
  const { data: claimed } = await admin.from('gift_cards').update({ redeemed_by: userId, redeemed_at: new Date().toISOString() }).eq('code', gift.code).is('redeemed_by', null).select('code')
  if (!claimed?.length) return { ok: false, reason: 'exhausted' }
  const base = prof?.family_until && new Date(prof.family_until) > new Date() ? new Date(prof.family_until) : new Date()
  const until = new Date(base.getTime() + gift.family_days * 86400000).toISOString().slice(0, 10)
  await admin.from('profiles').update({ family_until: until }).eq('id', userId)
  return { ok: true, until, days: gift.family_days, label: gift.buyer_name ? `Gift from ${gift.buyer_name}` : 'Gift', code: gift.code }
}

/** Daily safety net: paid gift checkouts from the last 3 days that never reached the thank-you page. */
export async function reconcileGifts(admin: SupabaseClient, stripe: Stripe): Promise<{ checked: number; created: number }> {
  const since = Math.floor(Date.now() / 1000) - 3 * 86400
  const list = await stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 })
  let checked = 0, created = 0
  for (const s of list.data) {
    if (s.metadata?.kind !== 'gift' || s.payment_status !== 'paid') continue
    checked++
    const { data: had } = await admin.from('gift_cards').select('code').eq('stripe_session_id', s.id).maybeSingle()
    if (!had && (await giftFromSession(admin, s))) created++
  }
  return { checked, created }
}
