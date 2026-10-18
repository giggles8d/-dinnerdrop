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
import { generateCandidates, savePlan } from '@/lib/autoplan'
import { timeLabel, type PlanShape } from '@/lib/plan'
import { guessCategory, normalizeItemName } from '@/lib/list'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
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
  // Only proactive texts count toward the weekly cap — replies to their own messages and the opt-in don't.
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('direction', 'out').gte('created_at', since).not('intent', 'in', '("reply","opt_in")')
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

      // Vote day: auto-pick the week if needed, opt-in anyone new, text the menu.
      if (isVote && !(await alreadySent(admin, o.household_id, 'vote_request'))) {
        const r = await startVoteCycle(admin, o.id, { now })
        report.voteTexts += r.voteTextsSent
        if (r.skipped.length) report.skipped++
      }
      // "Bring it back?" day: only to people already opted in, about the current plan.
      if (isAgain && !(await alreadySent(admin, o.household_id, 'again_request'))) {
        const plan = await latestPlan(admin, o.id)
        if (!plan || !plan.meals.length) { report.skipped++; continue }
        const { data: members } = await admin.from('household_members').select('*').eq('household_id', o.household_id).not('phone', 'is', null)
        const voters = ((members ?? []) as MemberRow[]).filter((m) => m.can_vote && m.phone_opt_in_at && !m.phone_opted_out)
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


/** "banannad" → "bananas", "Like kielbasa also" → "kielbasa", "zero suger doctor pepper" → "Dr Pepper Zero Sugar". */
export async function cleanItems(raw: string[]): Promise<string[]> {
  const items = raw.map((x) => x.trim()).filter(Boolean)
  if (!items.length) return []
  try {
    const text = await generateWithClaude(
      `A family member texted these grocery items. Return each as a clean, shoppable product name (fix typos, drop filler words like "like", "also", "please", "some", keep brand names, plural for produce). Return ONLY a JSON array of strings in the same order; use "" for anything that isn't a grocery item.\n${JSON.stringify(items)}`,
      300,
    )
    const out = parseClaudeJSON<string[]>(text)
    if (Array.isArray(out) && out.length === items.length) return out.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
  } catch { /* fall through */ }
  return items
}


interface Understood { wants: number[]; dislikes: number[]; add: string[]; allGood: boolean; none: boolean; question: boolean }

/** Free-text reply → structured intent, judged against the numbered ideas. */
async function understandReply(body: string, candidates: Meal[]): Promise<Understood | null> {
  try {
    const text = await generateWithClaude(
      `A family member replied to this text about next week's dinners. The numbered ideas were:\n${candidates.map((c, i) => `${i + 1}. ${c.name}`).join('\n')}\n\nTheir reply: """${body.trim()}"""\n\nInterpret it. "wants" = idea numbers they want/like/pick. "dislikes" = numbers they don't want, don't like, want changed/swapped, or dishes they named negatively (match to a number). "add" = grocery items they want added (clean product names). allGood = they're fine with everything. none = they don't want any / have no picks. question = they asked something or it's unrelated chatter.\nReturn ONLY JSON: {"wants":[],"dislikes":[],"add":[],"allGood":false,"none":false,"question":false}`,
      200,
    )
    const u = parseClaudeJSON<Understood>(text)
    const nums = (a: unknown) => (Array.isArray(a) ? a.map(Number).filter((n) => n >= 1 && n <= candidates.length) : [])
    return { wants: nums(u.wants), dislikes: nums(u.dislikes), add: Array.isArray(u.add) ? u.add.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [], allGood: !!u.allGood, none: !!u.none, question: !!u.question }
  } catch { return null }
}

export interface InboundResult { reply: string; handled: boolean; member?: MemberRow }

/** Handle a text from a known member. Returns the reply to send (via TwiML). */
export async function handleInbound(admin: SupabaseClient, from: string, body: string, sid: string | null): Promise<InboundResult> {
  const phone = normalizePhone(from) ?? from
  const { data: mrows } = await admin.from('household_members').select('*').eq('phone', phone).limit(1)
  const m = (mrows?.[0] as MemberRow | undefined)
  if (!m) return { reply: '', handled: false }

  const parsed = parseInbound(body)
  const round = await openRound(admin, m.household_id)
  const intent = round && parsed.kind === 'skip' ? 'pick' : parsed.kind
  await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'in', from_number: phone, body, intent, twilio_sid: sid })

  const owner = await ownerForHousehold(admin, m.household_id)
  const rawFirst = (owner?.full_name || '').trim().split(' ')[0]
  const family = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : 'your family'
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
      return { reply: `DinnerDrop: reply the numbers of the dinners you WANT (e.g. "1 3 5"), ALL GOOD if they all work, AGAIN 1 3 to bring some back, ADD + items for the grocery list, MENU, LIST, STOP.`, handled: true, member: m }
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
      if (round) return { reply: `Pick your favorites (up to ${round.picks_needed}):\n${pickLines(round.candidates)}\n\nReply with the numbers you want, e.g. "1 3 5".`, handled: true, member: m }
      return { reply: meals.length ? `This week:\n${menuLines(meals)}` : `No dinners planned yet — ${family} hasn't built this week.`, handled: true, member: m }
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
      // Open round: numbers are PICKS from the candidates; top picks become the week.
      if (round && parsed.kind !== 'again') {
        const cands = round.candidates
        const rows: Array<{ household_id: string; member_id: string; week_start: string; meal_name: string; vote: string }> = []
        let picked: string[] = []
        if (parsed.kind === 'allgood') picked = cands.map((c) => c.name)
        if (parsed.kind === 'skip') picked = parsed.numbers.map((n) => cands[n - 1]?.name).filter((x): x is string => !!x).slice(0, Math.max(round.picks_needed, 1))
        picked.forEach((name) => rows.push({ household_id: m.household_id, member_id: m.id, week_start: round.week_start, meal_name: name, vote: 'keep' }))
        await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', round.week_start).eq('vote', 'keep')
        if (rows.length) await admin.from('meal_votes').insert(rows)
        if (parsed.kind === 'allgood') return { reply: `Got it, ${m.name} — they all work for you. 🙌`, handled: true, member: m }
        if (parsed.kind === 'none') return { reply: `Noted, ${m.name} — no picks from you this week.`, handled: true, member: m }
        return { reply: picked.length ? `Got it — your picks: ${picked.join(', ')}. The top ${round.picks_needed} make the week.` : `I didn't catch which numbers. Reply like "1 3 5" with the dinners you want.`, handled: true, member: m }
      }
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
      for (const item of await cleanItems(parsed.items)) {
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
  // Open vote + free text ("i don't like 7", "change 4", "1 2 and the tacos"): let Claude read it.
  if (round && m.can_vote) {
    const u = await understandReply(body, round.candidates)
    if (u && (u.wants.length || u.dislikes.length || u.allGood || u.none || u.add.length)) {
      const cands = round.candidates
      const rows: Array<{ household_id: string; member_id: string; week_start: string; meal_name: string; vote: string }> = []
      const wantNames = (u.allGood ? cands.map((_, i) => i + 1) : u.wants).map((n) => cands[n - 1]?.name).filter((x): x is string => !!x)
      const dislikeNames = u.dislikes.map((n) => cands[n - 1]?.name).filter((x): x is string => !!x)
      wantNames.forEach((name) => rows.push({ household_id: m.household_id, member_id: m.id, week_start: round.week_start, meal_name: name, vote: 'keep' }))
      dislikeNames.forEach((name) => rows.push({ household_id: m.household_id, member_id: m.id, week_start: round.week_start, meal_name: name, vote: 'skip' }))
      if (wantNames.length || u.allGood || u.none) await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', round.week_start).eq('vote', 'keep')
      if (dislikeNames.length) await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', round.week_start).eq('vote', 'skip').in('meal_name', dislikeNames)
      if (rows.length) await admin.from('meal_votes').insert(rows)
      await admin.from('sms_messages').update({ intent: u.dislikes.length && !u.wants.length && !u.allGood ? 'dislike' : 'pick' }).eq('twilio_sid', sid ?? '')
      let addedNote = ''
      if (u.add.length && m.can_add && owner) {
        const weekStart = plan?.week_start ?? mondayOf(new Date())
        for (const item of await cleanItems(u.add)) {
          await admin.from('list_items').insert({ user_id: owner.id, household_id: m.household_id, week_start: weekStart, name: item, category: guessCategory(item), search_term: item, source: 'sms', added_by: m.name })
        }
        addedNote = ` Added to the list: ${u.add.join(', ')}.`
      }
      const parts: string[] = []
      if (u.allGood) parts.push("they all work for you")
      else if (wantNames.length) parts.push(`your picks: ${wantNames.join(', ')}`)
      if (dislikeNames.length) parts.push(`not ${dislikeNames.map((n) => `#${cands.findIndex((c) => c.name === n) + 1} ${n}`).join(' or ')}`)
      if (u.none && !wantNames.length) parts.push('no picks from you this week')
      const ask = !wantNames.length && !u.allGood && !u.none ? ` Which ones DO you want? Reply numbers, e.g. "1 3 5".` : ''
      return { reply: `Got it, ${m.name} — ${parts.join('; ')}.${addedNote}${ask}`, handled: true, member: m }
    }
    if (u?.question) return { reply: `I'm just the dinner bot 🙂 Reply numbers for the dinners you want (e.g. "1 3 5"), or text ${family} directly.`, handled: true, member: m }
  }

  // Unknown but short and food-ish? Treat as add when the member can add and said something list-like.
  if (m.can_add && body.trim().length <= 40 && !/\d/.test(body) && settings.texting.enabled) {
    const [item] = await cleanItems([body.trim()])
    if (owner && item) {
      const weekStart = plan?.week_start ?? mondayOf(new Date())
      const { data: existing } = await admin.from('list_items').select('id, name, have').eq('user_id', owner.id).eq('week_start', weekStart)
      const hit = (existing ?? []).find((e) => normalizeItemName(e.name) === normalizeItemName(item))
      if (hit) { if (hit.have) await admin.from('list_items').update({ have: false }).eq('id', hit.id) }
      else await admin.from('list_items').insert({ user_id: owner.id, household_id: m.household_id, week_start: weekStart, name: item, category: guessCategory(item), search_term: item, source: 'sms', added_by: m.name })
      return { reply: `Added "${item}" to the grocery list. (Text HELP for everything you can do.)`, handled: true, member: m }
    }
  }
  return { reply: `Didn't catch that. Reply numbers to skip dinners, ALL GOOD, ADD + items, MENU, LIST, or HELP.`, handled: true, member: m }
}

/* ------------------------------------------------------------------ */
/* Vote cycle: auto-pick the week, text the choices, watch for replies  */
/* ------------------------------------------------------------------ */


const APP_URL = 'https://www.dinnerdrop.app'

export interface CycleReport { weekStart: string; planned: boolean; optInsSent: number; voteTextsSent: number; skipped: string[] }

/** The planner's own number for "everyone's in" texts. */
export async function ownerPhone(admin: SupabaseClient, owner: OwnerRow): Promise<string | null> {
  const s = mergeSettings(owner.settings)
  const fromSettings = normalizePhone(s.texting.ownerPhone)
  if (fromSettings) return fromSettings
  const { data } = await admin.from('household_members').select('phone').eq('household_id', owner.household_id).eq('profile_id', owner.id).limit(1)
  return normalizePhone(data?.[0]?.phone ?? null)
}

/** Week a vote on `weekday` is for: Sat/Sun vote → the coming Monday; mid-week → this week. */
export function targetWeekFor(now: Date, weekday: string): string {
  if (weekday === 'sat' || weekday === 'sun') {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() + (weekday === 'sat' ? 2 : 1))
    return mondayOf(d)
  }
  return mondayOf(now)
}

