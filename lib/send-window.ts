/**
 * When a family may get a text (Sarah, Nov 10 2026, after Melissa Acton opted out over texts "before 7am").
 *
 * Every scheduled text used to go out from the one daily run, about 7:50 AM Eastern — whatever time the family had
 * chosen, and 4:50 AM for a family in California. Now:
 * - Texts go out only inside the family's texting hours (Settings → Texting: "no texts before / after"), default
 *   9 AM to 8 PM. The old default pair (no texts 9 PM–7 AM) is read as the new default.
 * - A reminder with its own time (tonight's dinner at 3:30 PM, shop day at 5 PM) goes out at that time.
 * - Until we know a family's time zone (most profiles are Eastern only by default), we assume Pacific, so the
 *   earliest anyone can get a text is 9 AM where they are (noon Eastern).
 * - A text that can't go now waits in sms_outbox; the 5-minute poll (/api/sms/poll) sends it when it's due.
 * Replies to a family member's own text, the first-week text right after setup, and Last Call are not held.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendSms } from '@/lib/notify'

export const UNKNOWN_TZ = 'America/Los_Angeles'
const DEFAULT_TZ = 'America/New_York'
const NOW_INTENTS = new Set(['reply', 'opt_in', 'first_plan', 'last_call', 'relay', 'walmart_pick', 'admin_message', 'reorder_cart', 'owner_message'])

type Settingsish = { texting?: { quietStart?: string; quietEnd?: string }; tzKnown?: boolean } | null | undefined

/** The time zone to time texts by: the family's own, or Pacific when it was never set (only the default). */
export function textingTz(timezone: string | null | undefined, settings: Settingsish): string {
  if (timezone && (timezone !== DEFAULT_TZ || settings?.tzKnown)) return timezone
  return UNKNOWN_TZ
}

const toMin = (hhmm: string | undefined, fallback: number) => {
  const m = String(hhmm ?? '').match(/^(\d{1,2}):(\d{2})$/)
  return m ? Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2])) : fallback
}

/** Texting hours in minutes after local midnight: [open, close). quietEnd = first minute allowed, quietStart = cutoff. */
export function textingHours(settings: Settingsish): { open: number; close: number } {
  const qs = settings?.texting?.quietStart, qe = settings?.texting?.quietEnd
  // The old default (no texts 9 PM–7 AM) predates Sarah's 9 AM–8 PM default: treat it as unchanged-by-the-family.
  if ((qs === '21:00' && qe === '07:00') || !qs || !qe) return { open: 9 * 60, close: 20 * 60 }
  const open = toMin(qe, 9 * 60), close = toMin(qs, 20 * 60)
  return close > open ? { open, close } : { open: 9 * 60, close: 20 * 60 }
}

/** Local date (YYYY-MM-DD) and minutes after midnight for an instant in a time zone. */
function localParts(tz: string, d: Date): { date: string; min: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) }
}

