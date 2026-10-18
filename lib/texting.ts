/**
 * Family texting (Twilio toll-free). Family members get the week's dinners to
 * vote on, can text foods to add to the grocery list, and manage opt-in/STOP.
 *
 * Outbound day jobs run from the daily cron; inbound is /api/sms/inbound.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, type Settings } from '@/lib/settings'
import { localNow, mondayOf } from '@/lib/plan'
import { sendSms, smsConfigured, normalizePhone } from '@/lib/notify'
import { isFamilyProfile } from '@/lib/access'
import { guessCategory, normalizeItemName } from '@/lib/list'
import type { Meal } from '@/types'

export interface MemberRow {
  id: string
  household_id: string
  name: string
  role: 'adult' | 'kid'
  phone: string | null
  phone_opt_in_at: string | null
  phone_opted_out: boolean
  can_vote: boolean
  can_add: boolean
}

interface OwnerRow {
  id: string
  household_id: string
  full_name: string | null
  timezone: string | null
  settings: unknown
  subscription_status: string | null
  is_beta_member: boolean | null
  family_until: string | null
}

export interface TextingReport { voteTexts: number; againTexts: number; skipped: number; errors: string[] }

/** Household owner = the profile whose household this is (households.owner_id). */
export async function ownerForHousehold(admin: SupabaseClient, householdId: string): Promise<OwnerRow | null> {
  const { data: h } = await admin.from('households').select('owner_id').eq('id', householdId).single()
  if (!h) return null
  const { data } = await admin
    .from('profiles')
    .select('id, household_id, full_name, timezone, settings, subscription_status, is_beta_member, family_until')
    .eq('id', h.owner_id)
    .single()
  return (data as OwnerRow) ?? null
}

export async function latestPlan(admin: SupabaseClient, userId: string): Promise<{ id: string; week_start: string; meals: Meal[] } | null> {
  const { data } = await admin.from('meal_plans').select('id, week_start, meals').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single()
  return data ? { id: data.id, week_start: data.week_start, meals: (data.meals as Meal[]) ?? [] } : null
}

async function sentThisWeek(admin: SupabaseClient, memberId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('direction', 'out').gte('created_at', since)
  return count ?? 0
}

async function alreadySent(admin: SupabaseClient, householdId: string, intent: string, days = 5): Promise<boolean> {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('household_id', householdId).eq('intent', intent).gte('created_at', since)
  return (count ?? 0) > 0
}

export async function textMember(admin: SupabaseClient, m: MemberRow, body: string, intent: string, cap?: number): Promise<boolean> {
  if (!m.phone || !m.phone_opt_in_at || m.phone_opted_out) return false
  if (cap !== undefined && (await sentThisWeek(admin, m.id)) >= cap) return false
  const r = await sendSms(m.phone, body)
  await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'out', to_number: m.phone, body, intent, twilio_sid: r.sid ?? null })
  return r.ok
}

function menuLines(meals: Meal[]): string {
  return meals.map((m, i) => `${i + 1}. ${m.day ? `${m.day.slice(0, 3)} — ` : ''}${m.name}`).join('\n')
}

/** Send the opt-in invitation to a member who has a phone but hasn't opted in. */
export async function sendOptIn(admin: SupabaseClient, m: MemberRow, familyName: string): Promise<boolean> {
  if (!smsConfigured() || !m.phone || m.phone_opt_in_at || m.phone_opted_out) return false
  if (await alreadySentTo(admin, m.id, 'opt_in', 3)) return false
  const body = `DinnerDrop: ${familyName} wants to text you the week's dinners to vote on, and let you add things to the grocery list. Reply YES to join. Msg & data rates may apply. Reply STOP anytime to opt out.`
  const r = await sendSms(m.phone, body)
  await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'out', to_number: m.phone, body, intent: 'opt_in', twilio_sid: r.sid ?? null })
  return r.ok
}

async function alreadySentTo(admin: SupabaseClient, memberId: string, intent: string, days: number): Promise<boolean> {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('intent', intent).gte('created_at', since)
  return (count ?? 0) > 0
}