export interface VoteRound {
  id: string
  household_id: string
  user_id: string
  week_start: string
  candidates: Meal[]
  picks_needed: number
  status: 'open' | 'closed'
  result: { chosen: string[]; tally: Record<string, number> } | null
  created_at: string
}

export async function openRound(admin: SupabaseClient, householdId: string): Promise<VoteRound | null> {
  const { data } = await admin.from('vote_rounds').select('*').eq('household_id', householdId).eq('status', 'open').order('created_at', { ascending: false }).limit(1)
  return (data?.[0] as VoteRound) ?? null
}

function pickLines(meals: Meal[]): string {
  return meals.map((m, i) => `${i + 1}. ${m.name}${m.cookTime ? ` (${timeLabel(m)})` : ''}`).join('\n')
}

function voteBody(familyName: string, round: VoteRound): string {
  return `DinnerDrop — ${familyName}'s dinner ideas for the week of ${round.week_start.slice(5).replace('-', '/')}:\n${pickLines(round.candidates)}\n\nReply with the numbers you WANT (pick up to ${round.picks_needed}, e.g. "1 3 5"). The top picks make the week. Text ADD + anything for the grocery list.`
}

/**
 * Start a vote round for one household:
 *  1. generate candidate dinners (more than the week needs) — not saved as a plan yet
 *  2. opt-in text to anyone with a number who hasn't joined
 *  3. the candidates to everyone who has, asking for their picks
 * When everyone has answered (or after 24h) the top picks become the week.
 */