/** The instant a local date + minutes falls on in a time zone. */
function zoned(date: string, min: number, tz: string): Date {
  const [y, mo, d] = date.split('-').map(Number)
  const guess = Date.UTC(y, mo - 1, d, Math.floor(min / 60), min % 60)
  const lp = localParts(tz, new Date(guess))
  const [ly, lmo, ld] = lp.date.split('-').map(Number)
  const shownAsUtc = Date.UTC(ly, lmo - 1, ld, Math.floor(lp.min / 60), lp.min % 60)
  return new Date(guess - (shownAsUtc - guess))
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/**
 * When this text may go out: `now` if it can go now, a later instant to hold it until, or null to drop it
 * (a same-day reminder whose day is over, e.g. "tonight's dinner" after the family's evening cutoff).
 */
export function sendTime(now: Date, tz: string, settings: Settingsish, opts: { at?: string; sameDayOnly?: boolean } = {}): Date | null {
  const { open, close } = textingHours(settings)
  const here = localParts(tz, now)
  if (opts.at) {
    const want = Math.min(Math.max(toMin(opts.at, open), open), close - 1)
    if (here.min < want) return zoned(here.date, want, tz)
    if (here.min < close) return now
    return opts.sameDayOnly ? null : zoned(nextDay(here.date), open, tz)
  }
  if (here.min >= open && here.min < close) return now
  if (here.min < open) return zoned(here.date, open, tz)
  return opts.sameDayOnly ? null : zoned(nextDay(here.date), open, tz)
}

const familyCache = new Map<string, { tz: string; settings: Settingsish; at: number }>()
async function familyTiming(admin: SupabaseClient, householdId: string): Promise<{ tz: string; settings: Settingsish }> {
  const hit = familyCache.get(householdId)
  if (hit && Date.now() - hit.at < 60_000) return hit
  const { data: h } = await admin.from('households').select('owner_id').eq('id', householdId).maybeSingle()
  const { data: p } = h?.owner_id ? await admin.from('profiles').select('timezone, settings').eq('id', h.owner_id).maybeSingle() : { data: null }
  const settings = (p?.settings ?? null) as Settingsish
  const out = { tz: textingTz(p?.timezone as string | null, settings), settings, at: Date.now() }
  familyCache.set(householdId, out)
  return out
}

export interface FamilyText { householdId: string; memberId?: string | null; to: string; body: string; intent: string; mediaUrl?: string }

/**
 * Send a scheduled family text now if it's within their texting hours, else hold it in sms_outbox until it is.
 * Logs to sms_messages when it actually goes out. Returns 'sent' | 'queued' | 'dropped' | 'failed'.
 */
export async function sendFamilyText(admin: SupabaseClient, t: FamilyText, opts: { at?: string; sameDayOnly?: boolean; now?: Date } = {}): Promise<'sent' | 'queued' | 'dropped' | 'failed'> {
  const now = opts.now ?? new Date()
  const base = t.intent.split(':')[0]
  let when: Date | null = now
  if (!NOW_INTENTS.has(base)) {
    const { tz, settings } = await familyTiming(admin, t.householdId)
    when = sendTime(now, tz, settings, opts)
  }
  if (!when) return 'dropped'
  if (when.getTime() - now.getTime() > 60_000) {
    // One waiting copy per phone and kind of text.
    const { count } = await admin.from('sms_outbox').select('id', { count: 'exact', head: true }).eq('to_number', t.to).eq('intent', t.intent).is('sent_at', null)
    if (count) return 'queued'
    await admin.from('sms_outbox').insert({ household_id: t.householdId, member_id: t.memberId ?? null, to_number: t.to, body: t.body, intent: t.intent, media_url: t.mediaUrl ?? null, send_after: when.toISOString(), same_day_only: !!opts.sameDayOnly })
    return 'queued'
  }
  const r = await sendSms(t.to, t.body, t.mediaUrl)
  await admin.from('sms_messages').insert({ household_id: t.householdId, member_id: t.memberId ?? null, direction: 'out', to_number: t.to, body: t.body, intent: t.intent, twilio_sid: r.sid ?? null })
  return r.ok ? 'sent' : 'failed'
}

/** Send the held texts that are due (called by the 5-minute poll). Skips anyone who has opted out since. */
export async function flushOutbox(admin: SupabaseClient, budgetMs = 15000): Promise<{ sent: number; skipped: number }> {
  const started = Date.now()
  const out = { sent: 0, skipped: 0 }
  const { data: due } = await admin.from('sms_outbox').select('*').is('sent_at', null).lte('send_after', new Date().toISOString()).order('send_after').limit(40)
  for (const row of (due ?? []) as Array<{ id: string; household_id: string; member_id: string | null; to_number: string; body: string; intent: string; media_url: string | null; send_after: string }>) {
    if (Date.now() - started > budgetMs) break
    const { data: opted } = await admin.from('household_members').select('id').eq('phone', row.to_number).eq('phone_opted_out', true).limit(1)
    // Too late to still be useful (a held text more than 18 hours past due), or the phone opted out: don't send.
    const stale = Date.now() - Date.parse(row.send_after) > 18 * 3600000
    if (opted?.length || stale) {
      await admin.from('sms_outbox').update({ sent_at: new Date().toISOString(), skipped: true }).eq('id', row.id)
      out.skipped++
      continue
    }
    // Claim the row first so two overlapping polls can't both send it.
    const { data: claimed } = await admin.from('sms_outbox').update({ sent_at: new Date().toISOString() }).eq('id', row.id).is('sent_at', null).select('id')
    if (!claimed?.length) continue
    const r = await sendSms(row.to_number, row.body, row.media_url ?? undefined)
    await admin.from('sms_messages').insert({ household_id: row.household_id, member_id: row.member_id, direction: 'out', to_number: row.to_number, body: row.body, intent: row.intent, twilio_sid: r.sid ?? null })
    await admin.from('sms_outbox').update({ twilio_sid: r.sid ?? null }).eq('id', row.id)
    out.sent++
  }
  return out
}
