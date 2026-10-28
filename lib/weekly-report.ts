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
    db.from('profiles').select('id, email'),
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
  return {
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
${row('Lists sent to a store', `${n.sends} (from ${n.families} families)`)}
${row('Confirmed checked out', `${n.confirmed} of ${n.families} families (${pct}%)`)}
${row('Said "not yet"', n.notYet)}
${row('No answer yet', n.noAnswer)}
${row('Follow-up answers', `ordered ${n.answers.ordered} · pricey ${n.answers.pricey} · missing/wrong ${n.answers.missing} · not yet ${n.answers.not_yet}`)}
${row('Receipts uploaded', n.receipts)}
${row('Estimated value of lists sent', `$${n.estTotal}`)}
${row('Real totals reported', n.actualReported ? `$${n.actualReported}` : '—')}
</table>
<p style="margin-top:14px">"Confirmed" means the family answered the follow-up email (anything but "not yet"), uploaded a receipt, or told us their total. Paid Instacart orders show up in Impact 1–2 days after delivery — compare its action count with the ${n.families} families above.</p>
<p style="font-size:12px;color:#8a8577">Your own test accounts are left out. Last 7 days.</p>`
  const html = emailShell(`Checkout report: ${n.confirmed} of ${n.families} families confirmed`, body, { label: 'Open Impact', href: 'https://app.impact.com/' })
  const r = await sendEmail(REPORT_TO, `DinnerDrop weekly checkout report: ${n.confirmed}/${n.families} families confirmed`, html)
  return { sent: r.ok, ...n }
}