export async function startVoteCycle(admin: SupabaseClient, ownerId: string, opts: { now?: Date; force?: boolean } = {}): Promise<CycleReport> {
  const now = opts.now ?? new Date()
  const { data: o } = await admin
    .from('profiles')
    .select('id, household_id, full_name, timezone, settings, subscription_status, is_beta_member, family_until, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs')
    .eq('id', ownerId)
    .single()
  if (!o?.household_id) throw new Error('No household')
  const settings = mergeSettings(o.settings)
  const { weekday } = localNow(o.timezone || 'America/New_York', now)
  const weekStart = targetWeekFor(now, weekday)
  const report: CycleReport = { weekStart, planned: false, optInsSent: 0, voteTextsSent: 0, skipped: [] }
  if (!smsConfigured()) { report.skipped.push('Twilio not configured'); return report }
  if (!settings.texting.enabled) { report.skipped.push('texting off in settings'); return report }
  if (!isFamilyProfile(o)) { report.skipped.push('family plan required'); return report }

  // 1. open round (reuse one already open for this week unless forced)
  const picksNeeded = Math.min(Math.max(settings.plan.dinnersPerWeek, 3), 7)
  const count = Math.min(Math.max(settings.texting.optionsToText, picksNeeded, 5), 12)
  let round = await openRound(admin, o.household_id)
  if (round && round.week_start !== weekStart) { await admin.from('vote_rounds').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', round.id); round = null }
  if (!round || opts.force) {
    if (round) await admin.from('vote_rounds').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', round.id)
    const { meals } = await generateCandidates(admin, o, count)
    if (!meals.length) { report.skipped.push('could not generate dinner ideas'); return report }
    const { data: created } = await admin.from('vote_rounds').insert({ household_id: o.household_id, user_id: o.id, week_start: weekStart, candidates: meals, picks_needed: picksNeeded }).select('*').single()
    round = created as VoteRound
    report.planned = true
  }

  // 2 + 3. members
  const { data: members } = await admin.from('household_members').select('*').eq('household_id', o.household_id).not('phone', 'is', null)
  const family = (o.full_name || '').trim().split(' ')[0] || 'Your family'
  const familyName = family.charAt(0).toUpperCase() + family.slice(1)
  for (const m of (members ?? []) as MemberRow[]) {
    const phone = normalizePhone(m.phone)
    if (!phone) continue
    if (phone !== m.phone) await admin.from('household_members').update({ phone }).eq('id', m.id)
    const mm = { ...m, phone }
    if (mm.phone_opted_out) continue
    if (!mm.phone_opt_in_at) {
      if (await sendOptIn(admin, mm, `${familyName}'s family`)) report.optInsSent++
      continue
    }
    if (!mm.can_vote) continue
    if (!opts.force && await sentForRound(admin, mm.id, round.id)) continue
    if (await textMember(admin, mm, voteBody(familyName, round), `vote_request:${round.id}`, settings.texting.weeklyCap)) report.voteTextsSent++
  }
  return report
}

async function sentForRound(admin: SupabaseClient, memberId: string, roundId: string): Promise<boolean> {
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('intent', `vote_request:${roundId}`)
  return (count ?? 0) > 0
}

/* ---- polling Twilio for replies (no webhook change needed) ---- */

interface TwilioMsg { sid: string; from: string; to: string; body: string; direction: string; date_sent: string }

async function fetchInbound(sinceDays = 2): Promise<TwilioMsg[]> {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) return []
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?To=${encodeURIComponent(from)}&DateSent%3E=${since}&PageSize=100`
  const res = await fetch(url, { headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Twilio list ${res.status}`)
  const json = await res.json()
  return ((json.messages ?? []) as TwilioMsg[]).filter((m) => m.direction === 'inbound')
}

