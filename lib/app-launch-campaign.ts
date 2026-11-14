/**
 * App Store launch email (Sarah, Nov 14 2026: "send an email to all our current members full of excitement that we
 * got approved by apple and we would love them to try the app"). Apple approved DinnerDrop for iPhone on Nov 14.
 * To every member with an email who hasn't unsubscribed (internal addresses skipped). Sends once per address
 * (campaign_sends) and only while app_kv `campaign_app_launch` is { status: 'approved' }. Sent in chunks from
 * /api/admin/app-launch-send (one call sends what fits in its time budget; call again until left = 0).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const APP_LAUNCH = 'app-store-launch-2026-11-14'
export const APP_STORE_URL = 'https://apps.apple.com/app/id6824634810'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$|@camcomfginc\.com$)/i
export const APP_LAUNCH_SUBJECT = 'DinnerDrop is on the App Store 🎉'
export const APP_LAUNCH_PREVIEW = 'Your dinners, your grocery list, and a nudge at dinnertime, right on your iPhone.'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
type Rec = { email: string; userId: string; firstName?: string; unsubscribeUrl: string }

const store = `${APP_STORE_URL}?pt=dinnerdrop&ct=launch-email&mt=8`

export function appLaunchHtml(r: Pick<Rec, 'firstName' | 'unsubscribeUrl'>): string {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`
  const li = (b: string, t: string) => `<tr><td style="vertical-align:top;padding:0 10px 10px 0;font-size:18px;line-height:1.3">${b}</td><td style="padding:0 0 10px;font-size:15px;line-height:1.5">${t}</td></tr>`
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<span style="display:none;max-height:0;overflow:hidden">${esc(APP_LAUNCH_PREVIEW)}</span>
<div style="max-width:560px;margin:0 auto;padding:24px 18px">
${p(`Hi ${esc(r.firstName || 'there')},`)}
<p style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:bold;color:#1a5c38">We did it: DinnerDrop is on the App Store! 🎉</p>
${p('Apple approved our iPhone app this morning, and I couldn’t wait to tell you. You’re one of the families who helped get us here, so you’re hearing it first.')}
${p('Everything you already have in DinnerDrop is waiting in the app, plus a few things a phone does better:')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
${li('🔔', '<b>A dinnertime nudge.</b> Tonight’s dinner pops up at the time you pick, and one tap opens the recipe.')}
${li('🛒', '<b>Your grocery list in the store,</b> even with no signal. Check things off and it catches up when you’re back online.')}
${li('📸', '<b>Snap the fridge or a receipt</b> right from your camera.')}
${li('💬', '<b>Share a recipe or the week</b> with your family in a tap.')}
</table>
<p style="margin:6px 0 18px"><a href="${store}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:12px">Download on the App Store</a></p>
${p('Sign in with the same email you use now. We’ll email you a 6-digit code, and your dinners, list and settings are all there.')}
${p('If you like it, a quick rating on the App Store would mean the world. It’s the biggest way a small company like ours gets found by other busy families.')}
${p(`On Android? The app is coming. Until then, <a href="${APP}/dashboard?utm_source=email&amp;utm_medium=launch&amp;utm_campaign=${APP_LAUNCH}" style="color:#1a5c38">dinnerdrop.app</a> works great in your phone’s browser.`)}
${p('Thank you for being here from the start.')}
${p('Sarah<br>DinnerDrop')}
<p style="margin:24px 0 0;font-size:12px;color:#8a8577">You’re getting this because you have a DinnerDrop account. <a href="${r.unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
</div></body></html>`
}

export function appLaunchText(r: Pick<Rec, 'firstName' | 'unsubscribeUrl'>): string {
  return `Hi ${r.firstName || 'there'},

We did it: DinnerDrop is on the App Store!

Apple approved our iPhone app this morning, and I couldn't wait to tell you. You're one of the families who helped get us here, so you're hearing it first.

Everything you already have in DinnerDrop is waiting in the app, plus a few things a phone does better:
- A dinnertime nudge. Tonight's dinner pops up at the time you pick, and one tap opens the recipe.
- Your grocery list in the store, even with no signal. Check things off and it catches up when you're back online.
- Snap the fridge or a receipt right from your camera.
- Share a recipe or the week with your family in a tap.

Download on the App Store: ${store}

Sign in with the same email you use now. We'll email you a 6-digit code, and your dinners, list and settings are all there.

If you like it, a quick rating on the App Store would mean the world. It's the biggest way a small company like ours gets found by other busy families.

On Android? The app is coming. Until then, dinnerdrop.app works great in your phone's browser.

Thank you for being here from the start.

Sarah
DinnerDrop

Unsubscribe: ${r.unsubscribeUrl}`
}

const firstName = (full: string | null | undefined) => {
  const f = String(full ?? '').trim().split(/\s+/)[0] ?? ''
  return /^[A-Za-zÀ-ÿ'’-]{2,20}$/.test(f) ? f[0].toUpperCase() + f.slice(1) : undefined
}

export async function appLaunchRecipients(admin: SupabaseClient): Promise<Rec[]> {
  const out: Rec[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from('profiles').select('id, email, full_name, email_unsubscribed').range(from, from + 999)
    for (const p of data ?? []) {
      if (!p.email || p.email_unsubscribed || INTERNAL.test(p.email)) continue
      out.push({ email: p.email, userId: p.id, firstName: firstName(p.full_name), unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}` })
    }
    if (!data || data.length < 1000) break
  }
  const seen = new Set<string>()
  return out.filter((r) => { const k = r.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

export async function runAppLaunch(admin: SupabaseClient, opts: { budgetMs?: number; testTo?: string } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 240000
  if (!process.env.RESEND_API_KEY) return { status: 'no RESEND_API_KEY', sent: 0, failed: 0, left: 0 }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const send = (r: Rec) => resend.emails.send({
    from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email, subject: APP_LAUNCH_SUBJECT,
    html: appLaunchHtml(r), text: appLaunchText(r),
    headers: { 'List-Unsubscribe': `<${r.unsubscribeUrl.replace('/unsubscribe?', '/api/email/unsubscribe?')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  })
  if (opts.testTo) {
    const { error } = await send({ email: opts.testTo, userId: '', firstName: 'Sarah', unsubscribeUrl: `${APP}/unsubscribe` })
    return { status: error ? `test failed: ${error.message}` : 'test sent', sent: error ? 0 : 1, failed: error ? 1 : 0, left: 0 }
  }
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_app_launch').maybeSingle()
  if ((kv?.value as { status?: string } | null)?.status !== 'approved') return { status: 'not approved', sent: 0, failed: 0, left: 0 }
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', APP_LAUNCH)
  const doneSet = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  const recs = (await appLaunchRecipients(admin)).filter((r) => !doneSet.has(r.email.toLowerCase()))
  const report = { status: 'sending', sent: 0, failed: 0, left: recs.length }
  for (const r of recs) {
    if (Date.now() - started > budget) break
    const { error } = await send(r)
    if (error) { report.failed++; await new Promise((res) => setTimeout(res, 1100)); continue }
    await admin.from('campaign_sends').insert({ campaign: APP_LAUNCH, email: r.email.toLowerCase(), user_id: r.userId, variant: 'launch', sent_at: new Date().toISOString() })
    report.sent++
    report.left--
    await new Promise((res) => setTimeout(res, 300))
  }
  if (!report.left) report.status = 'done'
  return report
}
