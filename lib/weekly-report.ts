/**
 * Monday checkout report for Sarah: of the families who sent a list to a store last week,
 * how many actually checked out? Uses what we can see ourselves — the day-after follow-up
 * answers, receipts and reported totals — and points to Impact for the paid-order count
 * (Impact posts actions 1–2 days after delivery and has no API we can read).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { emailShell, sendEmail } from '@/lib/notify'

const REPORT_TO = process.env.REPORT_EMAIL || 'sarah@dinnerdrop.app'
const INTERNAL = /(@dinnerdrop\.app$|^setzl1979@gmail\.com$)/i

type Handoff = { id: string; user_id: string; store: string | null; est_total: number | null; actual_total: number | null; feedback: string | null; created_at: string }

export async function weeklyCheckoutNumbers(db: SupabaseClient, now = new Date()) {
  const since = new Date(now.getTime() - 7 * 86400000).toISOString()
  const [{ data: hs }, { data: rc }, { data: profs }, { count: signups }] = await Promise.all([
    db.from('grocery_handoffs').select('id, user_id, store, est_total, actual_total, feedback, created_at').gte('created_at', since),
    db.from('receipts').select('user_id, handoff_id, total, created_at').gte('created_at', since),
    db.from('profiles').select('id, email, created_at, signup_source'),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ])
  const internal = new Set((profs ?? []).filter((p) => INTERNAL.test(p.email ?? '')).map((p) => p.id))
  const handoffs = ((hs ?? []) as Handoff[]).filter((h) => !internal.has(h.user_id))
  const receipts = (rc ?? []).filter((r) => !internal.has(r.user_id))
  const families = new Set(handoffs.map((h) => h.user_id))
  const answers: Record<string, number> = { ordered: 0, pricey: 0, missing: 0, not_yet: 0 }
  for (const h of handoffs) if (h.feedback && h.feedback in answers) answers[h.feedback]++
  const receiptUsers = new Set(receipts.map((r) => r.user_id))
  // A family "checked out" if they told us (ordered/pricey/missing), sent a receipt, or reported a total.
  const confirmed = new Set<string>()
  for (const h of handoffs) if (h.actual_total != null || (h.feedback && h.feedback !== 'not_yet')) confirmed.add(h.user_id)
  receiptUsers.forEach((u) => { if (families.has(u)) confirmed.add(u) })
  const noAnswer = new Set(handoffs.filter((h) => !h.feedback).map((h) => h.user_id))
  confirmed.forEach((u) => noAnswer.delete(u))
  const est = handoffs.reduce((n, h) => n + (Number(h.est_total) || 0), 0)
  const actual = handoffs.reduce((n, h) => n + (Number(h.actual_total) || 0), 0)
  // Signups and list-senders by where they came from (profiles.signup_source, recorded at signup).
  const label = (p: { signup_source?: { s?: string; c?: string } | null }) => {
    const ss = p.signup_source
    if (!ss?.s) return 'unknown (before tracking / direct)'
    return ss.c ? `${ss.s} · ${ss.c}` : ss.s
  }
  const recent = (profs ?? []).filter((p) => !internal.has(p.id) && p.created_at >= since)
  const byId = new Map((profs ?? []).map((p) => [p.id, p]))
  const sources: Record<string, { signups: number; sent: number }> = {}
  for (const p of recent) { const k = label(p); sources[k] = sources[k] ?? { signups: 0, sent: 0 }; sources[k].signups++ }
  families.forEach((u) => { const p = byId.get(u); if (!p) return; const k = label(p); sources[k] = sources[k] ?? { signups: 0, sent: 0 }; sources[k].sent++ })
  // Week two (Sarah approved Nov 22 2026, week-two cart check): of families whose first-ever send was 8–14 days ago,
  // how many sent again 4+ days later (a new week, not a re-send the same trip)? Plus the same for the last 4 weeks,
  // which is steadier at this size. Online carts and lists taken to the store counted separately.
  const { data: allH } = await db.from('grocery_handoffs').select('user_id, store, created_at').order('created_at', { ascending: true })
  const firstAt = new Map<string, number>()
  const later = new Map<string, { cart: boolean; store: boolean }>()
  for (const h of allH ?? []) {
    if (internal.has(h.user_id)) continue
    const t = Date.parse(h.created_at)
    const f = firstAt.get(h.user_id)
    if (f == null) { firstAt.set(h.user_id, t); continue }
    if (t - f < 4 * 86400000) continue
    const l = later.get(h.user_id) ?? { cart: false, store: false }
    if (h.store === 'In store') l.store = true; else l.cart = true
    later.set(h.user_id, l)
  }
  const repeat = (fromDays: number, toDays: number) => {
    const lo = now.getTime() - toDays * 86400000, hi = now.getTime() - fromDays * 86400000
    let families = 0, cart = 0, store = 0, any = 0
    firstAt.forEach((t, u) => {
      if (t < lo || t > hi) return
      families++
      const l = later.get(u)
      if (l) { any++; if (l.cart) cart++; if (l.store) store++ }
    })
    return { families, any, cart, store }
  }
  const { count: listOpens } = await db.from('activation_events').select('id', { count: 'exact', head: true }).eq('step', 'list_link_open').gte('created_at', since)
  return {
    weekTwo: repeat(8, 14),
    weekTwo4w: repeat(8, 35),
    listOpens: listOpens ?? 0,
    sources,
    signups: signups ?? 0,
    sends: handoffs.length,
    families: families.size,
    confirmed: confirmed.size,
    notYet: new Set(handoffs.filter((h) => h.feedback === 'not_yet').map((h) => h.user_id)).size,
    noAnswer: noAnswer.size,
    answers,
    receipts: receipts.length,
    estTotal: Math.round(est),
    actualReported: Math.round(actual),
  }
}

/** Sends on Mondays only (called from the daily cron). */
export async function runWeeklyReport(db: SupabaseClient, now = new Date()) {
  if (now.getUTCDay() !== 1) return { skipped: 'not Monday' }
  const n = await weeklyCheckoutNumbers(db, now)
  const pct = n.families ? Math.round((n.confirmed / n.families) * 100) : 0
  const row = (k: string, v: string | number) => `<tr><td style="padding:4px 12px 4px 0;color:#5b6660">${k}</td><td style="padding:4px 0;font-weight:600">${v}</td></tr>`
  const body = `<table style="border-collapse:collapse;font-size:15px">
${row('New signups', n.signups)}
${row('Came back for week two', `${n.weekTwo.any} of ${n.weekTwo.families} families whose first send was 8–14 days ago (cart ${n.weekTwo.cart} · store list ${n.weekTwo.store})`)}
${row('Week two, last 4 weeks', `${n.weekTwo4w.any} of ${n.weekTwo4w.families} families`)}
${row('No-sign-in list opened', `${n.listOpens} times (not counted as sends)`)}
${row('Lists sent to a store', `${n.sends} (from ${n.families} families)`)}
${row('Confirmed checked out', `${n.confirmed} of ${n.families} families (${pct}%)`)}
${row('Said "not yet"', n.notYet)}
${row('No answer yet', n.noAnswer)}
${row('Follow-up answers', `ordered ${n.answers.ordered} · pricey ${n.answers.pricey} · missing/wrong ${n.answers.missing} · not yet ${n.answers.not_yet}`)}
${row('Receipts uploaded', n.receipts)}
${row('Estimated value of lists sent', `$${n.estTotal}`)}
${row('Real totals reported', n.actualReported ? `$${n.actualReported}` : '—')}
</table>
${Object.keys(n.sources).length ? `<h3 style="font-size:15px;margin:18px 0 6px">Where families came from</h3><table style="border-collapse:collapse;font-size:14px"><tr><td style="padding:2px 12px 2px 0;color:#5b6660">Source</td><td style="padding:2px 12px 2px 0;color:#5b6660">Signups</td><td style="color:#5b6660">Sent a list</td></tr>${Object.entries(n.sources).sort((a, b) => b[1].signups - a[1].signups).map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0">${k}</td><td style="padding:2px 12px 2px 0;font-weight:600">${v.signups}</td><td style="font-weight:600">${v.sent}</td></tr>`).join('')}</table>` : ''}
<p style="margin-top:14px">"Confirmed" means the family answered the follow-up email (anything but "not yet"), uploaded a receipt, or told us their total. Paid Instacart orders show up in Impact 1–2 days after delivery — compare its action count with the ${n.families} families above.</p>
<p style="font-size:12px;color:#8a8577">Your own test accounts are left out. Last 7 days.</p>`
  const html = emailShell(`Checkout report: ${n.confirmed} of ${n.families} families confirmed`, body, { label: 'Open Impact', href: 'https://app.impact.com/' })
  const r = await sendEmail(REPORT_TO, `DinnerDrop weekly checkout report: ${n.confirmed}/${n.families} families confirmed`, html)
  return { sent: r.ok, ...n }
}