export interface PollReport { fetched: number; handled: number; replies: number; completions: number; errors: string[] }

/** Read new inbound texts from Twilio, handle the ones from our members, reply, then check for finished votes. */
export async function pollInbound(admin: SupabaseClient): Promise<PollReport> {
  const report: PollReport = { fetched: 0, handled: 0, replies: 0, completions: 0, errors: [] }
  let msgs: TwilioMsg[] = []
  try { msgs = await fetchInbound() } catch (e) { report.errors.push(String(e)); return report }
  report.fetched = msgs.length
  if (msgs.length) {
    const { data: seen } = await admin.from('sms_messages').select('twilio_sid').in('twilio_sid', msgs.map((m) => m.sid))
    const seenSet = new Set((seen ?? []).map((r) => r.twilio_sid))
    // oldest first so a YES followed by a vote is processed in order
    for (const m of msgs.filter((x) => !seenSet.has(x.sid)).sort((a, b) => new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime())) {
      try {
        const r = await handleInbound(admin, m.from, m.body, m.sid)
        if (!r.handled || !r.member) continue   // not one of ours (FamCEO's traffic)
        report.handled++
        if (r.reply) {
          const sent = await sendSms(m.from, r.reply)
          await admin.from('sms_messages').insert({ household_id: r.member.household_id, member_id: r.member.id, direction: 'out', to_number: m.from, body: r.reply, intent: 'reply', twilio_sid: sent.sid ?? null })
          report.replies++
        }
        // Just opted in while a vote is open? Send them the menu right away.
        if (parseInbound(m.body).kind === 'optin') {
          const round = await openRound(admin, r.member.household_id)
          if (round) {
            const owner = await ownerForHousehold(admin, r.member.household_id)
            if (owner) await startVoteCycle(admin, owner.id)
          }
        }
      } catch (e) {
        report.errors.push(`${m.sid}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  try { report.completions = await checkVoteCompletion(admin) } catch (e) { report.errors.push(String(e)) }
  return report
}

/**
 * Close rounds where everyone asked has answered (or that are older than 24h):
 * tally picks, top N become the week, nights assigned, planner texted.
 */
export async function checkVoteCompletion(admin: SupabaseClient, opts: { maxAgeHours?: number } = {}): Promise<number> {
  const maxAge = (opts.maxAgeHours ?? 24) * 3600000
  const { data: rounds } = await admin.from('vote_rounds').select('*').eq('status', 'open')
  let n = 0
  for (const round of (rounds ?? []) as VoteRound[]) {
    const { data: asked } = await admin.from('sms_messages').select('member_id').eq('intent', `vote_request:${round.id}`)
    const askedIds = Array.from(new Set((asked ?? []).map((a) => a.member_id).filter(Boolean))) as string[]
    const expired = Date.now() - new Date(round.created_at).getTime() > maxAge
    if (!askedIds.length && !expired) continue
    const { data: answered } = await admin.from('sms_messages').select('member_id').eq('household_id', round.household_id).eq('direction', 'in').gte('created_at', round.created_at).in('intent', ['allgood', 'skip', 'none', 'pick', 'dislike'])
    const answeredIds = new Set((answered ?? []).map((a) => a.member_id))
    const everyone = askedIds.length > 0 && askedIds.every((id) => answeredIds.has(id))
    if (!everyone && !expired) continue
    await finalizeRound(admin, round, { everyone, askedIds })
    n++
  }
  return n
}

export async function finalizeRound(admin: SupabaseClient, round: VoteRound, ctx: { everyone: boolean; askedIds: string[] }): Promise<void> {
  const owner = await ownerForHousehold(admin, round.household_id)
  if (!owner) return
  const settings = mergeSettings(owner.settings)
  const { data: votes } = await admin.from('meal_votes').select('meal_name, vote, member_id, household_members(name)').eq('household_id', round.household_id).eq('week_start', round.week_start).in('vote', ['keep', 'skip']).gte('created_at', round.created_at)
  const tally: Record<string, number> = {}
  const voters: Record<string, string[]> = {}
  for (const c of round.candidates) tally[c.name] = 0
  for (const v of (votes ?? []) as Array<{ meal_name: string; vote: string; household_members: { name: string } | { name: string }[] | null }>) {
    if (!(v.meal_name in tally)) continue
    tally[v.meal_name] += v.vote === 'skip' ? -1 : 1
    if (v.vote === 'keep') {
      const hm = Array.isArray(v.household_members) ? v.household_members[0] : v.household_members
      ;(voters[v.meal_name] ??= []).push(hm?.name ?? 'someone')
    }
  }
  // top N by votes; ties keep the planner's order (candidate index)
  const ranked = round.candidates.map((c, i) => ({ c, i, votes: tally[c.name] ?? 0 })).sort((a, b) => b.votes - a.votes || a.i - b.i)
  const chosen = ranked.slice(0, round.picks_needed).map((r) => r.c)
  const shape: PlanShape = { dinnersPerWeek: round.picks_needed, cookDays: settings.plan.cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  const saved = await savePlan(admin, owner.id, round.week_start, chosen, shape)
  await admin.from('vote_rounds').update({ status: 'closed', closed_at: new Date().toISOString(), result: { chosen: saved.map((m) => m.name), tally } }).eq('id', round.id)

  const { data: names } = ctx.askedIds.length ? await admin.from('household_members').select('name').in('id', ctx.askedIds) : { data: [] as Array<{ name: string }> }
  const who = (names ?? []).map((x) => x.name).join(', ')
  const lines = saved.map((m) => `• ${m.day.slice(0, 3)}: ${m.name}${tally[m.name] ? ` (${tally[m.name]} ${tally[m.name] === 1 ? 'vote' : 'votes'}${voters[m.name]?.length ? ` — ${voters[m.name].join(', ')}` : ''})` : ''}`)
  const head = ctx.everyone ? `DinnerDrop: everyone's voted${who ? ` (${who})` : ''}.` : `DinnerDrop: voting closed${who ? ` — heard from ${who}` : ''}.`
  const body = `${head} The week is set:\n${lines.join('\n')}\n\nNext: add anything else you need to the list, then approve the order → ${APP_URL}/grocery-list`
  const to = await ownerPhone(admin, owner)
  const r = to ? await sendSms(to, body) : { sid: undefined }
  await admin.from('sms_messages').insert({ household_id: round.household_id, direction: 'out', to_number: to, body, intent: 'vote_complete', twilio_sid: r.sid ?? null })
}