/** Daily job: vote-day and again-day texts for every texting household. */
export async function runTextingDay(admin: SupabaseClient, now: Date = new Date()): Promise<TextingReport> {
  const report: TextingReport = { voteTexts: 0, againTexts: 0, skipped: 0, errors: [] }
  if (!smsConfigured()) return { ...report, errors: ['Twilio not configured'] }

  const { data: owners } = await admin
    .from('profiles')
    .select('id, household_id, full_name, timezone, settings, subscription_status, is_beta_member, family_until')
    .not('settings', 'eq', '{}')
    .not('household_id', 'is', null)

  for (const o of (owners ?? []) as OwnerRow[]) {
    try {
      const settings: Settings = mergeSettings(o.settings)
      if (!settings.texting.enabled || !isFamilyProfile(o)) continue
      const { weekday } = localNow(o.timezone || 'America/New_York', now)
      const isVote = settings.texting.voteDay === weekday
      const isAgain = settings.texting.againDay === weekday
      if (!isVote && !isAgain) continue

      const plan = await latestPlan(admin, o.id)
      if (!plan || !plan.meals.length) { report.skipped++; continue }
      const { data: members } = await admin.from('household_members').select('*').eq('household_id', o.household_id).not('phone', 'is', null)
      const voters = ((members ?? []) as MemberRow[]).filter((m) => m.can_vote && m.phone_opt_in_at && !m.phone_opted_out)
      if (!voters.length) { report.skipped++; continue }
      const family = (o.full_name || '').trim().split(' ')[0] || 'Your family'

      if (isVote && !(await alreadySent(admin, o.household_id, 'vote_request'))) {
        const body = `DinnerDrop — ${family}'s dinners this week:\n${menuLines(plan.meals)}\n\nReply with the numbers you'd SKIP (e.g. "2 4"), or ALL GOOD. Text ADD + anything you need on the grocery list (e.g. "add oat milk").`
        for (const m of voters) if (await textMember(admin, m, body, 'vote_request', settings.texting.weeklyCap)) report.voteTexts++
      }
      if (isAgain && !(await alreadySent(admin, o.household_id, 'again_request'))) {
        const body = `DinnerDrop — which dinners should come back soon?\n${menuLines(plan.meals)}\n\nReply AGAIN + numbers (e.g. "again 1 3"), or NONE.`
        for (const m of voters) if (await textMember(admin, m, body, 'again_request', settings.texting.weeklyCap)) report.againTexts++
      }
    } catch (e) {
      report.errors.push(`${o.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return report
}

/* ------------------------------------------------------------------ */
/* Inbound                                                              */
/* ------------------------------------------------------------------ */

export type Parsed =
  | { kind: 'optin' } | { kind: 'stop' } | { kind: 'start' } | { kind: 'help' }
  | { kind: 'list' } | { kind: 'menu' }
  | { kind: 'allgood' } | { kind: 'none' }
  | { kind: 'skip'; numbers: number[] } | { kind: 'again'; numbers: number[] }
  | { kind: 'add'; items: string[] }
  | { kind: 'unknown' }

export function parseInbound(raw: string): Parsed {
  const t = raw.trim()
  const u = t.toUpperCase()
  if (/^(YES|Y|JOIN|YEP|YEAH|SURE|OK|OKAY)\b/.test(u)) return { kind: 'optin' }
  if (/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)\b/.test(u)) return { kind: 'stop' }
  if (/^(START|UNSTOP|RESUME)\b/.test(u)) return { kind: 'start' }
  if (/^(HELP|INFO|\?)\b/.test(u)) return { kind: 'help' }
  if (/^(LIST|GROCERY|GROCERIES)\b/.test(u)) return { kind: 'list' }
  if (/^(MENU|DINNERS|PLAN|WHAT'?S FOR DINNER)\b/.test(u)) return { kind: 'menu' }
  if (/^(ALL ?GOOD|ALL|GOOD|KEEP ?ALL|LOOKS GOOD|👍|LGTM|FINE)\b/.test(u)) return { kind: 'allgood' }
  if (/^(NONE|NO|NOPE|NAH)\b/.test(u)) return { kind: 'none' }
  const again = u.match(/^(AGAIN|REPEAT|BRING BACK)\s*[:\-]?\s*([\d\s,and&]+)$/)
  if (again) return { kind: 'again', numbers: numbersIn(again[2]) }
  const add = t.match(/^(?:add|\+|need|we need|we'?re out of|out of|get|buy|pick up|grab)\s*[:\-]?\s*(.+)$/i)
  if (add) return { kind: 'add', items: splitItems(add[1]) }
  const skip = u.match(/^(?:SKIP|NOT|NO|DROP)?\s*[:\-]?\s*([\d\s,and&]+)$/)
  if (skip && numbersIn(skip[1]).length) return { kind: 'skip', numbers: numbersIn(skip[1]) }
  return { kind: 'unknown' }
}

function numbersIn(s: string): number[] {
  return Array.from(new Set((s.match(/\d+/g) ?? []).map(Number).filter((n) => n >= 1 && n <= 20)))
}
function splitItems(s: string): string[] {
  return s.split(/,|\band\b|&|\n|;/i).map((x) => x.trim().replace(/[.!]+$/, '')).filter((x) => x.length >= 2 && x.length <= 60)
}

export interface InboundResult { reply: string; handled: boolean; member?: MemberRow }

/** Handle a text from a known member. Returns the reply to send (via TwiML). */
export async function handleInbound(admin: SupabaseClient, from: string, body: string, sid: string | null): Promise<InboundResult> {
  const phone = normalizePhone(from) ?? from
  const { data: mrows } = await admin.from('household_members').select('*').eq('phone', phone).limit(1)
  const m = (mrows?.[0] as MemberRow | undefined)
  if (!m) return { reply: '', handled: false }

  const parsed = parseInbound(body)
  await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'in', from_number: phone, body, intent: parsed.kind, twilio_sid: sid })

  const owner = await ownerForHousehold(admin, m.household_id)
  const family = (owner?.full_name || '').trim().split(' ')[0] || 'your family'
  const settings = mergeSettings(owner?.settings)

  switch (parsed.kind) {
    case 'optin':
      if (!m.phone_opt_in_at || m.phone_opted_out) {
        await admin.from('household_members').update({ phone_opt_in_at: new Date().toISOString(), phone_opted_out: false }).eq('id', m.id)
      }
      return { reply: `You're in, ${m.name}. You'll get ${family}'s dinners to vote on each week. Text ADD + anything for the grocery list anytime (e.g. "add bananas"). Text MENU for this week, LIST for the list, STOP to opt out.`, handled: true, member: m }
    case 'stop':
      await admin.from('household_members').update({ phone_opted_out: true }).eq('id', m.id)
      return { reply: `You're opted out of DinnerDrop texts. Reply START to rejoin.`, handled: true, member: m }
    case 'start':
      await admin.from('household_members').update({ phone_opted_out: false, phone_opt_in_at: m.phone_opt_in_at ?? new Date().toISOString() }).eq('id', m.id)
      return { reply: `Welcome back, ${m.name}. Text MENU for this week's dinners or ADD + an item for the list.`, handled: true, member: m }
    case 'help':
      return { reply: `DinnerDrop: reply numbers to SKIP dinners (e.g. "2 4"), ALL GOOD to keep them, AGAIN 1 3 to bring some back, ADD + items for the grocery list, MENU, LIST, STOP.`, handled: true, member: m }
    default:
      break
  }

  if (!m.phone_opt_in_at || m.phone_opted_out) {
    return { reply: `Reply YES to join ${family}'s DinnerDrop texts first.`, handled: true, member: m }
  }

  const plan = owner ? await latestPlan(admin, owner.id) : null
  const meals = plan?.meals ?? []

  switch (parsed.kind) {
    case 'menu':
      return { reply: meals.length ? `This week:\n${menuLines(meals)}\n\nReply numbers to skip, or ALL GOOD.` : `No dinners planned yet — ${family} hasn't built this week.`, handled: true, member: m }
    case 'list': {
      if (!owner) break
      const { data: items } = await admin.from('list_items').select('name, quantity, unit, have, checked').eq('user_id', owner.id).eq('week_start', plan?.week_start ?? mondayOf(new Date())).order('category')
      const need = (items ?? []).filter((i) => !i.have && !i.checked)
      return { reply: need.length ? `Grocery list (${need.length}):\n${need.slice(0, 30).map((i) => `• ${i.name}${i.quantity ? ` (${i.quantity} ${i.unit ?? ''})`.replace(/\s+\)/, ')') : ''}`).join('\n')}${need.length > 30 ? `\n…and ${need.length - 30} more` : ''}` : `The list is empty right now. Text ADD + anything to put it on.`, handled: true, member: m }
    }
    case 'allgood':
    case 'none':
    case 'skip':
    case 'again': {
      if (!m.can_vote) return { reply: `Thanks ${m.name} — voting is turned off for you, but you can still ADD items to the list.`, handled: true, member: m }
      if (!meals.length || !plan) return { reply: `Nothing to vote on yet — ${family} hasn't planned this week.`, handled: true, member: m }
      const rows: Array<{ household_id: string; member_id: string; week_start: string; meal_name: string; vote: string }> = []
      if (parsed.kind === 'allgood') meals.forEach((x) => rows.push({ household_id: m.household_id, member_id: m.id, week_start: plan.week_start, meal_name: x.name, vote: 'keep' }))
      if (parsed.kind === 'skip') meals.forEach((x, i) => rows.push({ household_id: m.household_id, member_id: m.id, week_start: plan.week_start, meal_name: x.name, vote: parsed.numbers.includes(i + 1) ? 'skip' : 'keep' }))
      if (parsed.kind === 'again') parsed.numbers.forEach((n) => { const x = meals[n - 1]; if (x) rows.push({ household_id: m.household_id, member_id: m.id, week_start: plan.week_start, meal_name: x.name, vote: 'again' }) })
      if (rows.length) {
        await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', plan.week_start).in('vote', parsed.kind === 'again' ? ['again'] : ['keep', 'skip'])
        await admin.from('meal_votes').insert(rows)
      }
      if (parsed.kind === 'allgood') return { reply: `Got it — all ${meals.length} dinners kept. 🙌`, handled: true, member: m }
      if (parsed.kind === 'none') return { reply: `Noted, ${m.name}.`, handled: true, member: m }
      if (parsed.kind === 'skip') {
        const names = parsed.numbers.map((n) => meals[n - 1]?.name).filter(Boolean)
        return { reply: names.length ? `Got it — you'd skip ${names.join(' and ')}. ${family} will see the votes.` : `I didn't catch which numbers. Reply like "2 4" to skip those dinners.`, handled: true, member: m }
      }
      const names = parsed.numbers.map((n) => meals[n - 1]?.name).filter(Boolean)
      return { reply: names.length ? `Bring back ${names.join(' and ')} — noted. 🍽️` : `Reply like "again 1 3" to pick the ones that should come back.`, handled: true, member: m }
    }
    case 'add': {
      if (!m.can_add) return { reply: `Adding to the list is turned off for you, ${m.name}. Ask ${family} to switch it on in Settings.`, handled: true, member: m }
      if (!owner) break
      const weekStart = plan?.week_start ?? mondayOf(new Date())
      const { data: existing } = await admin.from('list_items').select('id, name, have').eq('user_id', owner.id).eq('week_start', weekStart)
      const added: string[] = []
      for (const item of parsed.items) {
        const hit = (existing ?? []).find((e) => normalizeItemName(e.name) === normalizeItemName(item))
        if (hit) { if (hit.have) await admin.from('list_items').update({ have: false }).eq('id', hit.id); added.push(item); continue }
        await admin.from('list_items').insert({ user_id: owner.id, household_id: m.household_id, week_start: weekStart, name: item, category: guessCategory(item), search_term: item, source: 'sms', added_by: m.name })
        added.push(item)
      }
      return { reply: added.length ? `Added to the list: ${added.join(', ')}. ✅` : `Tell me what to add, like "add oat milk, bananas".`, handled: true, member: m }
    }
    default:
      break
  }
  // Unknown but short and food-ish? Treat as add when the member can add and said something list-like.
  if (m.can_add && body.trim().length <= 40 && !/\d/.test(body) && settings.texting.enabled) {
    const item = body.trim()
    if (owner) {
      const weekStart = plan?.week_start ?? mondayOf(new Date())
      await admin.from('list_items').insert({ user_id: owner.id, household_id: m.household_id, week_start: weekStart, name: item, category: guessCategory(item), search_term: item, source: 'sms', added_by: m.name })
      return { reply: `Added "${item}" to the grocery list. (Text HELP for everything you can do.)`, handled: true, member: m }
    }
  }
  return { reply: `Didn't catch that. Reply numbers to skip dinners, ALL GOOD, ADD + items, MENU, LIST, or HELP.`, handled: true, member: m }
}
