/**
 * "Ask the family first" — a last-call text before the planner places the grocery order.
 *
 * The planner taps the button on the grocery list page; every opted-in member who can add to
 * the list gets one text ("{name} is ordering from {store} in {minutes} min — need anything?").
 * Replies use the normal ADD / photo path (lib/texting.ts) and land on the active list tagged
 * with the member's name; the page polls status and shows a countdown plus what came in.
 * Family plan only; respects quiet hours and the weekly text cap. Server-only (admin client).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings } from '@/lib/settings'
import { localNow } from '@/lib/plan'
import { isFamilyProfile } from '@/lib/access'
import { smsConfigured } from '@/lib/notify'
import { textMember, type MemberRow } from '@/lib/texting'

export interface LastCallRow { id: string; user_id: string; household_id: string | null; store: string | null; message: string; minutes: number; sent_to: number; skipped: number; sent_at: string; closes_at: string; closed_at: string | null; closed_reason: string | null }
export interface LastCallItem { id: string; name: string; quantity: string | null; unit: string | null; added_by: string | null; created_at: string }
export interface LastCallStatus {
  eligible: boolean                 // Family + texting on + at least one member who can be texted
  reason?: 'not_family' | 'texting_off' | 'no_members' | 'sms_unconfigured' | 'quiet_hours'
  members: Array<{ name: string; ok: boolean }>
  defaults: { store: string; minutes: number; message: string; name: string }
  call: (LastCallRow & { open: boolean; secondsLeft: number; items: LastCallItem[] }) | null
}

interface OwnerProfile { id: string; household_id: string | null; full_name: string | null; timezone: string | null; settings: unknown; subscription_status: string | null; is_beta_member: boolean | null; family_until: string | null }

async function loadOwner(admin: SupabaseClient, ownerId: string): Promise<OwnerProfile | null> {
  const { data } = await admin.from('profiles').select('id, household_id, full_name, timezone, settings, subscription_status, is_beta_member, family_until').eq('id', ownerId).single()
  return (data as OwnerProfile) ?? null
}

async function loadMembers(admin: SupabaseClient, householdId: string, ownerId: string): Promise<MemberRow[]> {
  const { data } = await admin.from('household_members').select('id, household_id, name, role, phone, phone_opt_in_at, phone_opted_out, can_vote, can_add, profile_id').eq('household_id', householdId)
  // The planner doesn't text herself.
  return ((data as MemberRow[]) ?? []).filter((m) => m.profile_id !== ownerId)
}

function canText(m: MemberRow): boolean { return !!m.phone && !!m.phone_opt_in_at && !m.phone_opted_out && m.can_add }

function inQuietHours(owner: OwnerProfile, quietStart: string, quietEnd: string): boolean {
  const now = localNow(owner.timezone || 'America/New_York')
  const cur = now.hour * 60 + now.minute
  const [sh, sm] = quietStart.split(':').map(Number), [eh, em] = quietEnd.split(':').map(Number)
  const s = sh * 60 + (sm || 0), e = eh * 60 + (em || 0)
  if (!Number.isFinite(s) || !Number.isFinite(e) || s === e) return false
  return s < e ? cur >= s && cur < e : cur >= s || cur < e   // overnight window (21:00 → 07:00)
}

export function renderLastCall(template: string, v: { name: string; store: string; minutes: number }): string {
  const store = v.store.trim()
  let out = template
    .replace(/\{name\}/g, v.name)
    .replace(/\{minutes\}/g, String(v.minutes))
    .replace(/\{store\}/g, store || 'the store')
  if (!store) out = out.replace(/\bfrom the store\b/g, '').replace(/\s{2,}/g, ' ')
  return out.trim().slice(0, 300)
}

function firstName(full: string | null): string { return (full ?? '').trim().split(' ')[0] || 'Your family' }

/** The open call (if any) and the list lines that arrived by text while it was open. */
async function currentCall(admin: SupabaseClient, ownerId: string): Promise<LastCallStatus['call']> {
  const { data } = await admin.from('last_calls').select('*').eq('user_id', ownerId).order('sent_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) return null
  const row = data as LastCallRow
  // An Instacart/Kroger send after the call started closes it.
  if (!row.closed_at) {
    const { data: h } = await admin.from('grocery_handoffs').select('id').eq('user_id', ownerId).gte('created_at', row.sent_at).limit(1)
    if (h && h.length) { await admin.from('last_calls').update({ closed_at: new Date().toISOString(), closed_reason: 'ordered' }).eq('id', row.id); row.closed_at = new Date().toISOString(); row.closed_reason = 'ordered' }
  }
  const expired = !row.closed_at && new Date(row.closes_at).getTime() <= Date.now()
  if (expired) { await admin.from('last_calls').update({ closed_at: row.closes_at, closed_reason: 'expired' }).eq('id', row.id); row.closed_at = row.closes_at; row.closed_reason = 'expired' }
  // Only surface a closed call for an hour after it closed, so the page can show the summary once.
  if (row.closed_at && Date.now() - new Date(row.closed_at).getTime() > 3600000) return null
  const until = row.closed_at ?? new Date().toISOString()
  const { data: items } = await admin.from('list_items').select('id, name, quantity, unit, added_by, created_at').eq('user_id', ownerId).eq('source', 'sms').gte('created_at', row.sent_at).lte('created_at', until).order('created_at', { ascending: true })
  const secondsLeft = row.closed_at ? 0 : Math.max(0, Math.round((new Date(row.closes_at).getTime() - Date.now()) / 1000))
  return { ...row, open: !row.closed_at, secondsLeft, items: (items as LastCallItem[]) ?? [] }
}

export async function lastCallStatus(admin: SupabaseClient, ownerId: string): Promise<LastCallStatus> {
  const owner = await loadOwner(admin, ownerId)
  const settings = mergeSettings(owner?.settings)
  const name = firstName(owner?.full_name ?? null)
  const defaults = { store: settings.stores.usualStore || settings.stores.myStores[0]?.name || '', minutes: settings.texting.lastCall.minutes, message: settings.texting.lastCall.message, name }
  const base: LastCallStatus = { eligible: false, members: [], defaults, call: null }
  if (!owner) return base
  base.call = await currentCall(admin, ownerId)
  if (!isFamilyProfile(owner)) return { ...base, reason: 'not_family' }
  if (!settings.texting.enabled) return { ...base, reason: 'texting_off' }
  if (!smsConfigured()) return { ...base, reason: 'sms_unconfigured' }
  const members = owner.household_id ? await loadMembers(admin, owner.household_id, ownerId) : []
  base.members = members.filter((m) => m.phone).map((m) => ({ name: m.name, ok: canText(m) }))
  if (!members.some(canText)) return { ...base, reason: 'no_members' }
  if (inQuietHours(owner, settings.texting.quietStart, settings.texting.quietEnd)) return { ...base, reason: 'quiet_hours' }
  return { ...base, eligible: true }
}

export async function startLastCall(admin: SupabaseClient, ownerId: string, opts: { store?: string; minutes?: number; message?: string }): Promise<{ ok: true; call: LastCallRow; sentTo: string[]; skipped: string[] } | { ok: false; error: string }> {
  const status = await lastCallStatus(admin, ownerId)
  if (!status.eligible) return { ok: false, error: status.reason === 'quiet_hours' ? 'It’s quiet hours for your family texts right now.' : status.reason === 'no_members' ? 'Nobody in your household has opted in to texts yet.' : status.reason === 'texting_off' ? 'Turn on family texting in Settings first.' : 'Family texting isn’t available on this account.' }
  if (status.call?.open) return { ok: false, error: 'A last call is already running.' }
  const owner = (await loadOwner(admin, ownerId))!
  const settings = mergeSettings(owner.settings)
  const minutes = Math.min(120, Math.max(5, Math.round(Number(opts.minutes) || status.defaults.minutes)))
  const store = (opts.store ?? status.defaults.store).trim().slice(0, 40)
  const template = (opts.message ?? status.defaults.message).trim() || status.defaults.message
  const body = renderLastCall(template, { name: status.defaults.name, store, minutes })
  const members = (await loadMembers(admin, owner.household_id!, ownerId)).filter(canText)
  const sentTo: string[] = [], skipped: string[] = []
  const { data: row } = await admin.from('last_calls').insert({ user_id: ownerId, household_id: owner.household_id, store: store || null, message: body, minutes, closes_at: new Date(Date.now() + minutes * 60000).toISOString() }).select('*').single()
  if (!row) return { ok: false, error: 'Could not start the last call.' }
  for (const m of members) {
    const ok = await textMember(admin, m, body, `last_call:${row.id}`, settings.texting.weeklyCap)
    if (ok) sentTo.push(m.name); else skipped.push(m.name)
  }
  await admin.from('last_calls').update({ sent_to: sentTo.length, skipped: skipped.length }).eq('id', row.id)
  if (!sentTo.length) {
    await admin.from('last_calls').update({ closed_at: new Date().toISOString(), closed_reason: 'manual' }).eq('id', row.id)
    return { ok: false, error: 'No texts went out — everyone has hit this week’s text limit.' }
  }
  return { ok: true, call: { ...(row as LastCallRow), sent_to: sentTo.length, skipped: skipped.length }, sentTo, skipped }
}

export async function closeLastCall(admin: SupabaseClient, ownerId: string, reason: 'manual' | 'ordered' = 'manual'): Promise<boolean> {
  const { data } = await admin.from('last_calls').select('id, closed_at').eq('user_id', ownerId).is('closed_at', null).order('sent_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) return false
  const { error } = await admin.from('last_calls').update({ closed_at: new Date().toISOString(), closed_reason: reason }).eq('id', data.id)
  return !error
}
