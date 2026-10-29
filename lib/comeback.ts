/**
 * "Come back" email to the families who signed up before the Oct 16 relaunch (and the old waitlist),
 * with a thank-you offer (Sarah, Oct 29 2026): send your first order through Instacart from DinnerDrop
 * within 7 days AND upload the receipt → we send you a gift code worth 3 months of Family for a friend.
 *
 * Runs from the daily cron via /api/cron/campaigns only once app_kv `campaign_comeback` has
 * { status: 'approved' } (set after Sarah approves the copy). Sends once per address (campaign_sends),
 * then checks rewards every day for 8 days after each send.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { giftLink } from '@/lib/gifts'

export const COMEBACK = 'comeback-2026-10'
const RELAUNCH = '2026-10-16T00:00:00Z'
const FAMILY_YEAR_END = 'October 18, 2027'
export const WELCOME_CODE = 'WELCOMEBACK'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$)/i

export type Variant = 'year' | 'code'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const link = (path: string, c: string) => `${APP}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_medium=comeback&utm_campaign=${c}`

export function comebackSubject(v: Variant): string {
  return v === 'year' ? '🎉 Dinner’s handled (and your Family plan is free for a year)' : '🎉 Dinner’s handled — plus 3 months of Family, on us'
}

export function comebackHtml(opts: { variant: Variant; firstName?: string; unsubscribeUrl: string; deadline: string }): string {
  const { variant, firstName, unsubscribeUrl, deadline } = opts
  const cta = variant === 'year' ? link('/login', 'year') : link(`/start?code=${WELCOME_CODE}`, 'code')
  const offer = variant === 'year'
    ? `Even better: <strong>because you signed up early, the full Family plan is yours FREE until ${FAMILY_YEAR_END}.</strong> No card, nothing to cancel — just log in.`
    : `Even better: <strong>try the full Family plan FREE for 3 months with code ${WELCOME_CODE}</strong> — no card needed, nothing to cancel.`
  const feature = (emoji: string, title: string, body: string) => `
    <tr><td style="padding:0 0 18px">
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1f2a24">${emoji} ${title}</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#3d4a43">${body}</p>
    </td></tr>`
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f6f4ef;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<span style="display:none;max-height:0;overflow:hidden">5 dinners, one grocery list, one tap to Instacart — and the whole family gets a vote.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
  <tr><td style="background:#1a5c38;padding:22px 28px">
    <p style="margin:0;font-size:24px;font-weight:700;color:#e8a838">DinnerDrop</p>
    <p style="margin:4px 0 0;font-size:13px;color:#ffffff;opacity:.85">Dinner’s handled. Seriously.</p>
  </td></tr>
  <tr><td style="padding:26px 28px 6px">
    <p style="margin:0 0 14px;font-size:17px;line-height:1.5">Hi ${esc(firstName || 'there')}! 👋</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Remember signing up for DinnerDrop? We’ve been busy — and it’s finally everything we promised. ${offer}</p>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.6">Here’s what’s waiting for you:</p>
  </td></tr>
  <tr><td style="padding:12px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${feature('🍽️', '5 weeknight dinners, planned in seconds', 'Tell us who’s eating, your budget and anything to avoid — DinnerDrop picks 5 dinners your family will actually eat. Don’t love one? Swap it with a tap.')}
    ${feature('🛒', 'One tap → your groceries are in your Instacart cart', 'No more copying lists. Tap once and the whole week lands in your Instacart cart — in the amounts you’d actually buy (“1 can tomato paste,” not “2½ tbsp”). Shop Kroger? We push straight to your Kroger cart.')}
    ${feature('📱', 'The whole family gets a say — by text', 'DinnerDrop texts everyone this week’s dinner choices with photos. They vote by replying with numbers. Most votes wins — no more “I don’t like that” at 6 PM.')}
    ${feature('🧀', 'Out of something? Just text it.', 'Anyone in the family can text “add milk and Goldfish” — or snap a photo of the empty box — and it lands on the grocery list with their name on it.')}
    ${feature('⏰', '“Last call” before you order', 'About to check out? One tap texts everyone: “Ordering in 20 minutes — need anything?” Their replies go straight on the list.')}
    ${feature('👧', 'Everyone’s tastes, remembered', 'Picky kid? Set their “safe foods” and every dinner includes something they’ll eat. Allergies and won’t-eats are saved for each person.')}
    ${feature('🌿', 'Less waste, lower bills', 'Dinners are picked to share fresh ingredients, so Monday’s cilantro gets used up Wednesday. Snap your store’s weekly flyer and we plan around what’s on sale.')}
    ${feature('👩‍🍳', 'Plus…', 'Step-by-step cook mode, your own notes on any recipe (“double the garlic!”), one-tap “repeat last week,” and a cookware list for every dinner.')}
  </table></td></tr>
  <tr><td style="padding:4px 28px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e8;border:2px solid #e8a838;border-radius:12px"><tr><td style="padding:18px 20px">
      <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#1a5c38">🎁 Bonus: share the love</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#1f2a24">Send your <strong>first grocery order through Instacart from DinnerDrop by ${deadline}</strong>, then upload a copy of the receipt on your grocery list page — and we’ll email you a <strong>gift code for a friend: 3 months of the Family plan, free</strong>.</p>
    </td></tr></table>
  </td></tr>
  <tr><td align="center" style="padding:18px 28px 6px">
    <a href="${cta}" style="display:inline-block;background:#1a5c38;color:#ffffff;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;text-decoration:none">Plan my first week →</a>
    <p style="margin:12px 0 0;font-size:13px;color:#5b6660">Takes about 2 minutes. We think you’re going to love Tuesday nights again. 😄</p>
  </td></tr>
  <tr><td style="padding:18px 28px 8px">
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55">Sarah &amp; the DinnerDrop team</p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#3d4a43"><em>P.S. Know a family who’s always stuck on “what’s for dinner?” You can now <a href="${link('/gift', 'ps')}" style="color:#1a5c38">gift them DinnerDrop</a>.</em></p>
  </td></tr>
  <tr><td style="padding:16px 28px 24px;border-top:1px solid #e6e2d8">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8577">You’re getting this because you signed up at dinnerdrop.app. Gift offer: one gift code per family, for an order sent from DinnerDrop to Instacart and a receipt uploaded by ${deadline}. <a href="${unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
  </td></tr>
</table></td></tr></table></body></html>`
}

function rewardHtml(code: string, firstName?: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<div style="max-width:560px;margin:0 auto;padding:28px 20px"><div style="background:#fff;border-radius:14px;padding:26px;border:1px solid #e6e2d8">
<p style="font-size:22px;font-weight:700;margin:0 0 12px">🎁 Your gift for a friend</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 14px">Thanks for your first order${firstName ? `, ${esc(firstName)}` : ''}! As promised, here’s <strong>3 months of the DinnerDrop Family plan</strong> to give to a friend.</p>
<p style="font-size:15px;margin:0 0 6px">Gift code:</p>
<p style="display:inline-block;margin:0 0 16px;background:#fff8e8;border:2px solid #e8a838;border-radius:10px;padding:8px 16px;font-size:22px;font-weight:700;letter-spacing:.12em;color:#1a5c38">${code}</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 18px">Just send them this link — no card needed, nothing to cancel:<br><a href="${giftLink(code)}" style="color:#1a5c38">${giftLink(code)}</a></p>
<p style="font-size:14px;color:#5b6660;margin:0">Happy cooking! — Sarah</p>
</div></div></body></html>`
}

type Rec = { email: string; userId: string | null; firstName?: string; variant: Variant; unsubscribeUrl: string }

/** Who gets it: pre-relaunch signups + old waitlist, minus internal accounts and unsubscribes. */
export async function comebackRecipients(admin: SupabaseClient): Promise<Rec[]> {
  const out = new Map<string, Rec>()
  const { data: profs } = await admin.from('profiles').select('id, email, full_name, is_beta_member, email_unsubscribed, created_at').lt('created_at', RELAUNCH)
  for (const p of profs ?? []) {
    if (!p.email || p.email_unsubscribed || INTERNAL.test(p.email)) continue
    out.set(p.email.toLowerCase(), { email: p.email, userId: p.id, firstName: p.full_name ? String(p.full_name).split(' ')[0] : undefined, variant: p.is_beta_member ? 'year' : 'code', unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}` })
  }
  const { data: all } = await admin.from('profiles').select('email')
  const hasAccount = new Set((all ?? []).map((p) => String(p.email ?? '').toLowerCase()))
  const { data: wl } = await admin.from('waitlist').select('email')
  for (const w of wl ?? []) {
    const key = String(w.email ?? '').toLowerCase()
    if (!key || out.has(key) || hasAccount.has(key) || INTERNAL.test(key)) continue
    out.set(key, { email: w.email, userId: null, variant: 'code', unsubscribeUrl: `${APP}/unsubscribe?email=${encodeURIComponent(w.email)}` })
  }
  return Array.from(out.values())
}

const deadlineFor = (sent: Date) => new Date(sent.getTime() + 7 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })

/** Daily: send (once, after approval), then grant gift codes to families who met the offer. */
export async function runComeback(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 200000
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_comeback').maybeSingle()
  const status = (kv?.value as { status?: string } | null)?.status
  const report = { status: status ?? 'not approved', sent: 0, failed: 0, rewarded: 0 }
  if (status !== 'approved') return report
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)

  // 1) Send to anyone not yet sent.
  const recs = await comebackRecipients(admin)
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', COMEBACK)
  const sentSet = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  const deadline = deadlineFor(now)
  for (const r of recs) {
    if (sentSet.has(r.email.toLowerCase())) continue
    if (Date.now() - started > budget) break
    const { error } = await resend.emails.send({ from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email, subject: comebackSubject(r.variant), html: comebackHtml({ variant: r.variant, firstName: r.firstName, unsubscribeUrl: r.unsubscribeUrl, deadline }) })
    if (error) { report.failed++; continue }
    await admin.from('campaign_sends').insert({ campaign: COMEBACK, email: r.email.toLowerCase(), user_id: r.userId, variant: r.variant, sent_at: now.toISOString() })
    report.sent++
    await new Promise((res) => setTimeout(res, 260))
  }

  // 2) Rewards: an Instacart send + an uploaded receipt, both within 7 days of the email.
  const since = new Date(now.getTime() - 8 * 86400000).toISOString()
  const { data: open } = await admin.from('campaign_sends').select('email, user_id, sent_at').eq('campaign', COMEBACK).is('reward_code', null).gte('sent_at', since)
  for (const s of open ?? []) {
    let uid = s.user_id as string | null
    if (!uid) { const { data: p } = await admin.from('profiles').select('id').ilike('email', s.email).maybeSingle(); uid = p?.id ?? null }
    if (!uid) continue
    const end = new Date(new Date(s.sent_at).getTime() + 7 * 86400000).toISOString()
    const [{ data: hs }, { data: rc }] = await Promise.all([
      admin.from('grocery_handoffs').select('id').eq('user_id', uid).not('store', 'ilike', 'kroger%').gte('created_at', s.sent_at).lte('created_at', end).limit(1),
      admin.from('receipts').select('id').eq('user_id', uid).gte('created_at', s.sent_at).lte('created_at', end).limit(1),
    ])
    if (!hs?.length || !rc?.length) continue
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const code = 'GIFT' + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => abc[b % abc.length]).join('')
    const { data: prof } = await admin.from('profiles').select('full_name, email').eq('id', uid).single()
    const first = prof?.full_name ? String(prof.full_name).split(' ')[0] : undefined
    const { error } = await admin.from('gift_cards').insert({ code, months: 3, family_days: 92, amount_cents: 0, stripe_session_id: `reward:${COMEBACK}:${uid}`, buyer_name: first ?? 'A DinnerDrop family', buyer_email: prof?.email ?? s.email, message: 'A thank-you gift from DinnerDrop' })
    if (error) continue   // already granted (unique session id)
    await admin.from('campaign_sends').update({ reward_code: code, rewarded_at: now.toISOString(), user_id: uid }).eq('campaign', COMEBACK).eq('email', s.email)
    await resend.emails.send({ from: FROM, reply_to: 'sarah@dinnerdrop.app', to: prof?.email ?? s.email, subject: '🎁 Your gift for a friend — 3 months of DinnerDrop', html: rewardHtml(code, first) })
    report.rewarded++
  }
  return report
}
