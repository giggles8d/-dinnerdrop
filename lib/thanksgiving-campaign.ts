/**
 * "Thanksgiving week, handled" — one-time email to every family (not unsubscribed) when the
 * Thanksgiving-week collection comes into season. Runs from /api/cron/campaigns once app_kv
 * `campaign_thanksgiving` = { status: 'approved', sendOn: 'YYYY-MM-DD' } (ET date) and sends once per address.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { collectionBySlug } from '@/lib/collections'

export const THANKSGIVING = 'thanksgiving-2026'
const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah from DinnerDrop <sarah@dinnerdrop.app>'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979(\+[^@]*)?@gmail\.com$)/i
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const link = (path: string, c: string) => `${APP}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_medium=campaign&utm_campaign=thanksgiving-${c}`

export type Featured = { name: string; slug: string; image_url: string | null; minutes: number; cost: number }

/** Three photographed, most-kept dinners from the Thanksgiving-week collection. */
export async function thanksgivingFeatured(admin: SupabaseClient, n = 3): Promise<Featured[]> {
  const c = collectionBySlug('thanksgiving')
  if (!c) return []
  const { data } = await admin.from('recipes').select('name, slug, image_url, cook_time, prep_time, estimated_cost, tags, cuisine, kept_count').eq('is_public', true).not('image_url', 'is', null).order('kept_count', { ascending: false }).limit(1000)
  const rows = (data ?? []).filter((r) => c.match({ name: r.name, tags: r.tags ?? [], cuisine: r.cuisine ?? undefined }))
  // Prefer variety: one turkey main, one side-ish, one leftovers idea where possible.
  const pick = (re: RegExp) => rows.find((r) => re.test(r.name) && !out.includes(r))
  const out: typeof rows = []
  for (const re of [/turkey (breast|cutlet|tenderloin)/i, /(sweet potato|green bean|brussels|butternut|acorn|stuffing|mashed)/i, /(leftover|turkey (fried rice|pot pie|tetrazzini|sandwich))/i]) { const r = pick(re); if (r) out.push(r) }
  for (const r of rows) { if (out.length >= n) break; if (!out.includes(r)) out.push(r) }
  return out.slice(0, n).map((r) => ({ name: r.name, slug: r.slug, image_url: r.image_url, minutes: (r.cook_time ?? 0) + (r.prep_time ?? 0), cost: Number(r.estimated_cost ?? 0) }))
}

export function thanksgivingSubject(): string { return 'Thanksgiving week, handled 🦃 (no whole bird required)' }

