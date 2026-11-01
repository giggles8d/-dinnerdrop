// Family texting in one step: save the planner's number (and any family numbers),
// switch texting on, send the YES opt-in texts. Used by the dashboard card and by
// the first-visit setup (lib/onboarding.ts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizePhone, smsConfigured } from '@/lib/notify'
import { sendOptIn, textMember, type MemberRow } from '@/lib/texting'
import { isFamilyProfile } from '@/lib/access'
import { mergeSettings } from '@/lib/settings'
import type { Meal } from '@/types'

export interface SetupProfile {
  id: string
  household_id: string | null
  full_name: string | null
  settings: unknown
  subscription_status: string | null
  is_beta_member: boolean | null
  family_until: string | null
}

export interface SetupResult { ok: true; saved: number; sent?: number; familyRequired?: boolean; reason?: string }

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.dinnerdrop.app'

export async function ensureHousehold(admin: SupabaseClient, profile: SetupProfile): Promise<string | null> {
  if (profile.household_id) return profile.household_id
  const { data: h } = await admin.from('households').insert({ owner_id: profile.id, name: `${(profile.full_name || 'Our').split(' ')[0]} family` }).select('id').single()
  const id = h?.id ?? null
  if (id) { await admin.from('profiles').update({ household_id: id }).eq('id', profile.id); profile.household_id = id }
  return id
}

export async function setupFamilyTexting(
  admin: SupabaseClient,
  profile: SetupProfile,
  input: { ownerPhone?: string | null; members?: Array<{ name?: string; phone?: string }> },
): Promise<SetupResult | { error: string; status: number }> {
  const ownerPhone = normalizePhone(input.ownerPhone)
  const members = (input.members ?? []).map((m) => ({ name: String(m.name ?? '').trim().slice(0, 40), phone: normalizePhone(m.phone) })).filter((m) => m.phone)
  if (!ownerPhone && !members.length) return { error: 'Add at least one phone number', status: 400 }

  const householdId = await ensureHousehold(admin, profile)
  if (!householdId) return { error: 'Could not set up the household', status: 500 }

  // Members with phones (skip numbers already in the household).
  const { data: existing } = await admin.from('household_members').select('id, phone, name').eq('household_id', householdId)
  const known = new Set((existing ?? []).map((m) => m.phone).filter(Boolean))
  for (const m of members) {
    if (known.has(m.phone)) continue
    const sameName = (existing ?? []).find((e) => !e.phone && m.name && e.name?.toLowerCase() === m.name.toLowerCase())
    if (sameName) await admin.from('household_members').update({ phone: m.phone }).eq('id', sameName.id)
    else await admin.from('household_members').insert({ household_id: householdId, name: m.name || 'Family', role: 'adult', age_band: 'adult', phone: m.phone, can_vote: true, can_add: true })
    known.add(m.phone)
  }

  // Texting on + the planner's own number.
  const settings = mergeSettings(profile.settings)
  settings.texting.enabled = true
  if (ownerPhone) settings.texting.ownerPhone = ownerPhone
  await admin.from('profiles').update({ settings }).eq('id', profile.id)
  profile.settings = settings

  // The planner gave us their own number on our form, so they're opted in; everyone else gets the YES text.
  if (ownerPhone) {
    const { data: mine } = await admin.from('household_members').select('id').eq('household_id', householdId).eq('profile_id', profile.id).limit(1)
    if (mine?.[0]) await admin.from('household_members').update({ phone: ownerPhone, phone_opt_in_at: new Date().toISOString(), phone_opted_out: false }).eq('id', mine[0].id)
    else await admin.from('household_members').insert({ household_id: householdId, profile_id: profile.id, name: (profile.full_name || 'Me').trim().split(' ')[0], role: 'adult', age_band: 'adult', phone: ownerPhone, phone_opt_in_at: new Date().toISOString(), can_vote: true, can_add: true })
  }

  const saved = members.length + (ownerPhone ? 1 : 0)
  if (!isFamilyProfile(profile)) return { ok: true, saved, familyRequired: true }
  if (!smsConfigured()) return { ok: true, saved, sent: 0, reason: 'sms_not_configured' }

  const { data: all } = await admin.from('household_members').select('*').eq('household_id', householdId).not('phone', 'is', null)
  const first = (profile.full_name || '').trim().split(' ')[0]
  const family = first ? `${first.charAt(0).toUpperCase() + first.slice(1)}'s family` : 'Your family'
  let sent = 0
  for (const m of (all ?? []) as MemberRow[]) if (await sendOptIn(admin, m, family)) sent++
  return { ok: true, saved, sent }
}

/** The planner's own member row (opted in), if they gave us a number. */
export async function ownerMember(admin: SupabaseClient, profile: SetupProfile): Promise<MemberRow | null> {
  if (!profile.household_id) return null
  const { data } = await admin.from('household_members').select('*').eq('household_id', profile.household_id).eq('profile_id', profile.id).not('phone', 'is', null).limit(1)
  return (data?.[0] as MemberRow | undefined) ?? null
}

async function sentBefore(admin: SupabaseClient, householdId: string, intent: string): Promise<boolean> {
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('household_id', householdId).eq('intent', intent)
  return (count ?? 0) > 0
}

/**
 * "Your week is ready" — the first text a new family gets, a minute after their first plan is built.
 * Only to the planner's own number (they opted in by giving it to us); once per household.
 */
export async function sendFirstPlanText(admin: SupabaseClient, profile: SetupProfile, meals: Meal[]): Promise<boolean> {
  if (!smsConfigured() || !isFamilyProfile(profile) || !profile.household_id) return false
  const settings = mergeSettings(profile.settings)
  if (!settings.texting.enabled) return false
  const me = await ownerMember(admin, profile)
  if (!me) return false
  if (await sentBefore(admin, profile.household_id, 'first_plan')) return false
  const lines = meals.slice(0, 7).map((m, i) => `${i + 1}. ${m.day ? `${m.day.slice(0, 3)} — ` : ''}${m.name}`).join('\n')
  const body = `DinnerDrop: your week is ready 🍽️\n${lines}\nYour grocery list is built — one tap sends it to Instacart or Walmart: ${APP_URL}/grocery-list\nText ADD milk (or anything) to put it on the list. Reply STOP to opt out.`
  return textMember(admin, me, body, 'first_plan')
}

/**
 * Day-after nudge: the list is built but nothing has gone to a store. One text, once.
 * Called from the daily cron for families whose first plan is 20–72 hours old.
 */
export async function sendListWaitingText(admin: SupabaseClient, profile: SetupProfile, firstName: string): Promise<boolean> {
  if (!smsConfigured() || !isFamilyProfile(profile) || !profile.household_id) return false
  const settings = mergeSettings(profile.settings)
  if (!settings.texting.enabled) return false
  const me = await ownerMember(admin, profile)
  if (!me) return false
  if (await sentBefore(admin, profile.household_id, 'list_waiting')) return false
  const body = `DinnerDrop: ${firstName ? `${firstName}, your` : 'your'} grocery list for the week is still waiting. One tap sends it to your Instacart or Walmart cart: ${APP_URL}/grocery-list — you check out there. Already shopped? Text "spent $120" and we'll mark it done.`
  return textMember(admin, me, body, 'list_waiting')
}