export function thanksgivingHtml(opts: { firstName?: string; featured: Featured[]; count: number; unsubscribeUrl: string }): string {
  const { firstName, featured, count, unsubscribeUrl } = opts
  const cards = featured.map((f) => `
    <td width="33%" style="padding:0 6px;vertical-align:top">
      <a href="${link(`/recipes/${f.slug}`, 'recipe')}" style="text-decoration:none;color:#1f2a24">
        ${f.image_url ? `<img src="${f.image_url}" width="160" alt="" style="display:block;width:100%;height:110px;object-fit:cover;border-radius:10px;background:#eee">` : ''}
        <p style="margin:8px 0 2px;font-size:14px;font-weight:700;line-height:1.3">${esc(f.name)}</p>
        <p style="margin:0;font-size:12px;color:#5b6660">${f.minutes ? `${f.minutes} min` : ''}${f.cost > 0 ? ` · ~$${f.cost.toFixed(0)}` : ''}</p>
      </a>
    </td>`).join('')
  return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e6e2d8">
  <tr><td style="padding:24px 28px 6px">
    <p style="margin:0 0 14px;font-weight:700;color:#1a5c38;font-size:13px;letter-spacing:.08em;text-transform:uppercase">DinnerDrop</p>
    <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25">Thanksgiving week, handled 🦃</h1>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#3d4a43">Hi ${esc(firstName || 'there')} — the big dinner is one night. The other six still need to happen, and that's the week nobody plans for.</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#3d4a43">So we built a <strong>Thanksgiving-week collection</strong>: ${count} dinners that taste like the holiday without a whole bird — turkey cutlets and tenderloins in 25 minutes, sides that travel, and what to do with the leftovers on Friday. Every one goes on your weekly plan and into your Instacart cart in one tap.</p>
  </td></tr>
  <tr><td style="padding:14px 22px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cards}</tr></table></td></tr>
  <tr><td align="center" style="padding:18px 28px 6px">
    <a href="${link('/recipes/collections/thanksgiving', 'cta')}" style="display:inline-block;background:#1a5c38;color:#ffffff;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;text-decoration:none">See Thanksgiving week →</a>
    <p style="margin:12px 0 0;font-size:13px;color:#5b6660">Heart the ones you like and they'll rotate into your week. Hosting? Set the servings on any dinner and the list scales.</p>
  </td></tr>
  <tr><td style="padding:14px 28px 8px">
    <p style="margin:0;font-size:14px;line-height:1.55;color:#3d4a43"><em>P.S. Cooking for someone else's table this year? <a href="${link('/gift', 'ps')}" style="color:#1a5c38">Gift them DinnerDrop</a> — a few months of planned weeknights is a good thank-you.</em></p>
    <p style="margin:12px 0 0;font-size:15px">Sarah &amp; the DinnerDrop team</p>
  </td></tr>
  <tr><td style="padding:16px 28px 22px;border-top:1px solid #e6e2d8">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8577">You're getting this because you signed up at dinnerdrop.app. <a href="${unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
  </td></tr>
</table></td></tr></table></body></html>`
}

type Rec = { email: string; userId: string; firstName?: string; unsubscribeUrl: string }

export async function thanksgivingRecipients(admin: SupabaseClient): Promise<Rec[]> {
  const out = new Map<string, Rec>()
  const { data: profs } = await admin.from('profiles').select('id, email, full_name, email_unsubscribed')
  for (const p of profs ?? []) {
    if (!p.email || p.email_unsubscribed || INTERNAL.test(p.email)) continue
    out.set(p.email.toLowerCase(), { email: p.email, userId: p.id, firstName: p.full_name ? String(p.full_name).split(' ')[0] : undefined, unsubscribeUrl: `${APP}/unsubscribe?uid=${p.id}` })
  }
  return Array.from(out.values())
}

const etDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) // YYYY-MM-DD

/** Daily: send once, on/after sendOn (ET), after approval. */
export async function runThanksgiving(admin: SupabaseClient, now = new Date(), opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const budget = opts.budgetMs ?? 200000
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'campaign_thanksgiving').maybeSingle()
  const v = (kv?.value as { status?: string; sendOn?: string } | null) ?? {}
  const report = { status: v.status ?? 'not approved', sendOn: v.sendOn ?? null, sent: 0, failed: 0, skipped: 0 }
  if (v.status !== 'approved') return report
  if (v.sendOn && etDate(now) < v.sendOn) return { ...report, status: `waiting for ${v.sendOn}` }
  if (!process.env.RESEND_API_KEY) return { ...report, status: 'no RESEND_API_KEY' }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const featured = await thanksgivingFeatured(admin)
  const c = collectionBySlug('thanksgiving')
  const { data: all } = await admin.from('recipes').select('name, tags, cuisine').eq('is_public', true).limit(5000)
  const count = c ? (all ?? []).filter((r) => c.match({ name: r.name, tags: r.tags ?? [], cuisine: r.cuisine ?? undefined })).length : 0
  const recs = await thanksgivingRecipients(admin)
  const { data: done } = await admin.from('campaign_sends').select('email').eq('campaign', THANKSGIVING)
  const sentSet = new Set((done ?? []).map((d) => String(d.email).toLowerCase()))
  for (const r of recs) {
    if (sentSet.has(r.email.toLowerCase())) { report.skipped++; continue }
    if (Date.now() - started > budget) break
    const { error } = await resend.emails.send({ from: FROM, reply_to: 'sarah@dinnerdrop.app', to: r.email, subject: thanksgivingSubject(), html: thanksgivingHtml({ firstName: r.firstName, featured, count, unsubscribeUrl: r.unsubscribeUrl }) })
    if (error) { report.failed++; continue }
    await admin.from('campaign_sends').insert({ campaign: THANKSGIVING, email: r.email.toLowerCase(), user_id: r.userId, variant: 'all', sent_at: now.toISOString() })
    report.sent++
    await new Promise((res) => setTimeout(res, 260))
  }
  return report
}
