/**
 * Family texting (Twilio toll-free). Family members get the week's dinners to
 * vote on, can text foods to add to the grocery list, and manage opt-in/STOP.
 *
 * Outbound day jobs run from the daily cron; inbound is /api/sms/inbound.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasMix, scaleMix, pickByQuota, proteinGroup } from '@/lib/protein-mix'
import { mergeSettings, tripsConfig, keepOneSunday, isSundayDinner, sundayOptions, type Settings } from '@/lib/settings'
import { isClassic, resolveTrips, shoppingTrip, tripInstances, voteTripOn } from '@/lib/trips'
import { localNow, mondayOf } from '@/lib/plan'
import { sendSms, smsConfigured, normalizePhone } from '@/lib/notify'
import { isFamilyProfile } from '@/lib/access'
import { generateCandidates, savePlan } from '@/lib/autoplan'
import { markSuggestionsUsed, pendingSuggestions, resolveSuggestion, type Suggestion } from '@/lib/suggestions'
import { timeLabel, type PlanShape } from '@/lib/plan'
import { tapVoteUrl, againTapUrl } from '@/lib/tap-vote'
import { guessCategory, normalizeItemName } from '@/lib/list'
import { generateWithClaude, generateWithClaudeImage, generateSmart, parseClaudeJSON } from '@/lib/claude'
import { looksLikeFlyer, salesFromImage, saveSales } from '@/lib/sales'
import { blendFactor, factorAtSend } from '@/lib/prices'
import { markAllOpenOrdered } from '@/lib/list-ordered'
import { walmartUrlsIn, resolveWalmartLink, type WalmartLink } from '@/lib/store-links'
import { cartUrl } from '@/lib/walmart'
import type { Meal } from '@/types'
import { buildFamilyRecipes, describeDinnerFromPhotos, saveFamilyRecipes } from '@/lib/family-recipes'
import { leaderLabel, getDraft, setDraft, clearDraft, draftRoundIds, dueDrafts, parseLeaderCommand, getAsk, putAsk, openAsks, askIsLive, askSummary, askAck, askText, ASK_WINDOW_MIN, type LeaderCommand, type FamilyAsk } from '@/lib/family-ask'
import { reorderAsked, reorderCartReply } from '@/lib/reorder'
import { sendFamilyText } from '@/lib/send-window'
import { keepInBudget } from '@/lib/budget'
import { needsConfirmation, activeNeeds, applyNeeds, NEEDS_TIMING_ASK, type MemberNeed } from '@/lib/member-needs'

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
  profile_id?: string | null
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

/** Fit the plan's dinners to the household's health needs now (starch side + plate notes); returns how many changed. */
export async function fitPlanToNeeds(admin: SupabaseClient, ownerId: string, plan: { id: string; meals: Meal[] }): Promise<number> {
  const { data: prof } = await admin.from('profiles').select('settings, household_id, dietary_needs').eq('id', ownerId).maybeSingle()
  if (!prof?.household_id) return 0
  const s = mergeSettings(prof.settings)
  const { data: mem } = await admin.from('household_members').select('id, name, allergies, dislikes').eq('household_id', prof.household_id)
  const people = activeNeeds(s.health, ((mem ?? []) as Array<{ id: string; name: string; allergies: string[] | null; dislikes: string[] | null }>).map((x) => ({ id: x.id, name: x.name, avoid: [...(x.allergies ?? []), ...(x.dislikes ?? [])] })))
  if (!people.length) return 0
  const glutenFree = ((prof.dietary_needs ?? []) as string[]).some((d) => /gluten/i.test(d)) || ((mem ?? []) as Array<{ allergies: string[] | null }>).some((x) => (x.allergies ?? []).some((a) => /gluten|wheat|celiac/i.test(a)))
  const next = applyNeeds(plan.meals, people, { glutenFree })
  const changed = next.filter((x, i) => JSON.stringify(x) !== JSON.stringify(plan.meals[i])).length
  if (changed) await admin.from('meal_plans').update({ meals: next, grocery_list: null }).eq('id', plan.id)
  return changed
}

/** What the bot knows to answer food, cooking and grocery questions: the week, tonight's recipe, the open list, the household's needs. */
export async function foodFacts(admin: SupabaseClient, m: MemberRow, owner: OwnerRow | null, plan: { week_start: string } | null, meals: Meal[], tz: string, settings: Settings): Promise<Partial<BotFacts>> {
  const facts: Partial<BotFacts> = {}
    const tn = tonightMeal(meals, tz); if (tn) facts.tonight = `${tn.name}${tn.cookTime ? ` (${tn.cookTime} min)` : ''}`
    if (owner) {
      const { data: open } = await admin.from('list_items').select('name').eq('user_id', owner.id).eq('week_start', plan?.week_start ?? mondayOf(new Date())).is('ordered_at', null).eq('have', false).eq('checked', false).limit(60)
      facts.listCount = open?.length ?? undefined
      facts.listItems = (open ?? []).map((r) => r.name).slice(0, 60)
    }
    // For the food & cooking assistant: the week, tonight's recipe, and who can't eat what (so answers respect it).
    facts.menu = meals.map((x, i) => `${i + 1}. ${x.day ? `${x.day} — ` : ''}${x.name}${x.cookedAt ? ' (cooked)' : ''}`)
    if (tn) facts.tonightRecipe = `Ingredients: ${(tn.ingredients ?? []).map((g) => `${g.quantity ?? ''} ${g.unit ?? ''} ${g.name}`.replace(/\s+/g, ' ').trim()).join('; ').slice(0, 900)}. Steps: ${(tn.steps ?? []).map((st, i) => `${i + 1}) ${st}`).join(' ').slice(0, 1400)}${tn.side?.name ? ` Side: ${tn.side.name}.` : ''}${tn.plateNotes?.length ? ` Plate notes: ${tn.plateNotes.join(' ')}` : ''}`
    const { data: people } = await admin.from('household_members').select('id, name, role, allergies, dislikes').eq('household_id', m.household_id)
    const health = settings.health ?? {}
    facts.people = ((people ?? []) as Array<{ id: string; name: string; role: string; allergies: string[] | null; dislikes: string[] | null }>).map((x) => {
      const bits: string[] = []
      if (x.allergies?.length) bits.push(`allergic/can't have: ${x.allergies.join(', ')}`)
      if (x.dislikes?.length) bits.push(`won't eat: ${x.dislikes.join(', ')}`)
      const h = health[x.id]
      if (h?.carbs === 'every_meal') bits.push('needs a starch with every meal')
      if (h?.carbs === 'limit') bits.push(`keeps carbs low${h.carbsPerDay ? ` (~${h.carbsPerDay} g/day)` : ''}`)
      return `${x.name}${x.id === m.id ? ' (the person texting)' : ''}${x.role === 'kid' ? ' (kid)' : ''}${bits.length ? ': ' + bits.join('; ') : ''}`
    }).slice(0, 10)
  return facts
}

export async function latestPlan(admin: SupabaseClient, userId: string): Promise<{ id: string; week_start: string; meals: Meal[] } | null> {
  const { data } = await admin.from('meal_plans').select('id, week_start, meals').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single()
  return data ? { id: data.id, week_start: data.week_start, meals: (data.meals as Meal[]) ?? [] } : null
}

const DAY_INDEX: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }

/**
 * Dinners the family has already had: planned for a night in the last 7 days, before today
 * (Sarah, Oct 29 2026: the "which should come back?" text listed this week's Thu/Fri dinners nobody
 * had eaten yet). Looks across this week's and last week's plans; oldest first, one per name.
 */
export async function recentDinners(admin: SupabaseClient, userId: string, todayStr: string): Promise<Meal[]> {
  const { data } = await admin.from('meal_plans').select('week_start, meals, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(8)
  const today = new Date(todayStr + 'T12:00:00Z').getTime()
  const seen = new Set<string>()
  const out: Array<{ meal: Meal; at: number }> = []
  const plans = (data ?? []) as Array<{ week_start: string; meals: Meal[]; created_at: string }>
  // When each week was first planned: a dinner on a night before that can't have been had
  // (Nov 12 2026: a family who set up on Thursday was asked that morning whether Monday's and
  // Tuesday's dinners should come back). A re-plan keeps the week's original date.
  const firstPlanned = new Map<string, number>()
  for (const p of plans) {
    const t = new Date(p.created_at).getTime()
    if (p.week_start && Number.isFinite(t)) firstPlanned.set(p.week_start, Math.min(firstPlanned.get(p.week_start) ?? Infinity, t))
  }
  // Newest plan per week wins (a re-planned week replaces the old one).
  const weeks = new Set<string>()
  for (const p of plans) {
    if (!p.week_start || weeks.has(p.week_start)) continue
    weeks.add(p.week_start)
    const start = new Date(p.week_start + 'T12:00:00Z').getTime()
    // Shopping-trip weeks can start on any weekday: a day name means its first occurrence on or
    // after week_start, not week_start + Monday-based offset (Nov 12 2026: a Tuesday-start week
    // put Wednesday's dinner on Thursday and left it off the list).
    const startIdx = (new Date(start).getUTCDay() + 6) % 7 // Monday = 0
    const since = firstPlanned.get(p.week_start) ?? 0
    for (const m of p.meals ?? []) {
      const idx = DAY_INDEX[String(m.day ?? '').slice(0, 3).toLowerCase()]
      if (idx === undefined) continue
      const at = start + ((idx - startIdx + 7) % 7) * 86400000
      if (at >= today || at < today - 7 * 86400000) continue
      // Planned after that night had passed (end of that day): never cooked from this plan.
      if (since > at + 24 * 3600000) continue
      const key = m.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ meal: m, at })
    }
  }
  return out.sort((a, b) => a.at - b.at).map((x) => x.meal)
}

/** The numbered dinners from the last "which should come back?" text we sent this person. */
function againListFrom(body: string | null | undefined): string[] {
  return Array.from(String(body ?? '').matchAll(/^\d+\.\s+(?:[A-Z][a-z]{2}\s+—\s+)?(.+)$/gm)).map((m) => m[1].trim())
}

async function sentThisWeek(admin: SupabaseClient, memberId: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  // Only proactive texts count toward the weekly cap — replies to their own messages and the opt-in don't.
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('direction', 'out').gte('created_at', since).not('intent', 'in', '("reply","opt_in","dinner_ask")')
  return count ?? 0
}

async function alreadySent(admin: SupabaseClient, householdId: string, intent: string, days = 5): Promise<boolean> {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('household_id', householdId).eq('intent', intent).gte('created_at', since)
  return (count ?? 0) > 0
}

export async function textMember(admin: SupabaseClient, m: MemberRow, body: string, intent: string, cap?: number, mediaUrl?: string): Promise<boolean> {
  if (!m.phone || !m.phone_opt_in_at || m.phone_opted_out) return false
  if (cap !== undefined && (await sentThisWeek(admin, m.id)) >= cap) return false
  // Held until the family's texting hours if needed (lib/send-window).
  const r = await sendFamilyText(admin, { householdId: m.household_id, memberId: m.id, to: m.phone, body, intent, mediaUrl })
  return r === 'sent' || r === 'queued'
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
      const { weekday, dateStr } = localNow(o.timezone || 'America/New_York', now)
      // Shopping trips (Nov 1 2026): the vote goes out the day before each trip that has voting on.
      const tcfg = tripsConfig(settings)
      const vt = isClassic(tcfg) ? null : voteTripOn(tcfg, dateStr)
      const isVote = isClassic(tcfg) ? settings.texting.voteDay === weekday : !!vt && resolveTrips(tcfg)[vt.index]?.vote !== false
      const isAgain = settings.texting.againDay === weekday
      if (!isVote && !isAgain) continue

      // Vote day: auto-pick the week if needed, opt-in anyone new, text the menu.
      if (isVote && (vt || !(await alreadySent(admin, o.household_id, 'vote_request')))) {
        const r = await startVoteCycle(admin, o.id, { now })
        report.voteTexts += r.voteTextsSent
        if (r.skipped.length) report.skipped++
      }
      // "Bring it back?" day: only to people already opted in, about the current plan.
      if (isAgain && !(await alreadySent(admin, o.household_id, 'again_request'))) {
        // Only dinners they've actually had (last 7 days, before today) — never ones still coming up.
        const had = await recentDinners(admin, o.id, localNow(o.timezone || 'America/New_York', now).dateStr)
        if (had.length < 2) { report.skipped++; continue }
        const plan = { meals: had }
        const { data: members } = await admin.from('household_members').select('*').eq('household_id', o.household_id).not('phone', 'is', null)
        const voters = ((members ?? []) as MemberRow[]).filter((m) => m.can_vote && m.phone_opt_in_at && !m.phone_opted_out)
        const body = `DinnerDrop — which dinners should come back soon?\n${menuLines(plan.meals)}\n\nReply AGAIN + numbers (e.g. "again 1 3"), or NONE.`
        // Tap version (Nov 8 2026): the same dinners as photos; votes file under the current plan week, like texted numbers.
        const cur = await latestPlan(admin, o.id)
        for (const m of voters) {
          const tap = cur && !(settings.texting.tapVoteOffIds ?? []).includes(m.id)
            ? `\n\nOr tap the ones to bring back (with photos): ${await againTapUrl(admin, { ownerId: o.id, memberId: m.id, weekStart: cur.week_start, meals: plan.meals.map((x) => x.name), day: dateStr })}`
            : ''
          if (await textMember(admin, m, body + tap, 'again_request', settings.texting.weeklyCap)) report.againTexts++
        }
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
  | { kind: 'list' } | { kind: 'menu' } | { kind: 'prefs' }
  | { kind: 'allgood' } | { kind: 'none' } | { kind: 'thanks' }
  | { kind: 'skip'; numbers: number[]; explicit?: boolean } | { kind: 'again'; numbers: number[] }
  | { kind: 'add'; items: string[] }
  | { kind: 'order_total'; total: number; store?: string }
  | { kind: 'use_up'; items: string[] }
  | { kind: 'tally' } | { kind: 'tonight' } | { kind: 'recipe'; number: number }
  | { kind: 'suggest'; items: string[] }
  | { kind: 'save_recipe'; text: string }
  | { kind: 'text_only' }
  | { kind: 'unknown' }

/** "save this: kielbasa and pierogies", "our recipe - …", "family recipe: …" → the family's own dinner, saved to favorites. */
export const SAVE_RECIPE_RE = /^(?:save(?: this| that| it| our| my)?(?: recipe| dinner)?|our recipe|my recipe|family recipe|add (?:a |our |my )?recipe|new recipe)\s*[:\-–]?\s+([\s\S]+)$/i

export function parseInbound(raw: string): Parsed {
  const t = raw.trim()
  const u = t.toUpperCase()
  // Whole-message commands only: "no i want that again" or "ok add milk" are sentences for the AI step, not NONE / YES.
  const end = String.raw`[\s.!?]*$`
  if (new RegExp(`^(YES|Y|JOIN|YEP|YEAH|SURE|OK|OKAY)(\\s+(PLEASE|THANKS|THANK YOU))?${end}`).test(u)) return { kind: 'optin' }
  if (/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)\b/.test(u)) return { kind: 'stop' }
  if (/^(START|UNSTOP|RESUME)\b/.test(u)) return { kind: 'start' }
  if (new RegExp(`^(HELP|INFO|\\?)${end}`).test(u)) return { kind: 'help' }
  if (new RegExp(`^(LIST|GROCERY|GROCERIES|GROCERY LIST|THE LIST)${end}`).test(u)) return { kind: 'list' }
  // PREFS (approved Nov 2 2026, from Rich: "I should be able to see my preferences").
  if (new RegExp(`^(PREFS?|PREFERENCES|MY (PREFS?|PREFERENCES|PROFILE|TASTES?|LIKES|FOODS?)|WHAT (DO I|I) LIKE|WHAT ARE MY (PREFS?|PREFERENCES|LIKES|TASTES?)|SHOW (ME )?MY (PREFS?|PREFERENCES|PROFILE|TASTES?)|(CAN I )?SEE MY (PREFS?|PREFERENCES|PROFILE|TASTES?))${end}`).test(u)) return { kind: 'prefs' }
  // A bare "Add" (Lucas, Nov 1): ask what to add instead of guessing.
  if (new RegExp(`^(ADD|NEED|BUY|GET|GRAB)${end}`).test(u)) return { kind: 'add', items: [] }
  if (new RegExp(`^(TONIGHT|WHAT'?S (FOR )?DINNER TONIGHT|DINNER TONIGHT|WHAT'?S TONIGHT|WHAT ARE WE (HAVING|EATING) TONIGHT)${end}`).test(u)) return { kind: 'tonight' }
  if (new RegExp(`^(MENU|DINNERS|PLAN|THIS WEEK|WHAT'?S FOR DINNER( THIS WEEK)?|WHAT'?S THE PLAN)${end}`).test(u)) return { kind: 'menu' }
  if (new RegExp(`^(TALLY|RESULTS?|SCORE|STANDINGS|VOTES?|VOTE (SO FAR|STATUS|COUNT|RESULTS?)|WHO('?S| HAS)? VOTED|WHAT'?S THE VOT(E|ING)( SO FAR)?|HOW'?S THE VOT(E|ING)( GOING)?|WHO'?S WINNING)${end}`).test(u)) return { kind: 'tally' }
  if (new RegExp(`^(TEXT ONLY|TEXT|PLAIN|PLAIN TEXT|NO PICS|NO PICTURES?|WORDS ONLY|JUST TEXT|SEND (IT )?AS TEXT)${end}`).test(u)) return { kind: 'text_only' }
  const saveRecipe = t.match(SAVE_RECIPE_RE)
  if (saveRecipe && saveRecipe[1].trim().length >= 3 && !/^#?\s*\d{1,2}[\s.!?]*$/.test(saveRecipe[1])) return { kind: 'save_recipe', text: saveRecipe[1].trim() }
  const recipe = u.match(/^(?:RECIPE|INGREDIENTS(?: FOR)?|HOW (?:DO I|DO YOU|TO) (?:MAKE|COOK))\s*#?\s*(\d{1,2})[\s.!?]*$/)
  if (recipe) return { kind: 'recipe', number: Number(recipe[1]) }
  const suggest = t.match(/^(?:(?:can|could|may) (?:i|we) |i'?d like to |i want to |i wanna )?(?:suggest|recommend|request|propose)(?:ing)?\s*(?:a|an|some)?\s*[:\-]?\s*(.*)$|^(?:how about|what about|can we (?:do|have|make|get)|could we (?:do|have|make)|let'?s (?:do|have|make)|we should (?:do|have|make|try)|i'?d love|put on|idea[:\-]?)\s+(.+)$/i)
  if (suggest) {
    const what = (suggest[1] ?? suggest[2] ?? '').trim().replace(/[?!.]+$/, '')
    if (!/^\d[\d\s,and&]*$/.test(what)) return { kind: 'suggest', items: /^(meals?|dinners?|something|a meal|a dinner|ideas?|one|things?|food|)$/i.test(what) ? [] : splitDishes(what) }
  }
  if (new RegExp(`^(ALL ?GOOD|ALL|GOOD|KEEP ?ALL|LOOKS GOOD|👍|LGTM|FINE|ALL OF THEM)${end}`).test(u)) return { kind: 'allgood' }
  if (new RegExp(`^(NONE|NO|NOPE|NAH|NONE OF THEM)${end}`).test(u)) return { kind: 'none' }
  if (new RegExp(`^(THANKS|THANK YOU|THANKS!|THX|TY|COOL|GREAT|AWESOME|❤️|🙏)( SO MUCH| YOU)?${end}`).test(u)) return { kind: 'thanks' }
  // "ORDER 317.97", "total 317.97", "it came to $317.97", "order was $317" — the planner recording the real bill.
  const order = t.match(/^(?:order|total|order total|bill|it came to|came to|cost|spent|paid)\s*(?:was|is|came to|:)?\s*\$?\s*(\d{1,4}(?:[.,]\d{2})?)\s*(?:(?:at|@|from)\s+)?([A-Za-z'&. ]{2,30})?\s*$/i)
  if (order) return { kind: 'order_total', total: Number(order[1].replace(',', '.')), store: order[2]?.trim() || undefined }
  const again = u.match(/^(AGAIN|REPEAT|BRING BACK)\s*[:\-]?\s*((?:\d+|\s|,|&|AND)+)$/)
  if (again) return { kind: 'again', numbers: numbersIn(again[2]) }
  const useup = t.match(/^(?:use up|use first|expiring|going bad|have to use|must use|in the fridge)\s*[:\-]?\s*(.+)$/i)
  if (useup) return { kind: 'use_up', items: splitItems(useup[1]) }
  // Whole words only, and not a sentence: "Addressing me by name…" and "Need to know what's for dinner" aren't grocery adds
  // (approved Nov 2 2026). Sentences go to the AI step instead.
  const add = t.match(/^(?:(?:add|need|we need|we'?re out of|out of|get|buy|pick up|grab)\b|\+)(?!\s+(?:to|you|me|us|a way|help|it|that|this|my|your|more time|the (?:vote|votes|menu|recipe|plan|link|pics?|pictures?))\b)\s*[:\-]?\s*(.+)$/i)
  if (add && !(add[1].split(/\s+/).length > 7 && !/[,\n]/.test(add[1]))) return { kind: 'add', items: splitItems(add[1]) }
  const skip = u.match(/^(SKIP|NOT|NO|DROP)?\s*[:\-]?\s*((?:\d+|\s|,|&|AND)+)$/)
  if (skip && numbersIn(skip[2]).length) return { kind: 'skip', numbers: numbersIn(skip[2]), explicit: !!skip[1] }
  return { kind: 'unknown' }
}

function numbersIn(s: string): number[] {
  return Array.from(new Set((s.match(/\d+/g) ?? []).map(Number).filter((n) => n >= 1 && n <= 20)))
}
/** Dish ideas: "spaghetti and meatballs" is one dish; commas / "or" / newlines separate several. */
function splitDishes(s: string): string[] {
  return s.split(/,|;|\n|\bor\b/i).map((x) => x.trim().replace(/^(a|an|some|the)\s+/i, '').replace(/[.!?]+$/, '')).filter((x) => x.length >= 2 && x.length <= 60)
}
function splitItems(s: string): string[] {
  return s.split(/,|\band\b|&|\n|;/i).map((x) => x.trim().replace(/[.!]+$/, '')).filter((x) => x.length >= 2 && x.length <= 60)
}


export interface CleanItem { name: string; quantity: string; unit: string }

/** "banannad" → bananas, 1 bunch · "2 gallons milk" → milk, 2 gallon · "Like kielbasa also" → kielbasa, 1 package. "" = not a grocery item. */
export async function cleanItems(raw: string[]): Promise<CleanItem[]> {
  const items = raw.map((x) => x.trim()).filter(Boolean)
  if (!items.length) return []
  try {
    const text = await generateWithClaude(
      `A family member texted these grocery items. Return every product they want as its own object, in order: a clean shoppable product name (fix typos, drop filler like "like"/"also"/"please"/"some", keep brand names, plural for produce) and the quantity to buy: use the amount they wrote if any, otherwise a sensible single-purchase default (bananas → 1 bunch, milk → 1 gallon, eggs → 1 dozen, Dr Pepper → 1 12-pack, chicken → 1 lb, snack bars → 1 box, paper towels → 1 pack). Units from: whole, bunch, lb, oz, gallon, half-gallon, quart, dozen, bag, box, can, jar, bottle, pack, 12-pack, loaf, head, package. IMPORTANT: a single entry often lists several products run together with spaces or no punctuation — "steak cheese cold cuts pepperoni eggs" is FIVE items (steak; cheese; cold cuts; pepperoni; eggs), "2 gallons milk and bread" is two — split those into separate objects; keep multi-word product names together (cold cuts, peanut butter, ground beef, orange juice). Skip anything that isn't a grocery/household item. Return ONLY a flat JSON array: [{"name":"","quantity":"1","unit":"bunch"}, ...]\n${JSON.stringify(items)}`,
      800,
    )
    const out = parseClaudeJSON<Array<{ name?: string; quantity?: string | number; unit?: string }>>(text)
    if (Array.isArray(out) && out.length) {
      const seen = new Set<string>()
      return out
        .map((x) => ({ name: typeof x?.name === 'string' ? x.name.trim().slice(0, 60) : '', quantity: String(x?.quantity ?? '1').trim() || '1', unit: typeof x?.unit === 'string' ? x.unit.trim() : '' }))
        .filter((x) => x.name && !seen.has(normalizeItemName(x.name)) && seen.add(normalizeItemName(x.name)))
        .slice(0, 25)
    }
  } catch { /* fall through */ }
  return items.map((name) => ({ name, quantity: '1', unit: '' }))
}

export interface Standing { name: string; votes: number; by: string[]; skippedBy: string[]; inWeek: boolean }
export interface Standings { candidates: Standing[]; people: Array<{ id: string; name: string; status: string }> }

/** Running tally of an open round plus who has answered — shared by the dashboard card and the TALLY text. */
export async function roundStandings(admin: SupabaseClient, round: VoteRound): Promise<Standings> {
  const [{ data: asked }, { data: answered }, { data: votes }, { data: members }, { data: owner }] = await Promise.all([
    admin.from('sms_messages').select('member_id').eq('intent', `vote_request:${round.id}`),
    admin.from('sms_messages').select('member_id').eq('household_id', round.household_id).eq('direction', 'in').gte('created_at', round.created_at).in('intent', ['allgood', 'skip', 'none', 'pick', 'dislike']),
    admin.from('meal_votes').select('meal_name, member_id, vote').eq('household_id', round.household_id).eq('week_start', round.week_start).in('vote', ['keep', 'skip']).gte('created_at', round.created_at),
    admin.from('household_members').select('id, name, phone, phone_opt_in_at, phone_opted_out, can_vote').eq('household_id', round.household_id),
    admin.from('profiles').select('settings').eq('id', round.user_id).maybeSingle(),
  ])
  const askedIds = new Set((asked ?? []).map((a) => a.member_id))
  const answeredIds = new Set((answered ?? []).map((a) => a.member_id))
  const byId = new Map((members ?? []).map((m) => [m.id, m]))
  const tally: Record<string, { votes: number; by: string[]; skippedBy: string[] }> = {}
  for (const cnd of round.candidates) tally[cnd.name] = { votes: 0, by: [], skippedBy: [] }
  for (const v of votes ?? []) {
    const t = tally[v.meal_name]; if (!t) continue
    const nm = byId.get(v.member_id)?.name
    if (v.vote === 'skip') { t.votes--; if (nm && !t.skippedBy.includes(nm)) t.skippedBy.push(nm); continue }
    t.votes++; if (nm && !t.by.includes(nm)) t.by.push(nm)
  }
  const settings = mergeSettings(owner?.settings)
  const ranked = round.candidates.map((cnd, i) => ({ cnd, i, votes: tally[cnd.name]?.votes ?? 0 })).sort((a, b) => b.votes - a.votes || a.i - b.i)
  const mix = hasMix(settings.food.mix) ? scaleMix(settings.food.mix, round.picks_needed) : null
  const inWeek = new Set(keepOneSunday(mix ? pickByQuota(ranked, round.picks_needed, mix, (r) => proteinGroup(r.cnd.protein, r.cnd.name)) : ranked.slice(0, round.picks_needed), ranked, (r) => r.cnd, settings.plan.sundayDinner?.on === true).map((r) => r.cnd.name))
  const people = (members ?? []).filter((m) => m.phone).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    status: m.phone_opted_out ? 'opted out' : !m.phone_opt_in_at ? 'waiting for YES' : answeredIds.has(m.id) ? 'answered' : askedIds.has(m.id) ? 'sent, waiting' : m.can_vote ? 'not sent yet' : 'no vote',
  }))
  return { candidates: round.candidates.map((cnd) => ({ name: cnd.name, inWeek: inWeek.has(cnd.name), ...tally[cnd.name] })), people }
}

/** The TALLY text: standings in candidate order with who picked / skipped, then who's still out. */
function tallyText(round: VoteRound, st: Standings): string {
  const lines = round.candidates.map((c, i) => {
    const t = st.candidates.find((x) => x.name === c.name)
    const who = [...(t?.by ?? []), ...(t?.skippedBy ?? []).map((n) => `${n} ✗`)]
    const v = t?.votes ?? 0
    return `${t?.inWeek ? '★ ' : ''}${i + 1}. ${c.name} — ${v > 0 ? '+' : ''}${v}${who.length ? ` (${who.join(', ')})` : ''}`
  })
  const out = st.people.filter((p) => p.status === 'sent, waiting' || p.status === 'waiting for YES').map((p) => p.name)
  return `Vote so far (★ = making the week):\n${lines.join('\n')}${out.length ? `\n\nStill waiting on ${out.join(', ')}.` : '\n\nEveryone has answered.'}`
}

export type { Suggestion }

/** Dinner ideas family members texted ("how about tacos") — kept on the planner's settings for the next plan. */
export async function addSuggestions(admin: SupabaseClient, owner: OwnerRow, by: string, names: string[]): Promise<Suggestion[]> {
  const cur = (((owner.settings as Record<string, unknown> | null)?.suggestions as Suggestion[] | undefined) ?? []).filter((x) => x && typeof x.name === 'string')
  const now = new Date().toISOString()
  const fresh = names.map((n) => ({ name: n.slice(0, 60), by, at: now })).filter((n) => !cur.some((c) => !c.usedAt && normalizeItemName(c.name) === normalizeItemName(n.name)))
  const next = [...fresh, ...cur].slice(0, 30)
  await admin.from('profiles').update({ settings: { ...((owner.settings as object) ?? {}), suggestions: next } }).eq('id', owner.id)
  return next
}

/** Tonight's dinner from the plan (by the family's local weekday), if the week has one. */
function tonightMeal(meals: Meal[], timezone: string): Meal | null {
  const wd = localNow(timezone).weekday
  const label: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
  return meals.find((m) => m.day === label[wd]) ?? null
}

/** A recipe as one text (ingredients + steps, trimmed to fit a long SMS). */
function recipeText(m: Meal): string {
  const ings = (m.ingredients ?? []).map((i) => `• ${[i.quantity, i.unit, i.name].filter(Boolean).join(' ').trim()}`)
  const steps = (m.steps ?? []).map((st, i) => `${i + 1}. ${st}`)
  let out = `${m.name}${m.cookTime ? ` · ${m.cookTime} min` : ''}${m.servings ? ` · ${m.servings} servings` : ''}\n\nYou need:\n${ings.join('\n')}\n\nSteps:\n${steps.join('\n')}`
  if (out.length > 1500) out = out.slice(0, 1480).replace(/\s+\S*$/, '') + '…'
  return out
}

export interface InboundResult { reply: string; handled: boolean; member?: MemberRow; intent?: string }

/** Handle a text from a known member. Returns the reply to send (via TwiML). */
/**
 * A family member joins by texting "JOIN <code> <first name>" from the link the planner shared (/join/<code>,
 * Nov 9 2026: typing everyone's numbers in setup almost never happened). <code> is the planner's referral code.
 * Texting us themselves is the opt-in. Unknown numbers that don't say JOIN are left alone, as before.
 */
async function joinByText(admin: SupabaseClient, phone: string, body: string, sid: string | null): Promise<InboundResult> {
  const j = body.trim().match(/^join\s+([a-z0-9]{6,10})\b\s*(.{0,40})$/i)
  if (!j) return { reply: '', handled: false }
  const { data: owner } = await admin.from('profiles').select('id, household_id, full_name').eq('referral_code', j[1].toUpperCase()).maybeSingle()
  // Not a DinnerDrop family code: leave it alone (this number is shared with FamCEO, which may have its own JOIN codes).
  if (!owner?.household_id) return { reply: '', handled: false }
  const name = (j[2] || '').replace(/[^A-Za-z0-9À-ÿ '.-]/g, '').trim().split(/\s+/)[0]?.slice(0, 30) || 'Family'
  const nice = name.charAt(0).toUpperCase() + name.slice(1)
  const now = new Date().toISOString()
  const { data: row } = await admin.from('household_members').insert({ household_id: owner.household_id, name: nice, role: 'adult', age_band: 'adult', phone, phone_opt_in_at: now, phone_opted_out: false, can_vote: true, can_add: true }).select('*').single()
  await admin.from('sms_messages').insert({ household_id: owner.household_id, member_id: row?.id ?? null, direction: 'in', from_number: phone, body, intent: 'join', twilio_sid: sid })
  try { await admin.from('activation_events').insert({ user_id: owner.id, step: 'texting_setup', meta: { via: 'join_link' } }) } catch { /* tracking only */ }
  const first = (owner.full_name || '').trim().split(' ')[0]
  const fam = first ? `${first.charAt(0).toUpperCase() + first.slice(1)}'s family` : 'the family'
  // Let the planner know who joined.
  const { data: me } = await admin.from('household_members').select('*').eq('household_id', owner.household_id).eq('profile_id', owner.id).not('phone', 'is', null).limit(1)
  if (me?.[0]) await textMember(admin, me[0] as MemberRow, `DinnerDrop: ${nice} joined the family dinner texts. 🎉`, 'member_joined')
  return {
    reply: `DinnerDrop: welcome${nice !== 'Family' ? `, ${nice}` : ''}! You're in ${fam}'s dinner texts. You'll get the week's dinner ideas to vote on, and you can text ADD + anything (like ADD granola bars) to put it on the grocery list. Reply STOP anytime.`,
    handled: true,
    member: row as MemberRow | undefined,
  }
}

export async function handleInbound(admin: SupabaseClient, from: string, body: string, sid: string | null): Promise<InboundResult> {
  const phone = normalizePhone(from) ?? from
  // One phone can sit on two rows (the planner's number typed in a family row): prefer the planner's own row.
  const { data: mrows } = await admin.from('household_members').select('*').eq('phone', phone).order('profile_id', { ascending: true, nullsFirst: false }).limit(5)
  const rowsForPhone = (mrows ?? []) as MemberRow[]
  const m = rowsForPhone.find((r) => r.profile_id) ?? rowsForPhone[0]
  if (!m) return joinByText(admin, phone, body, sid)

  let parsed = parseInbound(body)
  const round = await openRound(admin, m.household_id)
  // What did we last ask this person, and what was just said? (Read before this message is logged.)
  const ctx = await smsContext(admin, m.id)
  // Bare numbers answer the question we asked: after "which should come back?" they mean AGAIN, not skip.
  if (parsed.kind === 'skip' && !parsed.explicit && !round && ctx.lastAsk === 'again') parsed = { kind: 'again', numbers: parsed.numbers }
  if (ctx.askedDinner && (parsed.kind === 'unknown' || parsed.kind === 'suggest') && body.trim().length >= 3 && !/^(no|nope|nothing|skip|leftovers?|out|takeout|take out|pizza delivery|ate out|we went out)\b/i.test(body.trim())) parsed = { kind: 'save_recipe', text: body.trim() }
  const dinnerNo = !!ctx.askedDinner && /^(no|nope|nah|skip|nothing|n\/a|leftovers?|ate out|takeout|take out|we went out)\b/i.test(body.trim())
  const intent = round && parsed.kind === 'skip' ? 'pick' : parsed.kind
  await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'in', from_number: phone, body, intent, twilio_sid: sid })

  if (dinnerNo) return { reply: 'No problem. 👍', handled: true, member: m }
  const owner = await ownerForHousehold(admin, m.household_id)
  const rawFirst = (owner?.full_name || '').trim().split(' ')[0]
  const family = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : 'your family'
  const settings = mergeSettings(owner?.settings)
  // A member saved as "Me" (the planner's own row) isn't greeted as "Me"; texts relayed to others use the planner's name.
  const hi = /^(me|myself|self|you|i)$/i.test((m.name ?? '').trim()) ? '' : (m.name ?? '').trim()
  const sender = hi || (m.profile_id ? family : 'A family member')
  // The person in charge: review / change the week, ask the family, takeout.
  if (owner && m.profile_id === owner.id) {
    // The planner texting numbers with no vote open means "swap these" (the first text says "Reply SWAP 2"):
    // "2", "#2", "swap 2", "1 and 3", "swap #1, #4". "SWAP" alone shows the week to pick from.
    const t = body.trim().replace(/[.!]+$/, '')
    if (!round && ctx.lastAsk !== 'again') {
      if (/^(swap|change|replace|switch)$/i.test(t)) return { reply: await swapWhich(admin, owner), handled: true, member: m }
      const nm = t.match(/^(?:(?:swap|change|replace|switch|new)\s*)?#?\s*\d{1,2}(?:\s*(?:,|&|\+|and|\s)\s*#?\s*\d{1,2})*$/i)
      if (nm) {
        const nums = (t.match(/\d{1,2}/g) ?? []).map(Number).filter((n) => n >= 1 && n <= 14)
        if (nums.length) return { reply: await swapPlanDinners(admin, owner, nums), handled: true, member: m }
      }
    }
    const cmd = parseLeaderCommand(body)
    if (cmd) {
      const reply = await leaderCommand(admin, owner, m, cmd)
      if (reply) return { reply, handled: true, member: m }
    }
  } else if (owner) {
    // An answer to the family question / takeout order the person in charge just sent.
    const ask = await getAsk(admin, m.household_id)
    const capture = ['unknown', 'optin', 'none', 'suggest', 'allgood', 'thanks', 'tonight'].includes(parsed.kind)
    if (askIsLive(ask) && capture && ask.asked.some((p) => p.id === m.id) && !ask.answers[m.id]) {
      ask.answers[m.id] = { name: m.name, text: body.trim().slice(0, 300), at: new Date().toISOString() }
      await putAsk(admin, m.household_id, ask)
      if (ask.asked.every((p) => ask.answers[p.id])) await finishAsk(admin, m.household_id, ask, owner)
      return { reply: askAck(ask, leaderLabel(owner)), handled: true, member: m }
    }
  }

  // Weekly one-tap reorder (lib/reorder): YES to "Reply YES and I'll text your Instacart cart link", or CART anytime
  // from someone already in the family texts. Checked before opt-in, which YES would otherwise mean.
  if (owner && m.phone_opt_in_at && !m.phone_opted_out) {
    const t = body.trim().replace(/[.!]+$/, '')
    const wantsCart = /^(cart|my cart|send (my )?cart)$/i.test(t) || (parsed.kind === 'optin' && await reorderAsked(admin, m.household_id, phone))
    if (wantsCart) {
      const reply = await reorderCartReply(admin, owner.id)
      return { reply, handled: true, member: m, intent: 'reorder_cart' }
    }
  }

  // Reply to "Want this on this week's dinners too?" (asked after a health need is saved).
  if (ctx.askedNeedsTiming && owner) {
    const plan = await latestPlan(admin, owner.id)
    if (/^\s*(this week|this|now|yes|yep|yeah|please|ok(ay)?)\b/i.test(body)) {
      const n = plan ? await fitPlanToNeeds(admin, owner.id, plan) : 0
      return { reply: n ? `Done — this week's dinners now have a starch side and carb notes where needed. Text MENU or TONIGHT to see them.` : `This week's dinners already fit — nothing to change.`, handled: true, member: m }
    }
    if (/^\s*(next( plan| week)?|later|no|nope|wait)\b/i.test(body)) return { reply: `Okay — it starts with your next plan.`, handled: true, member: m }
  }
  switch (parsed.kind) {
    case 'optin':
      if (!m.phone_opt_in_at || m.phone_opted_out) {
        await admin.from('household_members').update({ phone_opt_in_at: new Date().toISOString(), phone_opted_out: false }).eq('id', m.id)
      }
      return { reply: `You're in${hi ? `, ${hi}` : ''}. You'll get ${family}'s dinners to vote on each week. Text ADD + anything for the grocery list anytime (e.g. "add bananas"). Text MENU for this week, LIST for the list, STOP to opt out.`, handled: true, member: m }
    case 'stop':
      // STOP is about the phone, not one row: opt out every member row with this number.
      await admin.from('household_members').update({ phone_opted_out: true }).eq('phone', phone)
      return { reply: `You're opted out of DinnerDrop texts. Reply START to rejoin.`, handled: true, member: m }
    case 'start':
      await admin.from('household_members').update({ phone_opted_out: false, phone_opt_in_at: m.phone_opt_in_at ?? new Date().toISOString() }).eq('id', m.id)
      return { reply: `Welcome back${hi ? `, ${hi}` : ''}. Text MENU for this week's dinners or ADD + an item for the list.`, handled: true, member: m }
    case 'order_total': {
      if (!owner) return { reply: '', handled: false }
      const { data: hs } = await admin.from('grocery_handoffs').select('id, est_total, created_at, week_start').eq('user_id', owner.id).order('created_at', { ascending: false }).limit(1)
      const h = hs?.[0]
      if (!h) return { reply: `I don't see a recent order to attach $${parsed.total.toFixed(2)} to. Send the list to Instacart first, then text me the total after checkout.`, handled: true, member: m }
      await admin.from('grocery_handoffs').update({ actual_total: parsed.total, ...(parsed.store ? { store: `Instacart · ${parsed.store}` } : {}) }).eq('id', h.id)
      await markAllOpenOrdered(admin, owner.id, h.created_at, h.week_start).catch(() => {})
      if (h.est_total && Number(h.est_total) > 0) {
        const observed = parsed.total / (Number(h.est_total) / factorAtSend(h.created_at, settings.stores.priceFactor))
        const f = blendFactor(settings.stores.priceFactor, observed)
        const myStores = [...settings.stores.myStores]
        if (parsed.store) {
          const i = myStores.findIndex((x) => x.name.toLowerCase() === parsed.store!.toLowerCase())
          if (i >= 0) myStores[i] = { ...myStores[i], factor: blendFactor(myStores[i].factor, observed) }
          else myStores.push({ name: parsed.store, factor: blendFactor(undefined, observed) })
        }
        await admin.from('profiles').update({ settings: { ...((owner.settings as object) ?? {}), stores: { ...settings.stores, priceFactor: f, myStores } } }).eq('id', owner.id)
        return { reply: `Got it — $${parsed.total.toFixed(2)}${parsed.store ? ` at ${parsed.store}` : ''}. ${parsed.store || 'Your store'} runs about ${(parsed.store ? blendFactor(undefined, observed) : f).toFixed(2)}× our estimates; future lists and budgets use that.`, handled: true, member: m }
      }
      return { reply: `Got it — $${parsed.total.toFixed(2)} saved for that order.`, handled: true, member: m }
    }
    case 'use_up': {
      if (!owner) return { reply: '', handled: false }
      const items = parsed.items.map((x) => x.trim()).filter(Boolean).slice(0, 10)
      if (!items.length) return { reply: `Tell me what to use up, like "use up chicken thighs, spinach".`, handled: true, member: m }
      const { data: have } = await admin.from('pantry_items').select('id, name').eq('user_id', owner.id)
      const byName = new Map((have ?? []).map((h) => [normalizeItemName(h.name), h.id]))
      for (const it of items) {
        const id = byName.get(normalizeItemName(it))
        if (id) await admin.from('pantry_items').update({ use_soon: true, last_seen: new Date().toISOString() }).eq('id', id)
        else await admin.from('pantry_items').insert({ user_id: owner.id, name: it, use_soon: true, source: 'sms' })
      }
      return { reply: `Got it — ${items.join(', ')} flagged to use up. The next plan builds dinners around ${items.length === 1 ? 'it' : 'them'} and keeps ${items.length === 1 ? 'it' : 'them'} off the shopping list.`, handled: true, member: m }
    }
    case 'thanks':
      return { reply: `Anytime${hi ? `, ${hi}` : ''} 🙂`, handled: true, member: m }
    case 'help':
      return { reply: `DinnerDrop: reply the numbers of the dinners you WANT (e.g. "1 3 5"), ALL GOOD if they all work, TALLY for the vote so far, SUGGEST + a dish for a future week, TONIGHT, RECIPE + number, ADD + items (or a photo of the product) for the grocery list, a photo of the store flyer to plan around the sales, USE UP + items, MENU, LIST, PREFS to see what you've told me you like, STOP.`, handled: true, member: m }
    default:
      break
  }

  if (!m.phone_opt_in_at || m.phone_opted_out) {
    return { reply: `Reply YES to join ${family}'s DinnerDrop texts first.`, handled: true, member: m }
  }

  const plan = owner ? await latestPlan(admin, owner.id) : null
  const meals = plan?.meals ?? []
  // After a "which should come back?" text, numbers mean the dinners in THAT text (past dinners), not this week's plan.
  const againNames = ctx.lastAsk === 'again' ? againListFrom(ctx.lastAskBody) : []
  const againMeals: Meal[] = againNames.length ? againNames.map((name) => meals.find((x) => x.name === name) ?? ({ name } as Meal)) : meals

  // A texted Walmart link goes on the list with its item id, so "Add Walmart picks to cart" can add the exact product (Nov 1 2026).
  const walmartUrls = walmartUrlsIn(body)
  if (walmartUrls.length && owner) {
    if (!m.can_add) return { reply: `Adding to the list is turned off for you${hi ? `, ${hi}` : ''}. Ask ${family} to switch it on in Settings.`, handled: true, member: m }
    // Planner's choice (Settings → texting): straight to a one-tap Walmart cart link instead of the list.
    if (settings.texting.walmartLinks === 'cart') {
      const links = (await Promise.all(walmartUrls.slice(0, 10).map((u) => resolveWalmartLink(u)))).filter((l): l is WalmartLink => !!l)
      if (!links.length) return { reply: `I couldn't read that Walmart link${hi ? `, ${hi}` : ''}. Try sharing it again, or text the item name, like "add paper towels".`, handled: true, member: m }
      const names = links.map((l) => l.name ?? 'a Walmart item').join(', ')
      const url = cartUrl(links.map((l) => ({ itemId: l.itemId, qty: 1 })))
      const to = await ownerPhone(admin, owner)
      const isPlanner = m.profile_id === owner.id || (!!to && to === m.phone)
      if (isPlanner || !to) return { reply: `Tap to add ${names} to your Walmart cart: ${url}`, handled: true, member: m }
      const r = await sendSms(to, `${sender} wants ${names} from Walmart. Tap to add to your Walmart cart: ${url}`)
      await admin.from('sms_messages').insert({ household_id: m.household_id, direction: 'out', to_number: to, body: `walmart pick from ${m.name}: ${names}`, intent: 'walmart_pick', twilio_sid: r.sid ?? null })
      return { reply: r.ok ? `Sent to ${family}: ${names}. One tap puts it in the Walmart cart. ✅` : `I couldn't reach ${family} just now. Try again in a bit.`, handled: true, member: m }
    }
    const weekStart = plan?.week_start ?? mondayOf(new Date())
    const { data: existing } = await admin.from('list_items').select('id, walmart_item_id').eq('user_id', owner.id).eq('week_start', weekStart).is('ordered_at', null)
    const added: string[] = []
    let unnamed = 0
    for (const raw of walmartUrls.slice(0, 10)) {
      const link = await resolveWalmartLink(raw)
      if (!link) continue
      const label = link.name ?? 'Walmart item'
      if (!link.name) unnamed++
      const hit = (existing ?? []).find((e) => Number(e.walmart_item_id) === link.itemId)
      if (!hit) {
        await admin.from('list_items').insert({ user_id: owner.id, household_id: m.household_id, week_start: weekStart, name: label, quantity: '1', unit: null, category: guessCategory(label), search_term: link.name ?? null, source: 'sms', added_by: m.name, link_url: link.url, walmart_item_id: link.itemId })
      }
      added.push(label)
    }
    if (!added.length) return { reply: `I couldn't read that Walmart link${hi ? `, ${hi}` : ''}. Try sharing it again, or text the item name, like "add paper towels".`, handled: true, member: m }
    const tail = unnamed ? ` (The link didn't say what it is. Text "add" and the name if ${family} should know.)` : ''
    return { reply: `Added from your Walmart link: ${added.join(', ')}. ✅ ${family} can put all the Walmart picks in the Walmart cart in one tap.${tail}`, handled: true, member: m }
  }

  const tz = owner?.timezone || 'America/New_York'
  switch (parsed.kind) {
    case 'menu':
      if (round) return { reply: `Pick your favorites (up to ${round.picks_needed}):\n${pickLines(round.candidates)}\n\nReply with the numbers you want, e.g. "1 3 5".`, handled: true, member: m }
      return { reply: meals.length ? `This week:\n${menuLines(meals)}` : `No dinners planned yet — ${family} hasn't built this week.`, handled: true, member: m }
    case 'tally': {
      if (!round) return { reply: meals.length ? `No vote open right now. This week:\n${menuLines(meals)}` : `No vote open right now — ${family} hasn't planned this week yet.`, handled: true, member: m }
      return { reply: tallyText(round, await roundStandings(admin, round)), handled: true, member: m }
    }
    case 'tonight': {
      const t = tonightMeal(meals, tz)
      if (!t) return { reply: meals.length ? `Nothing planned for tonight. This week:\n${menuLines(meals)}` : `No dinners planned yet — ${family} hasn't built this week.`, handled: true, member: m }
      const n = meals.indexOf(t) + 1
      return { reply: `Tonight: ${t.name}${t.cookTime ? ` · ${t.cookTime} min` : ''}${t.side?.name ? ` · with ${t.side.name}` : ''}${t.cookedAt ? ' (already cooked ✓)' : ''}.${t.plateNotes?.length ? ` ${t.plateNotes.join(' ')}` : ''} Text RECIPE ${n} for the how-to.`, handled: true, member: m }
    }
    case 'recipe': {
      const src = round ? round.candidates : meals
      const r = src[parsed.number - 1]
      if (!r) return { reply: src.length ? `I have ${src.length} dinners numbered 1–${src.length}. Text RECIPE + the number, e.g. "recipe 2".` : `No dinners to show yet.`, handled: true, member: m }
      return { reply: recipeText(r), handled: true, member: m }
    }
    case 'text_only': {
      if (!owner) return { reply: '', handled: false }
      const raw = (owner.settings as Record<string, unknown> | null) ?? {}
      const ids = new Set(settings.texting.plainTextIds); ids.add(m.id)
      await admin.from('profiles').update({ settings: { ...raw, texting: { ...((raw.texting as object) ?? {}), plainTextIds: Array.from(ids) } } }).eq('id', owner.id)
      if (round) return { reply: voteBody(leaderLabel(owner), round), handled: true, member: m }
      return { reply: `Done${hi ? `, ${hi}` : ''}: your votes will come as plain text from now on.`, handled: true, member: m }
    }
    case 'save_recipe': {
      if (!owner) return { reply: '', handled: false }
      if (!m.can_add && !m.profile_id) return { reply: `Saving recipes is turned off for you, ${m.name}. Ask ${family} to add it.`, handled: true, member: m }
      try {
        const { data: prof } = await admin.from('profiles').select('family_size, dietary_needs').eq('id', owner.id).single()
        const meals = await buildFamilyRecipes([parsed.text.slice(0, 400)], { servings: Number(prof?.family_size) || 4, dietary: (prof?.dietary_needs as string[] | null) ?? [], by: m.profile_id ? undefined : (hi || undefined) })
        if (!meals.length) return { reply: `I couldn't tell what dinner that is. Try "save this: kielbasa and pierogies with onions".`, handled: true, member: m }
        const r = await saveFamilyRecipes(admin, owner.id, meals)
        const name = meals[0].name
        if (!r.saved.length) return { reply: `"${name}" is already in ${family}'s family recipes. 👍`, handled: true, member: m }
        return { reply: `Saved "${name}" to ${m.profile_id ? 'your' : `${family}'s`} family recipes${meals[0].swaps?.length ? ` (easy swap: ${meals[0].swaps[0]})` : ''}. It'll come up in a vote soon. 🍽️${m.profile_id ? `\nSee or edit it: ${APP_URL}/favorites` : ''}`, handled: true, member: m }
      } catch (e) {
        console.error('save_recipe failed', e)
        return { reply: `Sorry, I couldn't save that one. Try again in a minute.`, handled: true, member: m }
      }
    }
    case 'suggest': {
      if (!owner) break
      if (!parsed.items.length) return { reply: `Sure — what would you like on a future week? Text it like "suggest chicken parm" or "how about taco night".`, handled: true, member: m }
      await addSuggestions(admin, owner, m.name, parsed.items)
      return { reply: `Love it — ${parsed.items.join(', ')} ${parsed.items.length === 1 ? 'is' : 'are'} on ${family}'s idea list for a coming week. 🍽️`, handled: true, member: m }
    }
    case 'list': {
      if (!owner) break
      const { data: items } = await admin.from('list_items').select('name, quantity, unit, have, checked').eq('user_id', owner.id).eq('week_start', plan?.week_start ?? mondayOf(new Date())).is('ordered_at', null).order('category')
      const need = (items ?? []).filter((i) => !i.have && !i.checked)
      return { reply: need.length ? `Grocery list (${need.length}):\n${need.slice(0, 30).map((i) => `• ${i.name}${i.quantity ? ` (${i.quantity} ${i.unit ?? ''})`.replace(/\s+\)/, ')') : ''}`).join('\n')}${need.length > 30 ? `\n…and ${need.length - 30} more` : ''}` : `The list is empty right now. Text ADD + anything to put it on.`, handled: true, member: m }
    }
    case 'allgood':
    case 'none':
    case 'skip':
    case 'again': {
      if (!m.can_vote) return { reply: `Thanks${hi ? ` ${hi}` : ''} — voting is turned off for you, but you can still ADD items to the list.`, handled: true, member: m }
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
        if (parsed.kind === 'allgood') return { reply: `Got it${hi ? `, ${hi}` : ''} — they all work for you. 🙌`, handled: true, member: m }
        if (parsed.kind === 'none') return { reply: `Noted${hi ? `, ${hi}` : ''} — no picks from you this week.`, handled: true, member: m }
        return { reply: picked.length ? `Got it — your picks: ${picked.join(', ')}. The top ${round.picks_needed} make the week.` : `I didn't catch which numbers. Reply like "1 3 5" with the dinners you want.`, handled: true, member: m }
      }
      if (!meals.length || !plan) return { reply: `Nothing to vote on yet — ${family} hasn't planned this week.`, handled: true, member: m }
      const rows: Array<{ household_id: string; member_id: string; week_start: string; meal_name: string; vote: string }> = []
      if (parsed.kind === 'allgood') meals.forEach((x) => rows.push({ household_id: m.household_id, member_id: m.id, week_start: plan.week_start, meal_name: x.name, vote: 'keep' }))
      if (parsed.kind === 'skip') meals.forEach((x, i) => rows.push({ household_id: m.household_id, member_id: m.id, week_start: plan.week_start, meal_name: x.name, vote: parsed.numbers.includes(i + 1) ? 'skip' : 'keep' }))
      if (parsed.kind === 'again') parsed.numbers.forEach((n) => { const x = againMeals[n - 1]; if (x) rows.push({ household_id: m.household_id, member_id: m.id, week_start: plan.week_start, meal_name: x.name, vote: 'again' }) })
      if (rows.length) {
        await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', plan.week_start).in('vote', parsed.kind === 'again' ? ['again'] : ['keep', 'skip'])
        await admin.from('meal_votes').insert(rows)
      }
      if (parsed.kind === 'allgood') return { reply: `Got it — all ${meals.length} dinners kept. 🙌`, handled: true, member: m }
      if (parsed.kind === 'none') return { reply: `Noted${hi ? `, ${hi}` : ''}.`, handled: true, member: m }
      if (parsed.kind === 'skip') {
        const names = parsed.numbers.map((n) => meals[n - 1]?.name).filter(Boolean)
        return { reply: names.length ? `Got it — you'd skip ${names.join(' and ')}. ${family} will see the votes.` : `I didn't catch which numbers. Reply like "2 4" to skip those dinners.`, handled: true, member: m }
      }
      const names = parsed.numbers.map((n) => againMeals[n - 1]?.name).filter(Boolean)
      const outOfRange = parsed.numbers.filter((n) => !againMeals[n - 1])
      if (!names.length && againMeals.length) {
        const opts = againMeals.length === 1 ? 'just 1' : againMeals.length === 2 ? '1 or 2' : `1 to ${againMeals.length}`
        return { reply: `${outOfRange.length ? `There's no #${outOfRange[0]} this time — ` : ''}pick from ${opts}:\n${menuLines(againMeals)}\n\nReply like "again ${againMeals.length > 1 ? '1 2' : '1'}", or NONE.`, handled: true, member: m }
      }
      return { reply: names.length ? `Bring back ${names.join(' and ')} — noted. 🍽️${outOfRange.length ? ` (There's no #${outOfRange.join(', #')} on this list.)` : ''}` : `Reply like "again 1 3" to pick the ones that should come back.`, handled: true, member: m }
    }
    case 'prefs': {
      const { data: me } = await admin.from('household_members').select('likes, dislikes, allergies, safe_foods').eq('id', m.id).maybeSingle()
      const row = (me ?? {}) as { likes?: string[] | null; dislikes?: string[] | null; allergies?: string[] | null; safe_foods?: string[] | null }
      const part = (label: string, xs?: string[] | null) => (xs && xs.length ? `${label}: ${xs.slice(0, 12).join(', ')}` : '')
      const lines = [part('Likes', row.likes), part("Doesn't like", row.dislikes), part('Allergies / off-limits', row.allergies), part('Safe foods', row.safe_foods)].filter(Boolean)
      return {
        reply: lines.length
          ? `Here's what I have for you${hi ? `, ${hi}` : ''}:\n${lines.join('\n')}\nText anything to change it, like "I don't like mushrooms" or "I love tacos".`
          : `Nothing saved for you yet${hi ? `, ${hi}` : ''}. Just text what you like or don't, like "I love tacos" or "no mushrooms", and the planner uses it.`,
        handled: true, member: m,
      }
    }
    case 'add': {
      if (!parsed.items.length) return { reply: `What should I add${hi ? `, ${hi}` : ''}? Text ADD and the items, like "ADD milk, eggs, bananas".`, handled: true, member: m }
      if (!m.can_add) return { reply: `Adding to the list is turned off for you${hi ? `, ${hi}` : ''}. Ask ${family} to switch it on in Settings.`, handled: true, member: m }
      if (!owner) break
      const weekStart = plan?.week_start ?? mondayOf(new Date())
      const { data: existing } = await admin.from('list_items').select('id, name, have').eq('user_id', owner.id).eq('week_start', weekStart).is('ordered_at', null)
      const added: string[] = []
      for (const it of await cleanItems(parsed.items)) {
        const hit = (existing ?? []).find((e) => normalizeItemName(e.name) === normalizeItemName(it.name))
        const label = `${it.name}${it.unit ? ` (${it.quantity} ${it.unit})` : ''}`
        if (hit) { if (hit.have) await admin.from('list_items').update({ have: false }).eq('id', hit.id); added.push(label); continue }
        await admin.from('list_items').insert({ user_id: owner.id, household_id: m.household_id, week_start: weekStart, name: it.name, quantity: it.quantity, unit: it.unit || null, category: guessCategory(it.name), search_term: it.name, source: 'sms', added_by: m.name })
        added.push(label)
      }
      return { reply: added.length ? `Added to the list: ${added.join(', ')}. ✅` : `Tell me what to add, like "add oat milk, bananas".`, handled: true, member: m }
    }
    default:
      break
  }
  // Anything that isn't a plain command: read it in context — what we last asked, the last few texts,
  // and the numbered dinners — instead of guessing (Sarah, Oct 29 2026: "2" after "which should come
  // back?" was logged as a skip, and "oh no I want that again" landed on the grocery list).
  // Numbers refer to the last list we texted THIS person: a MENU they asked for beats an open vote, and if the plan
  // changed after we sent it, the dinners as we showed them (Carson, Nov 2 2026: his "1. 2. 3." were read against
  // a newer plan and the reply named dinners he never saw).
  const menuFirst = ctx.lastList === 'menu' && !!ctx.menuShown?.length
  const mode: 'round' | 'again' | 'week' = menuFirst ? 'week' : round ? 'round' : ctx.lastAsk === 'again' ? 'again' : 'week'
  const shownMenu = (names: string[]) => names.map((nm) => meals.find((x) => x.name === nm) ?? ({ name: nm } as Meal))
  const list = mode === 'round' && round ? round.candidates : mode === 'again' ? againMeals : menuFirst ? shownMenu(ctx.menuShown!) : meals
  const weekStart = mode === 'round' && round ? round.week_start : plan?.week_start ?? mondayOf(new Date())
  // Facts the bot can answer from, and the planner's latest note to the family (so replies to it get passed on).
  const facts: BotFacts = { family }
  try {
    Object.assign(facts, await foodFacts(admin, m, owner, plan, meals, tz, settings))
    if (round) { const st = await roundStandings(admin, round); facts.standings = tallyText(round, st).replace(/\n/g, ' | ') }
    facts.ownerMessage = ctx.ownerMessage
  } catch { /* facts are optional */ }
  const u = await understandInContext(body, ctx, list, mode, facts)
  if (!u) return { reply: helpFor(mode, family), handled: true, member: m }
  // Something for a person, not the bot.
  if (u.relay && !u.picks.length && !u.skips.length && !u.add.length && !u.suggest.length && owner) {
    const to = await ownerPhone(admin, owner)
    const isPlanner = m.profile_id === owner.id || (!!to && to === m.phone)
    // The planner texting back: it goes to the whole family as their note.
    if (isPlanner) {
      const { data: all } = await admin.from('household_members').select('*').eq('household_id', m.household_id)
      const others = ((all ?? []) as MemberRow[]).filter((x) => x.id !== m.id && x.phone && x.phone_opt_in_at && !x.phone_opted_out)
      const first = m.name.trim().split(' ')[0]
      let n = 0
      for (const x of others) {
        const r = await sendSms(x.phone as string, `${first}: ${body.trim().slice(0, 600)}`)
        await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: x.id, direction: 'out', to_number: x.phone, body: body.trim().slice(0, 600), intent: 'owner_message', twilio_sid: r.sid ?? null })
        if (r.ok) n++
      }
      await admin.from('sms_messages').update({ intent: 'planner_note' }).eq('twilio_sid', sid ?? '')
      return { reply: n ? `Sent to ${others.filter((x) => x.phone).map((x) => x.name).join(', ')}.` : `Nobody else has joined the texts yet.`, handled: true, member: m }
    }
    if (to && to !== m.phone) {
      const r = await sendSms(to, `${sender}: ${body.trim().slice(0, 600)}\n(Reply here to text the family back.)`)
      await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'out', to_number: to, body: `${sender}: ${body.trim().slice(0, 600)}`, intent: 'relay', twilio_sid: r.sid ?? null })
      await admin.from('sms_messages').update({ intent: 'for_planner' }).eq('twilio_sid', sid ?? '')
      return { reply: `Passed that on to ${family} 👍`, handled: true, member: m }
    }
  }
  if (u.suggest.length && owner) await addSuggestions(admin, owner, m.name, u.suggest)
  // Their own tastes, in their own words — saved on their member profile (the planner and vote candidates use these).
  const prefNote: string[] = []
  if (u.likes.length || u.dislikes.length || u.allergies.length) {
    const { data: me } = await admin.from('household_members').select('likes, dislikes, allergies').eq('id', m.id).maybeSingle()
    const merge = (cur: string[] | null | undefined, add: string[]) => { const set = new Set((cur ?? []).map((x) => x.toLowerCase())); for (const x of add) set.add(x); return Array.from(set).slice(0, 40) }
    const patch: Record<string, string[]> = {}
    if (u.likes.length) { patch.likes = merge(me?.likes, u.likes); patch.dislikes = (me?.dislikes ?? []).filter((x: string) => !u.likes.includes(x.toLowerCase())) }
    if (u.dislikes.length) { patch.dislikes = merge(patch.dislikes ?? me?.dislikes, u.dislikes); patch.likes = (patch.likes ?? me?.likes ?? []).filter((x: string) => !u.dislikes.includes(x.toLowerCase())) }
    if (u.allergies.length) patch.allergies = merge(me?.allergies, u.allergies)
    await admin.from('household_members').update(patch).eq('id', m.id)
    if (u.likes.length) prefNote.push(`you like ${u.likes.join(', ')}`)
    if (u.dislikes.length) prefNote.push(`you don't do ${u.dislikes.join(', ')}`)
    if (u.allergies.length) prefNote.push(`allergic to ${u.allergies.join(', ')} — nothing with that will be planned`)
  }
  // Health needs (carbs at every meal / a daily carb limit), for them or a family member — saved on the planner's
  // settings by member id; the planner fits every dinner to them (lib/member-needs). Never medical advice.
  let needsReply = ''
  if (u.needs.length && owner) {
    const { data: everyone } = await admin.from('household_members').select('id, name').eq('household_id', m.household_id)
    const people = (everyone ?? []) as Array<{ id: string; name: string }>
    const firstOf = (s: string) => s.trim().split(/\s+/)[0].toLowerCase()
    const { data: ownerRow } = await admin.from('profiles').select('settings').eq('id', owner.id).maybeSingle()
    const stored = (ownerRow?.settings ?? {}) as Record<string, unknown>
    const health = { ...((stored.health ?? {}) as Record<string, MemberNeed>) }
    const saved: Array<{ name: string; need: MemberNeed }> = []
    const unknown: string[] = []
    const known: string[] = []
    for (const n of u.needs) {
      const self = /^(me|myself|i)$/i.test(n.who)
      const who = self ? { id: m.id, name: m.name } : people.find((p) => firstOf(p.name) === firstOf(n.who))
      if (!who) { unknown.push(n.who); continue }
      const prev = health[who.id] ?? {}
      // Already saved exactly this (carbs rule and grams): nothing new to save or re-ask about.
      if ((n.carbs || prev.carbs) === prev.carbs && (n.carbsPerDay ?? prev.carbsPerDay) === prev.carbsPerDay && prev.carbs) { known.push(self ? 'you' : who.name.split(' ')[0]); continue }
      const need: MemberNeed = {
        carbs: n.carbs || prev.carbs,
        carbsPerDay: n.carbsPerDay ?? prev.carbsPerDay,
        notes: n.note ? Array.from(new Set([...(prev.notes ?? []), n.note])).slice(-4) : prev.notes,
        updatedAt: new Date().toISOString(),
      }
      health[who.id] = need
      saved.push({ name: self ? 'me' : who.name, need })
    }
    if (saved.length) {
      await admin.from('profiles').update({ settings: { ...stored, health } }).eq('id', owner.id)
      // "you like carbs" from before this fix: a need isn't a taste.
      const { data: me } = await admin.from('household_members').select('likes').eq('id', m.id).maybeSingle()
      const cleaned = (me?.likes ?? []).filter((x: string) => !/^(carbs?|carbohydrates?)$/i.test(x))
      if (cleaned.length !== (me?.likes ?? []).length) await admin.from('household_members').update({ likes: cleaned }).eq('id', m.id)
      await admin.from('sms_messages').update({ intent: 'health_need' }).eq('twilio_sid', sid ?? '')
      needsReply = `${u.answer ? `${u.answer}\n\n` : ''}${needsConfirmation(saved, (name) => name === 'me')} ${plan?.meals?.length ? NEEDS_TIMING_ASK : ''}`.trim()
    }
    // Already known: answer their food question if they asked one, and say it's noted (Sarah, Nov 3: help with the food,
    // note the need; point to the doctor only for medical advice itself).
    if (!saved.length && known.length) needsReply = u.answer
      ? `${u.answer} (Noted: I already have this saved for ${known.join(' and ')}, so every plan is built around it.)`
      : `Noted. I already have that saved for ${known.join(' and ')}, so every plan is built around it. Want ideas for tonight that fit? For questions about the condition or medicine itself, your doctor is the best person to ask.`
    if (unknown.length) needsReply += `${needsReply ? ' ' : ''}Who is ${unknown.join(' / ')} in the household? ${family} can add them in Settings → Household, then text me again.`
  }

  const voteChange = m.can_vote && (u.picks.length || u.skips.length || u.again.length || u.allGood || u.none || u.correction)
  if (voteChange && list.length) {
    const name = (n: number) => list[n - 1]?.name
    // A correction replaces what we recorded from this person in the last hour.
    if (u.correction) await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', weekStart).gte('created_at', new Date(Date.now() - 3600000).toISOString())
    const rows: Array<{ household_id: string; member_id: string; week_start: string; meal_name: string; vote: string }> = []
    const push = (n: number, vote: string) => { const nm = name(n); if (nm) rows.push({ household_id: m.household_id, member_id: m.id, week_start: weekStart, meal_name: nm, vote }) }
    if (mode === 'round') {
      // "The rest ..yuk" right after "78" means everything except 7 and 8 (Rich, Oct 31 2026) — never let a
      // skip undo a pick this person already made unless this message names that number.
      if (u.skips.length && !u.correction) {
        const { data: kept } = await admin.from('meal_votes').select('meal_name').eq('member_id', m.id).eq('week_start', weekStart).eq('vote', 'keep')
        const keptNames = new Set([...(kept ?? []).map((k) => k.meal_name), ...u.picks.map(name)])
        const said = new Set((body.match(/\d+/g) ?? []).map(Number))
        u.skips = u.skips.filter((n) => !keptNames.has(name(n) ?? '') || said.has(n))
      }
      const picks = u.allGood ? list.map((_, i) => i + 1) : u.picks
      if (picks.length || u.none) await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', weekStart).eq('vote', 'keep')
      picks.forEach((n) => push(n, 'keep'))
      u.skips.forEach((n) => push(n, 'skip'))
    } else {
      const touched = [...u.again, ...u.skips, ...u.picks].map(name).filter((x): x is string => !!x)
      if (touched.length) await admin.from('meal_votes').delete().eq('member_id', m.id).eq('week_start', weekStart).in('meal_name', touched)
      u.again.forEach((n) => push(n, 'again'))
      u.skips.forEach((n) => push(n, 'skip'))
      u.picks.forEach((n) => push(n, 'keep'))
    }
    if (rows.length) await admin.from('meal_votes').insert(rows)
    await admin.from('sms_messages').update({ intent: u.again.length ? 'again' : u.skips.length && !u.picks.length ? 'dislike' : 'pick' }).eq('twilio_sid', sid ?? '')
  }

  const added: string[] = []
  const listWeek = plan?.week_start ?? mondayOf(new Date())
  if (u.add.length && m.can_add && owner) {
    const { data: existing } = await admin.from('list_items').select('id, name, have').eq('user_id', owner.id).eq('week_start', listWeek).is('ordered_at', null)
    for (const it of await cleanItems(u.add)) {
      const hit = (existing ?? []).find((e) => normalizeItemName(e.name) === normalizeItemName(it.name))
      if (hit) { if (hit.have) await admin.from('list_items').update({ have: false }).eq('id', hit.id) }
      else await admin.from('list_items').insert({ user_id: owner.id, household_id: m.household_id, week_start: listWeek, name: it.name, quantity: it.quantity, unit: it.unit || null, category: guessCategory(it.name), search_term: it.name, source: 'sms', added_by: m.name })
      added.push(it.unit ? `${it.name} (${it.quantity} ${it.unit})` : it.name)
    }
  }
  // They say something we just put on the grocery list from their text was wrong.
  if (u.removeLastAdded && owner) {
    const { data: recent } = await admin.from('list_items').select('id').eq('user_id', owner.id).eq('source', 'sms').eq('added_by', m.name).is('ordered_at', null).gte('created_at', new Date(Date.now() - 3600000).toISOString())
    if (recent?.length) await admin.from('list_items').delete().in('id', recent.map((r) => r.id))
  }

  const n2 = (ns: number[]) => ns.map((n) => list[n - 1]?.name).filter(Boolean).join(' and ')
  const parts: string[] = []
  if (u.again.length) parts.push(`${n2(u.again)} ${u.again.length === 1 ? 'goes' : 'go'} on the bring-back list`)
  if (mode === 'round' && u.allGood) parts.push('they all work for you')
  else if (u.picks.length) parts.push(mode === 'round' ? `your picks: ${n2(u.picks)}` : `you'd keep ${n2(u.picks)}`)
  if (u.skips.length) parts.push(`you'd skip ${n2(u.skips)}`)
  if (u.none && !u.picks.length && !u.again.length) parts.push(mode === 'again' ? 'none to bring back' : 'no picks from you this week')
  if (added.length) parts.push(`added to the list: ${added.join(', ')}`)
  if (u.suggest.length) parts.push(`${u.suggest.join(', ')} ${u.suggest.length === 1 ? 'is' : 'are'} on ${family}'s idea list for a coming week`)
  if (prefNote.length) parts.push(`saved to your profile: ${prefNote.join('; ')}`)
  if (u.removeLastAdded) parts.push('took that off the grocery list')
  if (needsReply) {
    const lead = parts.length ? `Got it${hi ? `, ${hi}` : ''} — ${parts.join('; ')}. ` : ''
    return { reply: `${lead}${needsReply}`, handled: true, member: m }
  }
  if (parts.length) {
    const lead = u.correction ? `Sorry about that${hi ? `, ${hi}` : ''} — fixed: ` : `Got it${hi ? `, ${hi}` : ''} — `
    const tail = mode === 'round' && !u.picks.length && !u.allGood && !u.none && u.skips.length ? ` Which ones DO you want? Reply numbers, e.g. "1 3 5".` : ''
    return { reply: `${lead}${parts.join('; ')}.${tail}${u.answer ? `\n\n${u.answer}` : ''}`, handled: true, member: m }
  }
  if (u.answer) return { reply: u.answer, handled: true, member: m }
  if (u.clarify) return { reply: u.clarify, handled: true, member: m }
  // A real sentence we couldn't act on goes to the planner instead of a canned help line (Carson, Nov 3 2026: "I wanted to
  // cook chicken bacon and Brussels sprouts ... over whatever carb" got "Text MENU for this week's dinners…").
  if (body.trim().length >= 25 && owner) {
    const to = await ownerPhone(admin, owner)
    const isPlanner = m.profile_id === owner.id || (!!to && to === m.phone)
    if (to && !isPlanner) {
      const r = await sendSms(to, `${sender}: ${body.trim().slice(0, 600)}\n(Reply here to text them back.)`)
      await admin.from('sms_messages').insert({ household_id: m.household_id, member_id: m.id, direction: 'out', to_number: to, body: `${sender}: ${body.trim().slice(0, 600)}`, intent: 'relay', twilio_sid: r.sid ?? null })
      await admin.from('sms_messages').update({ intent: 'for_planner' }).eq('twilio_sid', sid ?? '')
      return { reply: `I passed that to ${family} so a person can sort it out. ${helpFor(mode, family)}`, handled: true, member: m }
    }
  }
  if (u.question) return { reply: `I can help with dinners, the vote and the list — for anything else, text ${family} directly. ${helpFor(mode, family)}`, handled: true, member: m }
  return { reply: helpFor(mode, family), handled: true, member: m }
}

/** The help line that fits what we last asked. */
function helpFor(mode: 'round' | 'again' | 'week', family: string): string {
  if (mode === 'round') return `Reply the numbers of the dinners you want (e.g. "1 3 5"), ALL GOOD, or ADD + items for the list.`
  if (mode === 'again') return `Reply the numbers of the dinners to bring back (e.g. "2" or "1 3"), or NONE. ADD + items puts things on ${family}'s list.`
  return `Text MENU for this week's dinners, LIST for the grocery list, ADD + items to add to it — or ask me anything about cooking, recipes or groceries.`
}

export interface SmsContext { askedDinner?: boolean; lastAsk: 'again' | 'vote' | null; lastAskBody?: string; askedNeedsTiming?: boolean; lastList?: 'menu' | 'vote' | null; menuShown?: string[]; ownerMessage?: string; history: Array<{ who: 'DinnerDrop' | 'Them'; body: string }> }

/** The last few texts with this person (both ways) and the last question we asked them. */
export async function smsContext(admin: SupabaseClient, memberId: string): Promise<SmsContext> {
  const since = new Date(Date.now() - 4 * 86400000).toISOString()
  const { data } = await admin.from('sms_messages').select('direction, body, intent, created_at').eq('member_id', memberId).gte('created_at', since).order('created_at', { ascending: false }).limit(14)
  const rows = (data ?? []) as Array<{ direction: string; body: string | null; intent: string | null; created_at?: string }>
  const ask = rows.find((r) => r.direction === 'out' && (r.intent === 'again_request' || r.intent === 'vote_request'))
  const note = rows.find((r) => r.direction === 'out' && r.intent === 'owner_message')
  // The most recent numbered list this person saw: our MENU reply ("This week:\n1. Mon — Name") or a vote/again request.
  const listIdx = rows.findIndex((r) => r.direction === 'out' && (r.intent === 'again_request' || r.intent === 'vote_request' || (r.body ?? '').startsWith('This week:') || (r.body ?? '').includes('. This week:\n')))
  const listRow = listIdx >= 0 ? rows[listIdx] : null
  const isMenu = !!listRow && !(listRow.intent === 'again_request' || listRow.intent === 'vote_request')
  const menuShown = isMenu ? (listRow!.body ?? '').split('\n').map((l) => l.match(/^\d+\.\s+(?:[A-Za-z]{3} — )?(.+)$/)?.[1]?.trim()).filter((x): x is string => !!x) : undefined
  const lastOut = rows.find((r) => r.direction === 'out')
  return {
    askedNeedsTiming: !!lastOut?.body?.includes(NEEDS_TIMING_ASK),
    // "What was dinner tonight?" (dinnerAskSweep) asked in the last 8 hours: a plain answer is a dinner to save.
    askedDinner: lastOut?.intent === 'dinner_ask' && Date.now() - new Date(lastOut.created_at ?? 0).getTime() < 8 * 3600000,
    lastList: listRow ? (isMenu ? 'menu' : 'vote') : null,
    menuShown,
    lastAsk: ask?.intent === 'again_request' ? 'again' : ask ? 'vote' : null,
    lastAskBody: ask?.body ?? undefined,
    ownerMessage: note?.body ?? undefined,
    history: rows.slice(0, 6).reverse().map((r) => ({ who: r.direction === 'out' ? 'DinnerDrop' : 'Them', body: (r.body ?? '').slice(0, 400) })),
  }
}

export interface NeedSaid { who: string; carbs: 'every_meal' | 'limit' | ''; carbsPerDay: number | null; note: string }
export interface Meant { picks: number[]; skips: number[]; again: number[]; add: string[]; suggest: string[]; likes: string[]; dislikes: string[]; allergies: string[]; needs: NeedSaid[]; allGood: boolean; none: boolean; correction: boolean; removeLastAdded: boolean; question: boolean; relay: boolean; answer: string; clarify: string }

/** Facts the bot may answer questions from (standings, tonight, list size, the planner's name). */
export interface BotFacts { family: string; tonight?: string; standings?: string; listCount?: number; ownerMessage?: string; menu?: string[]; tonightRecipe?: string; listItems?: string[]; people?: string[] }

/** The prompt for reading a free-text reply against what we asked and what was just said (exported for tests). */
export function understandPrompt(body: string, ctx: SmsContext, list: Pick<Meal, 'name'>[], mode: 'round' | 'again' | 'week', facts?: BotFacts): string {
  const asked = mode === 'round' ? 'which of these dinners they want next week (numbers = picks)'
    : mode === 'again' ? "which of this week's dinners should come back soon (numbers = bring back)"
    : "nothing specific right now (this week's dinners are listed for reference)"
  return `You read text replies for DinnerDrop, a family dinner planner. Be a sensible human reader: use what DinnerDrop last asked and the recent conversation to decide what this person means. Never treat a sentence as a grocery item.

DinnerDrop last asked them: ${asked}.
Numbered dinners:
${list.length ? list.map((c, i) => `${i + 1}. ${c.name}`).join('\n') : '(none)'}

Recent conversation (oldest first):
${ctx.history.map((h) => `${h.who}: ${h.body}`).join('\n') || '(none)'}

Their new message: <<<${body.trim()}>>>
${facts ? `
Facts you may answer from (the planner is ${facts.family}):
- Tonight's dinner: ${facts.tonight ?? 'not planned'}
- Vote standings: ${facts.standings ?? 'no vote open'}
- Grocery list: ${facts.listCount == null ? 'unknown' : `${facts.listCount} items still to buy${facts.listItems?.length ? `: ${facts.listItems.join(', ')}` : ''}`}
- This week's dinners: ${facts.menu?.length ? facts.menu.join(' | ') : 'none planned'}
- Tonight's recipe: ${facts.tonightRecipe ?? 'none'}
- The household: ${facts.people?.length ? facts.people.join(' | ') : 'unknown'}
- ${facts.ownerMessage ? `${facts.family} recently texted the family: "${facts.ownerMessage}"` : `${facts.family} hasn't texted the family recently`}
- What texting can do: numbers = votes, ADD items, MENU, LIST, TONIGHT, TALLY, RECIPE + number, SUGGEST + a dish, telling the bot what they like / don't like / are allergic to (saved to their own profile, and the planner uses it), USE UP + items, a photo of a product, a store flyer, a dinner (box, plate or recipe card) or a screenshot, SAVE THIS + a dinner the way they make it (saved to the family's own recipes, which come up in future votes — this is how the family gets "our normal dinners"), TEXT ONLY (the vote comes as plain words instead of a picture, for phones that don't show pictures), and any food, cooking or grocery question.
- Never offer or promise something texting can't do (e.g. sending dinners one at a time, calling someone, or "rebuilding" / "fixing" the grocery list). Never say you did or are doing something unless it's one of the commands above. The grocery list rebuilds itself from the week's dinners when they open it; if they say it's still wrong after opening it, say the DinnerDrop team will check it today and text them back (someone reviews every text twice a day). If they can't see the pictures, tell them to reply TEXT ONLY.` : ''}

Return ONLY JSON:
{"picks":[],"skips":[],"again":[],"add":[],"suggest":[],"likes":[],"dislikes":[],"allergies":[],"needs":[],"allGood":false,"none":false,"correction":false,"removeLastAdded":false,"question":false,"relay":false,"answer":"","clarify":""}
- picks: numbers they want / are happy to keep. skips: numbers they don't want. again: numbers they want brought back on a future week (use this when DinnerDrop asked which should come back, or they say "again"/"bring back"/"want that again").
- A dish they name or refer to ("that", "the salad") is matched to its number using the conversation.
- "the rest", "all the others", "everything else" mean every number they did NOT just pick in the conversation. Never put a number in skips that they picked unless this message names that number or dish.
- correction: true if they're saying DinnerDrop got their last answer wrong ("oh no", "I meant", "not that"); then fill picks/skips/again with what they actually meant.
- removeLastAdded: true only if they say something DinnerDrop just added to the grocery list was wrong or wasn't meant for the list.
- add: only real grocery/household products they clearly want added, as product names with any amount. Otherwise []. A vague category ("some snacks", "breakfast foods", "stuff for lunches", "something sweet") is NOT a product: never add a guessed item for it. Instead put 4–6 specific options for that category in answer (fitting the household's allergies, won't-eats and needs, and what they've said they like), ending with "Reply with the ones you want and I'll add them." Still add the specific products named in the same message.
- suggest: dishes or meal ideas they propose for a future week ("how about tacos", "we should do pizza night", "can I recommend chicken parm", "can we have spaghetti and meatballs", "I want to cook chicken, bacon and brussels sprouts over rice" → "chicken, bacon & brussels sprouts over rice") — one entry per dish ("spaghetti and meatballs" is ONE dish), not grocery items. A side they want with it ("peas on the side") belongs in the dish name, not in add. Otherwise [].
- likes / dislikes / allergies: foods or dishes they say they personally love, won't eat, or are allergic to ("I don't like mushrooms", "I'm allergic to shellfish", "I love anything with chicken"). These update THEIR OWN taste profile. Only what they state about themselves; otherwise []. A health or medical need is NOT a like: never put "carbs" or a nutrient in likes.
- needs: health-driven eating needs they state for themselves or a named family member — a medical condition, medicine or doctor's rule about what they must or can't eat ("I need carbs in every meal or my pancreatitis flares", "on her medicine she can only have 100 carbs a day"). One entry per person: {"who": "me" or the person's first name, "carbs": "every_meal" (must have carbs/starch at every meal) | "limit" (must keep carbs down) | "", "carbsPerDay": the daily gram limit as a number if they gave one else null, "note": a short neutral summary under 60 characters, no diagnosis (e.g. "carbs at every meal — stomach condition")}. Keep tracking across the conversation: "for me" after a question about who means "me". Food intolerances that come with it ("lemons are no good for me") are dislikes. Otherwise [].
- When needs is filled, still answer any food question in the message; clarify stays "". Never diagnose, never advise on treatment or medication, never promise to calculate a diet.
- allGood / none: whole-list answers. question: they asked something or it's unrelated chat.
- answer: you are also the family's food, cooking and grocery assistant. If question is true and it's about food, cooking, recipes, groceries, meal ideas, leftovers, storage, food safety, substitutions, kitchen how-to, the dinners, the vote, the list, the app or what they can text, answer it like a friendly, practical home cook: direct, specific, plain words, under 600 characters (SMS), no markdown. Use the facts above: tonight's recipe for cooking questions, the week and list for "what's for…" / "do we have…", and ALWAYS respect the household's allergies, won't-eats and needs in any suggestion. For "what can I make with X" give 1–2 concrete ideas with rough steps and time. Food safety: give standard USDA safe temperatures and storage times. Food questions tied to a health need ARE yours: suggest foods, swaps and dinners that fit what they told you (e.g. carbs at every meal, low carb, no lemon), and when they state a need, fill needs so it's noted. Only questions about the condition, symptoms, treatment or medication themselves go to their doctor — say so in one short line, then still help with the food part if there is one. For anything not about food or the household's meals, say briefly that you only help with food and groceries. Else "".
- If they ask a question AND want an action (e.g. "how do I cook this, and add rice"), fill both the action fields and answer.
- relay: true when the message is clearly meant for the planner or the family, not the bot — a reply to something the planner texted, "tell Sarah…", "I'll be late", "running to the store", a question only a person can answer. Then answer stays "".
- clarify: if you genuinely can't tell what they mean, a short friendly question (under 140 characters) asking them, else "".`
}

export function parseMeant(text: string, listLength: number): Meant {
  const j = parseClaudeJSON<Partial<Meant>>(text)
  const strs = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string' && x.trim().length > 1 && x.trim().length <= 40).map((x) => x.trim().toLowerCase()).slice(0, 8) : [])
  const nums = (a: unknown) => (Array.isArray(a) ? Array.from(new Set(a.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= listLength))) : [])
  return {
    picks: nums(j.picks), skips: nums(j.skips), again: nums(j.again),
    add: Array.isArray(j.add) ? j.add.filter((x): x is string => typeof x === 'string' && x.trim().length > 1 && x.trim().length <= 60).map((x) => x.trim()) : [],
    suggest: Array.isArray(j.suggest) ? j.suggest.filter((x): x is string => typeof x === 'string' && x.trim().length > 1 && x.trim().length <= 60).map((x) => x.trim()).slice(0, 5) : [],
    likes: strs(j.likes).filter((x) => !/^(carbs?|carbohydrates?|protein|starch(es)?)$/.test(x)), dislikes: strs(j.dislikes), allergies: strs(j.allergies),
    needs: Array.isArray(j.needs) ? (j.needs as unknown[]).flatMap((x) => {
      const o = (x ?? {}) as Record<string, unknown>
      const who = typeof o.who === 'string' ? o.who.trim().slice(0, 30) : ''
      const carbs = o.carbs === 'every_meal' || o.carbs === 'limit' ? o.carbs : ''
      const g = Number(o.carbsPerDay)
      const carbsPerDay = Number.isFinite(g) && g >= 10 && g <= 400 ? Math.round(g) : null
      const note = typeof o.note === 'string' ? o.note.trim().slice(0, 60) : ''
      return who && (carbs || carbsPerDay || note) ? [{ who, carbs: (carbs || (carbsPerDay ? 'limit' : '')) as NeedSaid['carbs'], carbsPerDay, note }] : []
    }).slice(0, 4) : [],
    allGood: !!j.allGood, none: !!j.none, correction: !!j.correction, removeLastAdded: !!j.removeLastAdded, question: !!j.question, relay: !!j.relay,
    answer: typeof j.answer === 'string' ? j.answer.trim().slice(0, 700) : '',
    clarify: typeof j.clarify === 'string' ? j.clarify.trim().slice(0, 160) : '',
  }
}

async function understandInContext(body: string, ctx: SmsContext, list: Meal[], mode: 'round' | 'again' | 'week', facts?: BotFacts): Promise<Meant | null> {
  try { return parseMeant(await generateSmart(understandPrompt(body, ctx, list, mode, facts), 900), list.length) }
  catch { return null }
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

function pickLines(meals: Meal[], showCarbs = false): string {
  return meals.map((m, i) => {
    const bits = [m.cookTime ? timeLabel(m) : '', showCarbs && typeof m.nutrition?.carbs === 'number' ? `${m.nutrition.carbs}g carbs` : ''].filter(Boolean)
    return `${i + 1}. ${m.name}${bits.length ? ` (${bits.join(' · ')})` : ''}${m.ideaBy ? ` — ${m.ideaBy}'s idea` : m.familyRecipe ? (m.addedBy ? ` — ${m.addedBy}'s recipe` : ' — family recipe') : ''}`
  }).join('\n')
}

/** Families watching carbs see them on each texted dinner. */
export function watchesCarbs(dietaryNeeds: string[] | null | undefined): boolean {
  return (dietaryNeeds ?? []).some((d) => /^(keto|low-carb|diabetic-friendly)$/i.test(d.trim()))
}

/** The numbered photo collage of the choices, texted with the vote (see app/api/sms/menu-image). */
function menuImageUrl(roundId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app').replace(/\/$/, '')
  // Version stamp so a re-send never gets a CDN copy rendered before a fix (Twilio fetches the image once, at send time).
  return `${base}/api/sms/menu-image/${roundId}?v=${Date.now().toString(36)}`
}

export function voteBody(familyName: string, round: VoteRound, showCarbs = false): string {
  const week = round.week_start.slice(5).replace('-', '/')
  const sun = round.candidates.filter((m) => isSundayDinner(m))
  // Sunday family dinner: its ideas come first under their own heading, then the weeknights (one numbering).
  if (sun.length && sun.length < round.candidates.length && round.candidates.slice(0, sun.length).every((m) => isSundayDinner(m))) {
    const lines = pickLines(round.candidates, showCarbs).split('\n')
    const weeknights = Math.max(round.picks_needed - 1, 1)
    return `DinnerDrop — ${familyName}'s dinners for the week of ${week}\n\nSUNDAY FAMILY DINNER (pick 1):\n${lines.slice(0, sun.length).join('\n')}\n\nWEEKNIGHTS (pick up to ${weeknights}):\n${lines.slice(sun.length).join('\n')}\n\nReply with the numbers you WANT: 1 for Sunday and up to ${weeknights} for the week (e.g. "${1} ${sun.length + 1} ${sun.length + 3}"). The top picks make the week. Text ADD + anything for the grocery list.`
  }
  return `DinnerDrop — ${familyName}'s dinner ideas for the week of ${week}:\n${pickLines(round.candidates, showCarbs)}\n\nReply with the numbers you WANT (pick up to ${round.picks_needed}, e.g. "1 3 5"). The top picks make the week. Text ADD + anything for the grocery list.`
}

/**
 * Start a vote round for one household:
 *  1. generate candidate dinners (more than the week needs) — not saved as a plan yet
 *  2. opt-in text to anyone with a number who hasn't joined
 *  3. the candidates to everyone who has, asking for their picks
 * When everyone has answered (or after 24h) the top picks become the week.
 */
export async function startVoteCycle(admin: SupabaseClient, ownerId: string, opts: { now?: Date; force?: boolean; resend?: boolean; sendDraft?: boolean; weekStart?: string } = {}): Promise<CycleReport> {
  const now = opts.now ?? new Date()
  const { data: o } = await admin
    .from('profiles')
    .select('id, household_id, full_name, timezone, settings, subscription_status, is_beta_member, family_until, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs')
    .eq('id', ownerId)
    .single()
  if (!o?.household_id) throw new Error('No household')
  const settings = mergeSettings(o.settings)
  const { weekday, dateStr } = localNow(o.timezone || 'America/New_York', now)
  const tcfg = tripsConfig(settings)
  const trip = isClassic(tcfg) ? null : (voteTripOn(tcfg, dateStr) ?? shoppingTrip(tcfg, dateStr))
  const weekStart = trip ? trip.key : (opts.weekStart ?? targetWeekFor(now, weekday))
  const report: CycleReport = { weekStart, planned: false, optInsSent: 0, voteTextsSent: 0, skipped: [] }
  if (!smsConfigured()) { report.skipped.push('Twilio not configured'); return report }
  if (!settings.texting.enabled) { report.skipped.push('texting off in settings'); return report }
  if (!isFamilyProfile(o)) { report.skipped.push('family plan required'); return report }

  // 1. open round (reuse one already open for this week unless forced)
  const picksNeeded = trip ? Math.min(Math.max(trip.nights.length, 1), 7) : Math.min(Math.max(settings.plan.dinnersPerWeek, 3), 7)
  // Weeknight ideas plus the family's own number of Sunday dinner ideas (texted as two groups).
  // With shopping trips, the Sunday group goes with whichever trip has Sunday night in it.
  const sundayN = !trip || trip.nights.some((n) => n.day === 'sun') ? sundayOptions(settings) : 0
  const count = Math.min(Math.max(settings.texting.optionsToText, picksNeeded, 5), 12) + sundayN
  let round = await openRound(admin, o.household_id)
  // A family's first vote can be for next week (opened mid-week, see startFirstVote): it stays open until that week.
  if (round && round.week_start !== weekStart && (trip || round.week_start < weekStart)) { await admin.from('vote_rounds').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', round.id); round = null }
  if (round && !trip && round.week_start > weekStart) report.weekStart = round.week_start
  if (opts.resend && !round) { report.skipped.push('no open vote to resend'); return report }
  if (!round || opts.force) {
    if (round) await admin.from('vote_rounds').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', round.id)
    const { meals } = await generateCandidates(admin, o, count, trip?.key)
    if (!meals.length) { report.skipped.push('could not generate dinner ideas'); return report }
    // Family ideas texted in since the last vote join the ballot (up to 3), labelled with who suggested them.
    const ideaMeals: Meal[] = []
    const usedIdeas: string[] = []
    for (const sug of pendingSuggestions(o.settings).slice(0, 3)) {
      const m = await resolveSuggestion(admin, o, sug, [...meals, ...ideaMeals].map((x) => x.name))
      if (m) { ideaMeals.push(m); usedIdeas.push(sug.name) }
    }
    // Sunday ideas first (their own group in the text), then the weeknights and the family's own ideas.
    const sunIdeas = sundayN ? meals.filter((m) => isSundayDinner(m)).slice(0, sundayN) : []
    const weekIdeas = meals.filter((m) => !sunIdeas.includes(m))
    const candidates = [...sunIdeas, ...weekIdeas.slice(0, Math.max(picksNeeded, count - sunIdeas.length - ideaMeals.length)), ...ideaMeals]
    const { data: created } = await admin.from('vote_rounds').insert({ household_id: o.household_id, user_id: o.id, week_start: weekStart, candidates, picks_needed: picksNeeded }).select('*').single()
    round = created as VoteRound
    report.planned = true
    if (usedIdeas.length) await markSuggestionsUsed(admin, o, usedIdeas)
  }

  // Review first: the person in charge checks the vote (drop / swap / add) before the family gets it.
  if (!opts.resend && !opts.sendDraft) {
    const draft = await getDraft(admin, o.household_id)
    if (draft && draft.roundId === round.id) { report.skipped.push('waiting for review'); return report }
    if (report.planned && settings.texting.reviewFirst) {
      const sendAt = new Date(now.getTime() + Math.min(Math.max(settings.texting.reviewHours, 1), 12) * 3600000)
      await setDraft(admin, o.household_id, { roundId: round.id, ownerId: o.id, sendAt: sendAt.toISOString() })
      const at = new Intl.DateTimeFormat('en-US', { timeZone: o.timezone || 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(sendAt)
      const to = await ownerPhone(admin, o as OwnerRow)
      const body = `DinnerDrop: this week's vote is ready for you to check before the family sees it:\n${pickLines(round.candidates)}\n\nReply SEND to send it now, DROP 3, SWAP 3 FOR tacos, or ADD DINNER chili. Or change it here: ${APP_URL}/vote-review\nIt goes to the family at ${at} if you don't change anything.`
      if (to) await sendFamilyText(admin, { householdId: o.household_id, to, body, intent: `vote_review:${round.id}`, mediaUrl: menuImageUrl(round.id) })
      report.skipped.push('sent to the person in charge for review')
      return report
    }
  }
  if (opts.sendDraft) {
    await clearDraft(admin, o.household_id)
    await admin.from('vote_rounds').update({ created_at: new Date().toISOString() }).eq('id', round.id)
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
      if (!opts.resend && await sendOptIn(admin, mm, `${familyName}'s family`)) report.optInsSent++
      continue
    }
    if (!mm.can_vote) continue
    const askedAlready = await sentForRound(admin, mm.id, round.id)
    // resend: the same round's menu again (e.g. after a picture fix) — only to people who already got it
    if (opts.resend ? !askedAlready : (!opts.force && askedAlready)) continue
    // Tap-to-vote link for everyone (Sarah, Nov 8 2026) unless switched off for this person on the Texts page.
    const tapLine = !(settings.texting.tapVoteOffIds ?? []).includes(mm.id) ? `\n\nOr tap the dinners you want (with photos): ${await tapVoteUrl(admin, round.id, mm.id)}` : ''
    if (await textMember(admin, mm, voteBody(familyName, round, watchesCarbs(o.dietary_needs as string[] | null)) + tapLine, `vote_request:${round.id}`, settings.texting.weeklyCap * Math.max(1, settings.schedule.trips.length), settings.texting.plainTextIds.includes(mm.id) ? undefined : menuImageUrl(round.id))) report.voteTextsSent++
    // Their idea made the ballot: say so (once per round, not counted against the weekly cap).
    const theirs = round.candidates.map((c, i) => ({ c, n: i + 1 })).filter(({ c }) => c.ideaBy && c.ideaBy.toLowerCase() === mm.name.toLowerCase())
    if (theirs.length && !opts.resend && !(await alreadySentTo(admin, mm.id, `idea_in_vote:${round.id}`, 7))) {
      await textMember(admin, mm, `Your idea made the vote, ${mm.name}: ${theirs.map(({ c, n }) => `#${n} ${c.name}`).join(', ')}. Reply with your picks (numbers) to vote for it.`, `idea_in_vote:${round.id}`)
    }
  }
  return report
}

async function sentForRound(admin: SupabaseClient, memberId: string, roundId: string): Promise<boolean> {
  const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('member_id', memberId).eq('intent', `vote_request:${roundId}`)
  return (count ?? 0) > 0
}

/* ---- polling Twilio for replies (no webhook change needed) ---- */

interface TwilioMsg { sid: string; from: string; to: string; body: string; direction: string; date_sent: string; num_media?: string }

/** Download the pictures attached to an MMS (Twilio media needs account auth). */
async function fetchMedia(sid: string): Promise<Array<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }>> {
  const acct = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN
  if (!acct || !token) return []
  const auth = { Authorization: 'Basic ' + Buffer.from(`${acct}:${token}`).toString('base64') }
  const list = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${acct}/Messages/${sid}/Media.json`, { headers: auth, cache: 'no-store' })
  if (!list.ok) return []
  const json = await list.json()
  const out: Array<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }> = []
  for (const m of (json.media_list ?? []).slice(0, 4) as Array<{ uri: string; content_type: string }>) {
    const ct = (m.content_type || '').toLowerCase()
    if (!/^image\/(jpeg|png|webp|gif)$/.test(ct)) continue
    const res = await fetch(`https://api.twilio.com${m.uri.replace(/\.json$/, '')}`, { headers: auth, redirect: 'follow', cache: 'no-store' })
    if (!res.ok) continue
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 6 * 1024 * 1024) continue
    out.push({ base64: buf.toString('base64'), mediaType: ct as 'image/jpeg' })
  }
  return out
}

/** A picture of a product / label / empty box → the grocery item to buy. */
type PhotoRead = { kind: 'product'; name: string; quantity: string; unit: string } | { kind: 'dinner'; dishes: string[] } | { kind: 'other'; description: string }
/** What a texted photo is: a product to buy, a dinner (box / plate / recipe card), or something else (a screenshot, a question). */
async function readPhoto(img: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }, caption: string): Promise<PhotoRead | null> {
  try {
    const text = await generateWithClaudeImage(
      `A family member texted this photo to DinnerDrop, their family dinner planner (it runs their dinner vote and grocery list).${caption ? ` They also wrote: "${caption}".` : ' No message came with it.'}
Decide what it is:
- "product": a grocery or household product they want bought (a package, bottle, can, an empty container, a shelf item). Give its name with brand and size if visible.
- "dinner": a cooked meal, a boxed/meal-kit dinner, a written/printed recipe, or a LIST of dinners (handwritten, typed, a screenshot of notes). Give each dinner as a one-line plain description the way a family would say it ("boxed scalloped potatoes with ham and peas") — every dinner if it's a list.
- "other": anything else — a screenshot (for example of DinnerDrop's dinner-vote picture or a text), a question, a receipt, a person, a pet. Describe exactly what's shown in one or two plain sentences, including any readable text that matters.
Return ONLY JSON: {"kind":"product","name":"","quantity":"1","unit":"whole|bag|box|can|jar|bottle|pack|lb|oz|gallon|dozen"} or {"kind":"dinner","dishes":[""]} or {"kind":"other","description":""}`,
      img, 400,
    )
    const j = parseClaudeJSON<{ kind?: string; name?: string; quantity?: string | number; unit?: string; dish?: string; dishes?: string[]; description?: string }>(text)
    if (j.kind === 'product' && j.name?.trim()) return { kind: 'product', name: j.name.trim(), quantity: String(j.quantity ?? '1'), unit: (j.unit ?? '').trim() }
    const dishes = (Array.isArray(j.dishes) ? j.dishes : j.dish ? [j.dish] : []).map((d) => String(d).trim().slice(0, 300)).filter((d) => d.length >= 3)
    if (j.kind === 'dinner' && dishes.length) return { kind: 'dinner', dishes: dishes.slice(0, 12) }
    return { kind: 'other', description: (j.description ?? '').trim().slice(0, 400) || 'a photo' }
  } catch { return null }
}


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

/**
 * 7 PM "What was dinner tonight?" (Sarah, Nov 7 2026): for planners who turned it on, on nights with no planned
 * dinner, one text to the planner. Their answer is written up and saved as a family recipe (handleInbound
 * save_recipe). Runs from the 5-minute text poll; the first poll in the 7 PM hour sends it, once a day.
 */
export async function dinnerAskSweep(admin: SupabaseClient, now: Date = new Date()): Promise<number> {
  const { data: owners } = await admin.from('profiles')
    .select('id, household_id, full_name, timezone, settings, subscription_status, is_beta_member, family_until')
    .eq('settings->texting->>askDinner', 'true').not('household_id', 'is', null)
  let sent = 0
  for (const o of (owners ?? []) as OwnerRow[]) {
    try {
      const tz = o.timezone || 'America/New_York'
      const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now)) % 24
      if (hour !== 19 || !isFamilyProfile(o)) continue
      const { data: me } = await admin.from('household_members').select('*').eq('household_id', o.household_id).eq('profile_id', o.id).limit(1)
      const planner = me?.[0] as MemberRow | undefined
      if (!planner || await alreadySentTo(admin, planner.id, 'dinner_ask', 0.8)) continue
      const plan = await latestPlan(admin, o.id)
      if (plan && tonightMeal(plan.meals, tz)) continue
      if (await textMember(admin, planner, `DinnerDrop: what was dinner tonight? Reply the way you'd say it (e.g. "kielbasa and pierogies with onions") and I'll save it to your family recipes. Reply NO to skip.`, 'dinner_ask')) sent++
    } catch (e) { console.error('dinnerAskSweep', o.id, e) }
  }
  return sent
}

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
        if (Number(m.num_media) > 0) {
          const pr = await handlePhoto(admin, m)
          if (pr?.passText) {
            const r2 = await handleInbound(admin, m.from, pr.passText, null)
            if (r2.handled && r2.reply) {
              const sent = await sendSms(m.from, r2.reply)
              await admin.from('sms_messages').insert({ household_id: pr.householdId, member_id: pr.memberId, direction: 'out', to_number: m.from, body: r2.reply, intent: 'reply', twilio_sid: sent.sid ?? null })
              report.replies++
            }
            report.handled++
            continue
          }
          if (pr) { report.handled++; if (pr.reply) { const sent = await sendSms(m.from, pr.reply); await admin.from('sms_messages').insert({ household_id: pr.householdId, member_id: pr.memberId, direction: 'out', to_number: m.from, body: pr.reply, intent: 'reply', twilio_sid: sent.sid ?? null }); report.replies++ } }
          if (!m.body.trim() || pr) continue
        }
        const r = await handleInbound(admin, m.from, m.body, m.sid)
        if (!r.handled || !r.member) continue   // not one of ours (FamCEO's traffic)
        report.handled++
        if (r.reply) {
          const sent = await sendSms(m.from, r.reply)
          await admin.from('sms_messages').insert({ household_id: r.member.household_id, member_id: r.member.id, direction: 'out', to_number: m.from, body: r.reply, intent: r.intent ?? 'reply', twilio_sid: sent.sid ?? null })
          report.replies++
        }
        // Just opted in while a vote is open? Send them the menu right away. (A YES to the reorder text isn't an opt-in.)
        if (parseInbound(m.body).kind === 'optin' && r.intent !== 'reorder_cart') {
          const round = await openRound(admin, r.member.household_id)
          const owner = await ownerForHousehold(admin, r.member.household_id)
          if (round && owner) await startVoteCycle(admin, owner.id)
          // First person ever to say YES: start the family's first vote now instead of waiting for vote day.
          else if (!round && owner) await startFirstVote(admin, owner.id, r.member.household_id)
        }
      } catch (e) {
        report.errors.push(`${m.sid}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  try { report.completions = await checkVoteCompletion(admin) } catch (e) { report.errors.push(String(e)) }
  try { await dinnerAskSweep(admin) } catch (e) { report.errors.push(`dinnerAsk: ${String(e)}`) }
  try { await draftSweep(admin) } catch (e) { report.errors.push(`drafts: ${String(e)}`) }
  try { await familyAskSweep(admin) } catch (e) { report.errors.push(`asks: ${String(e)}`) }
  return report
}


/** MMS from a member: every attached picture becomes a grocery item (with the caption as a hint). */
async function handlePhoto(admin: SupabaseClient, m: TwilioMsg): Promise<{ reply: string; householdId: string; memberId: string; passText?: string } | null> {
  const phone = normalizePhone(m.from) ?? m.from
  const { data: rows } = await admin.from('household_members').select('*').eq('phone', phone).limit(1)
  const member = rows?.[0] as MemberRow | undefined
  if (!member) return null
  await admin.from('sms_messages').insert({ household_id: member.household_id, member_id: member.id, direction: 'in', from_number: phone, body: m.body || '[photo]', intent: 'photo', twilio_sid: m.sid })
  if (!member.phone_opt_in_at || member.phone_opted_out) return { reply: 'Reply YES to join the family texts first, then send the photo again.', householdId: member.household_id, memberId: member.id }
  if (!member.can_add) return { reply: `Adding to the list is turned off for you, ${member.name}.`, householdId: member.household_id, memberId: member.id }
  const owner = await ownerForHousehold(admin, member.household_id)
  if (!owner) return null
  const plan = await latestPlan(admin, owner.id)
  const weekStart = plan?.week_start ?? mondayOf(new Date())
  const media = await fetchMedia(m.sid)
  const added: string[] = []
  // "save this" (or "our recipe") with a photo of the box, plate or recipe card → a family recipe, not a list item.
  const capRaw = m.body?.trim() ?? ''
  if (media.length && /^(save|our recipe|my recipe|family recipe|add (a |our |my )?recipe|new recipe|recipe)\b/i.test(capRaw)) {
    try {
      const hint = capRaw.match(SAVE_RECIPE_RE)?.[1] ?? ''
      const said = await describeDinnerFromPhotos(media, hint)
      const { data: prof } = await admin.from('profiles').select('family_size, dietary_needs').eq('id', owner.id).single()
      const meals = said.length ? await buildFamilyRecipes(said.slice(0, 1), { servings: Number(prof?.family_size) || 4, dietary: (prof?.dietary_needs as string[] | null) ?? [], by: member.profile_id ? undefined : member.name }) : []
      if (!meals.length) return { reply: `I couldn't tell what dinner that is from the photo. Text it instead, like "save this: kielbasa and pierogies".`, householdId: member.household_id, memberId: member.id }
      const r = await saveFamilyRecipes(admin, owner.id, meals)
      return { reply: r.saved.length ? `Saved "${meals[0].name}" to the family recipes from your photo. It'll come up in a vote soon. 🍽️` : `"${meals[0].name}" is already in the family recipes. 👍`, householdId: member.household_id, memberId: member.id }
    } catch (e) {
      console.error('photo recipe failed', e)
      return { reply: `Sorry, I couldn't save that one. Try again in a minute.`, householdId: member.household_id, memberId: member.id }
    }
  }
  // A store flyer (or "SALE" in the caption) loads this week's sales instead of adding a list item.
  const caption = m.body?.trim() ?? ''
  const saleHint = /\b(sale|sales|flyer|ad|deals|circular)\b/i.test(caption)
  let saleCount = 0, saleStore = ''
  for (const img of media) {
    if (!(saleHint || (await looksLikeFlyer(img)))) continue
    try {
      const r = await salesFromImage(img, caption)
      if (!r.items.length) continue
      const saved = await saveSales(admin, { userId: owner.id, householdId: member.household_id, store: r.store, validFrom: r.validFrom, validTo: r.validTo, source: 'photo', items: r.items, addedBy: member.name })
      saleCount = saved.items.length; saleStore = r.store
    } catch (e) { console.error('flyer import failed', e) }
  }
  if (saleCount) return { reply: `Got this week's sales${saleStore ? ` at ${saleStore}` : ''} — ${saleCount} items. The next menu will be built around them. 🏷️`, householdId: member.household_id, memberId: member.id }
  const dinners: string[] = []
  const seen: string[] = []
  for (const img of media) {
    const read = await readPhoto(img, caption)
    if (!read) continue
    if (read.kind === 'dinner') { dinners.push(...read.dishes); continue }
    if (read.kind === 'other') { seen.push(read.description); continue }
    const it = { name: read.name, quantity: read.quantity, unit: read.unit }
    const { data: existing } = await admin.from('list_items').select('id, name, have').eq('user_id', owner.id).eq('week_start', weekStart).is('ordered_at', null)
    const hit = (existing ?? []).find((e) => normalizeItemName(e.name) === normalizeItemName(it.name))
    if (hit) { if (hit.have) await admin.from('list_items').update({ have: false }).eq('id', hit.id) }
    else await admin.from('list_items').insert({ user_id: owner.id, household_id: member.household_id, week_start: weekStart, name: it.name, quantity: it.quantity, unit: it.unit || null, category: guessCategory(it.name), search_term: it.name, source: 'sms', added_by: member.name })
    added.push(`${it.name}${it.unit && it.unit !== 'whole' ? ` (${it.quantity} ${it.unit})` : ''}`)
  }
  const parts: string[] = []
  if (added.length) parts.push(`Added from your photo: ${added.join(', ')}. ✅`)
  if (dinners.length) {
    // The person in charge's dinner photo is saved as a family recipe; anyone else's goes on the idea list for a vote.
    if (member.profile_id === owner.id) {
      try {
        const { data: prof } = await admin.from('profiles').select('family_size, dietary_needs').eq('id', owner.id).single()
        const meals = await buildFamilyRecipes(dinners.slice(0, 8), { servings: Number(prof?.family_size) || 4, dietary: (prof?.dietary_needs as string[] | null) ?? [] })
        const r = await saveFamilyRecipes(admin, owner.id, meals)
        parts.push(r.saved.length ? `Saved to your family recipes: ${r.saved.join(', ')}. 🍽️` : `That's already in your family recipes.`)
      } catch (e) { console.error('photo dinner save failed', e) }
    } else {
      await addSuggestions(admin, owner, member.name, dinners.map((d) => d.slice(0, 60)))
      parts.push(dinners.length > 2
        ? `Got your list of ${dinners.length} dinners: ${dinners.map((d) => d.slice(0, 40)).join(', ')}. They're on the family's dinner ideas, and ${leaderLabel(owner)} can save them as family recipes from the Texts screen. 🍽️`
        : `Nice! ${dinners.map((d) => d.slice(0, 60)).join(', ')} ${dinners.length === 1 ? 'is' : 'are'} on the family's dinner ideas for a coming vote. 🍽️`)
    }
  }
  if (parts.length) return { reply: parts.join('\n'), householdId: member.household_id, memberId: member.id }
  // A screenshot or something else: let the conversation handle it, with what the photo shows.
  if (seen.length || caption) return { reply: '', householdId: member.household_id, memberId: member.id, passText: `${caption ? `${caption}\n` : ''}[They sent a photo. It shows: ${seen.join(' / ') || 'something unclear'}]` }
  return { reply: media.length ? `I couldn't make out that photo. Can you tell me what it is or what you need?` : `I couldn't open that picture. Try sending it again.`, householdId: member.household_id, memberId: member.id }
}

/**
 * Close rounds where everyone asked has answered (or that are older than 24h):
 * tally picks, top N become the week, nights assigned, planner texted.
 */
export async function checkVoteCompletion(admin: SupabaseClient, opts: { maxAgeHours?: number } = {}): Promise<number> {
  const maxAge = (opts.maxAgeHours ?? 24) * 3600000
  const { data: rounds } = await admin.from('vote_rounds').select('*').eq('status', 'open')
  const drafts = await draftRoundIds(admin)
  let n = 0
  for (const round of (rounds ?? []) as VoteRound[]) {
    if (drafts.has(round.id)) continue   // still with the person in charge for review
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
  // The family's weekly protein mix still holds: if fish wins three spots but the mix says one,
  // the next most-voted dinner that fits takes the extra spot.
  const mix = hasMix(settings.food.mix) ? scaleMix(settings.food.mix, round.picks_needed) : null
  const chosenR = mix
    ? pickByQuota(ranked, round.picks_needed, mix, (r) => proteinGroup(r.c.protein, r.c.name))
    : ranked.slice(0, round.picks_needed)
  // Sunday family dinner: the top-voted Sunday idea always makes the week (one, not two).
  const chosen = keepOneSunday(chosenR, ranked, (r) => r.c, settings.plan.sundayDinner?.on === true).map((r) => r.c)
  // Shopping trips: a trip's vote fills only that trip's nights.
  const tcfg = tripsConfig(settings)
  const tripNights = isClassic(tcfg) ? null : tripInstances(tcfg, round.week_start).find((t) => t.key === round.week_start)?.nights.map((n) => n.day) ?? null
  const shape: PlanShape = { dinnersPerWeek: round.picks_needed, cookDays: tripNights?.length ? tripNights : settings.plan.cookDays, nightTimes: [], leftoverNight: settings.plan.leftoverNight }
  // The week stays inside the family's budget (lib/budget): the next vote winners stand in first, tagged as budget picks.
  const { data: ob } = await admin.from('profiles').select('weekly_budget').eq('id', owner.id).maybeSingle()
  const inBudget = await keepInBudget(admin, owner.id, chosen, ob?.weekly_budget as string | null, settings, { prefer: ranked.map((r) => r.c).filter((c) => !chosen.includes(c)) })
  const saved = await savePlan(admin, owner.id, round.week_start, inBudget, shape)
  await admin.from('vote_rounds').update({ status: 'closed', closed_at: new Date().toISOString(), result: { chosen: saved.map((m) => m.name), tally } }).eq('id', round.id)

  // Name only the people who actually answered (Nov 9 2026: a family that never replied was told "heard from Me").
  const answered = Array.from(new Set(((votes ?? []) as Array<{ household_members: { name: string } | { name: string }[] | null }>)
    .map((v) => (Array.isArray(v.household_members) ? v.household_members[0] : v.household_members)?.name).filter((n): n is string => !!n)))
  const who = answered.join(', ')
  const lines = saved.map((m, i) => `${i + 1}. ${m.day.slice(0, 3)}: ${m.name}${tally[m.name] ? ` (${tally[m.name]} ${tally[m.name] === 1 ? 'vote' : 'votes'}${voters[m.name]?.length ? ` — ${voters[m.name].join(', ')}` : ''})` : ''}`)
  const head = ctx.everyone ? `DinnerDrop: everyone's voted${who ? ` (${who})` : ''}.`
    : who ? `DinnerDrop: voting closed — heard from ${who}.`
    : `DinnerDrop: no votes came in, so I kept the top picks.`
  const body = `${head} The week is set:\n${lines.join('\n')}\n\nWant a change? Reply SWAP 2 FOR tacos. Next: add anything else you need to the list, then approve the order → ${APP_URL}/grocery-list`
  const to = await ownerPhone(admin, owner)
  if (to) await sendFamilyText(admin, { householdId: round.household_id, to, body, intent: 'vote_complete' })
}

/* ------------------------------------------------------------------ */
/* The person in charge: review, change the week, ask the family      */
/* ------------------------------------------------------------------ */

async function ownerForResolve(admin: SupabaseClient, ownerId: string) {
  const { data } = await admin.from('profiles').select('id, household_id, full_name, settings, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs').eq('id', ownerId).single()
  return data
}

/** A dinner for a swap/add: one of their favorites by name, else the library / AI (like a family idea). */
/** "SWAP 2" with no dish named: the best library dinner for this family that isn't already in the week. */
export async function anyOtherDinner(admin: SupabaseClient, ownerId: string, exclude: string[], like?: Meal): Promise<Meal | null> {
  const { libraryWeek } = await import('@/lib/first-plan')
  const { proteinGroup } = await import('@/lib/protein-mix')
  const r = await libraryWeek(admin, ownerId, exclude, { firstWeek: true }).catch(() => null)
  if (!r || !r.ok || !r.meals.length) return null
  const want = like ? proteinGroup(like.protein ?? null, like.name) : null
  const same = want ? r.meals.find((m) => proteinGroup(m.protein ?? null, m.name) === want) : undefined
  return { ...(same ?? r.meals[0]) }
}

export async function dinnerFor(admin: SupabaseClient, ownerId: string, dish: string, exclude: string[]): Promise<Meal | null> {
  const want = dish.trim().toLowerCase()
  const { data: favs } = await admin.from('favorites').select('meal_name, meal_data').eq('user_id', ownerId)
  const fav = (favs ?? []).find((f) => String(f.meal_name).toLowerCase() === want) ?? (favs ?? []).find((f) => String(f.meal_name).toLowerCase().includes(want) && want.length >= 4)
  if (fav) return { ...(fav.meal_data as Meal) }
  const o = await ownerForResolve(admin, ownerId)
  if (!o) return null
  const m = await resolveSuggestion(admin, o, { name: dish.slice(0, 60), by: '', at: new Date().toISOString() } as Suggestion, exclude)
  return m ? { ...m, ideaBy: undefined } : null
}

/** Change a draft vote (not yet sent). Returns the updated round, or an error message. */
export async function editDraftRound(admin: SupabaseClient, ownerId: string, round: VoteRound, op: { kind: 'drop'; n: number } | { kind: 'swap'; n: number; dish?: string; meal?: Meal } | { kind: 'add'; dish?: string; meal?: Meal }): Promise<{ round?: VoteRound; error?: string; name?: string }> {
  const cands = [...round.candidates]
  const names = cands.map((c) => c.name)
  if (op.kind === 'drop') {
    if (!cands[op.n - 1]) return { error: `There's no #${op.n}.` }
    if (cands.length <= round.picks_needed) return { error: `The vote needs at least ${round.picks_needed} dinners. Swap it instead: SWAP ${op.n} FOR tacos.` }
    const [gone] = cands.splice(op.n - 1, 1)
    await admin.from('vote_rounds').update({ candidates: cands }).eq('id', round.id)
    return { round: { ...round, candidates: cands }, name: gone.name }
  }
  if (op.kind === 'swap' && !cands[op.n - 1]) return { error: `There's no #${op.n}.` }
  if (cands.length >= 15 && op.kind === 'add') return { error: 'The vote already has 15 dinners. Drop one first.' }
  const meal = op.meal ?? (op.dish ? await dinnerFor(admin, ownerId, op.dish, names) : op.kind === 'swap' ? await anyOtherDinner(admin, ownerId, names) : null)
  if (!meal) return { error: `I couldn't make "${op.dish ?? 'that'}" fit your family's rules. Try another dinner.` }
  if (op.kind === 'swap') cands[op.n - 1] = { ...meal, day: cands[op.n - 1].day }
  else cands.push({ ...meal, day: '' })
  await admin.from('vote_rounds').update({ candidates: cands }).eq('id', round.id)
  return { round: { ...round, candidates: cands }, name: meal.name }
}

/** After the vote: replace dinner #n of the week (in the order texted) and tell the family. */
export async function swapPlanDinner(admin: SupabaseClient, owner: OwnerRow, n: number, dish: string | Meal): Promise<string> {
  return swapPlanDinners(admin, owner, [n], dish)
}

/** This week as the numbered list the family texts against (MENU numbering). */
function numberedWeek(meals: Meal[], fresh: Set<number> = new Set()): string {
  return meals.map((m, i) => `${i + 1}. ${m.day ? `${String(m.day).slice(0, 3)}: ` : ''}${m.name}${fresh.has(i + 1) ? ' ✨' : ''}`).join('\n')
}

/**
 * Swap one or more of this week's dinners in ONE text (Sarah, Nov 9 2026: "this should not take so many messages").
 * No dish named: another dinner that fits the family, same kind of protein when possible (chicken for chicken).
 * The reply always shows the whole week with its current numbers, so the next text matches.
 */
export async function swapPlanDinners(admin: SupabaseClient, owner: OwnerRow, numbers: number[], dish: string | Meal = ''): Promise<string> {
  const plan = await latestPlan(admin, owner.id)
  if (!plan?.meals?.length) return `There's no week planned yet to change.`
  const meals = [...plan.meals]
  const bad = numbers.filter((n) => !meals[n - 1])
  if (bad.length === numbers.length) return `There's no #${bad[0]} this week. Your week:\n${numberedWeek(meals)}\nReply a number to swap that dinner.`
  const changed: Array<{ n: number; old: Meal; meal: Meal }> = []
  for (const n of Array.from(new Set(numbers)).filter((x) => meals[x - 1])) {
    const old = meals[n - 1]
    const names = meals.map((m) => m.name)
    const meal = typeof dish !== 'string' ? dish
      : dish.trim() ? await dinnerFor(admin, owner.id, dish, names)
      : await anyOtherDinner(admin, owner.id, names, old)
    if (!meal) continue
    meals[n - 1] = { ...meal, day: old.day, suggestedNight: old.suggestedNight }
    changed.push({ n, old, meal })
  }
  if (!changed.length) return `I couldn't find another dinner that fits your family's rules for that one. Text SWAP ${numbers[0]} FOR + a dish you'd like.`
  const total = meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  // grocery_list {} = the grocery page rebuilds this week's list from the new dinners (Nov 8 2026: a texted swap left the old
  // dinner's ingredients on the list). Lines already sent to a store are kept by the page.
  await admin.from('meal_plans').update({ meals, total_estimated_cost: total, grocery_list: {} }).eq('id', plan.id)
  const leader = leaderLabel(owner)
  const { data: fam } = await admin.from('household_members').select('*').eq('household_id', owner.household_id)
  let told = 0
  for (const mm of (fam ?? []) as MemberRow[]) {
    if (mm.profile_id === owner.id) continue
    if (await textMember(admin, mm, `${leader} changed the week: ${changed.map((c) => `${c.old.day || 'a night'} is now ${c.meal.name}`).join('; ')}.`, 'plan_change')) told++
  }
  return `Done ✨ Your week now:\n${numberedWeek(meals, new Set(changed.map((c) => c.n)))}\nWant another change? Reply its number.${told ? ' I let the family know.' : ''} Your list updates when you open it.`
}

/** "SWAP" with no number: show the week so one reply does it. */
export async function swapWhich(admin: SupabaseClient, owner: OwnerRow): Promise<string> {
  const plan = await latestPlan(admin, owner.id)
  if (!plan?.meals?.length) return `There's no week planned yet to change.`
  return `Which one? Reply its number (or a few, like "1 3"):\n${numberedWeek(plan.meals)}`
}

/** Start a family question or takeout round. */
export async function startFamilyAsk(admin: SupabaseClient, owner: OwnerRow, kind: FamilyAsk['kind'], text: string): Promise<{ sent: number; error?: string }> {
  const { data: fam } = await admin.from('household_members').select('*').eq('household_id', owner.household_id)
  const to = ((fam ?? []) as MemberRow[]).filter((mm) => mm.profile_id !== owner.id && mm.phone && mm.phone_opt_in_at && !mm.phone_opted_out)
  if (!to.length) return { sent: 0, error: 'Nobody else has joined the family texts yet.' }
  const ask: FamilyAsk = { id: crypto.randomUUID(), kind, question: kind === 'question' ? text : 'takeout', place: kind === 'takeout' ? text : undefined, at: new Date().toISOString(), asked: to.map((mm) => ({ id: mm.id, name: mm.name })), answers: {} }
  await putAsk(admin, owner.household_id, ask)
  const leader = leaderLabel(owner)
  let sent = 0
  for (const mm of to) if (await textMember(admin, mm, askText(ask, leader), `family_ask:${ask.id}`)) sent++
  return { sent }
}

async function finishAsk(admin: SupabaseClient, householdId: string, ask: FamilyAsk, owner: OwnerRow): Promise<void> {
  if (ask.done) return
  ask.done = true
  await putAsk(admin, householdId, ask)
  const to = await ownerPhone(admin, owner)
  if (!to) return
  const body = askSummary(ask)
  const r = await sendSms(to, body)
  await admin.from('sms_messages').insert({ household_id: householdId, direction: 'out', to_number: to, body, intent: `ask_result:${ask.id}`, twilio_sid: r.sid ?? null })
}

/** Questions/takeout rounds whose time is up: send what came in. */
export async function familyAskSweep(admin: SupabaseClient): Promise<number> {
  let n = 0
  for (const a of await openAsks(admin)) {
    const mins = (Date.now() - new Date(a.at).getTime()) / 60000
    if (mins < ASK_WINDOW_MIN[a.kind]) continue
    const owner = await ownerForHousehold(admin, a.householdId)
    if (owner) { await finishAsk(admin, a.householdId, a, owner); n++ }
  }
  return n
}

/** Draft votes nobody touched by their send time go out to the family. */
export async function draftSweep(admin: SupabaseClient): Promise<number> {
  let n = 0
  for (const d of await dueDrafts(admin)) {
    try { await startVoteCycle(admin, d.ownerId, { sendDraft: true }); n++ } catch (e) { console.error('draftSweep', d.ownerId, e) }
  }
  return n
}

/** What the person in charge texted: act on it. Null = not this kind of message after all (falls through). */
async function leaderCommand(admin: SupabaseClient, owner: OwnerRow, m: MemberRow, cmd: LeaderCommand): Promise<string | null> {
  if (cmd.kind === 'ask' || cmd.kind === 'takeout') {
    const r = await startFamilyAsk(admin, owner, cmd.kind === 'ask' ? 'question' : 'takeout', cmd.kind === 'ask' ? cmd.question : cmd.place)
    if (r.error) return r.error
    return cmd.kind === 'ask'
      ? `Asked ${r.sent} ${r.sent === 1 ? 'person' : 'people'}. I'll text you the answers when everyone's replied (or in an hour).`
      : `Asked everyone for their order${cmd.place ? ` from ${cmd.place}` : ''}. I'll text you the full list when everyone's answered (or in 45 minutes).`
  }
  const draft = await getDraft(admin, owner.household_id)
  const round = draft ? await openRound(admin, owner.household_id) : null
  if (draft && round && round.id === draft.roundId) {
    if (cmd.kind === 'send') {
      const r = await startVoteCycle(admin, owner.id, { sendDraft: true })
      return `Sent to ${r.voteTextsSent} ${r.voteTextsSent === 1 ? 'person' : 'people'}. 🗳️`
    }
    const r = cmd.kind === 'drop' ? await editDraftRound(admin, owner.id, round, { kind: 'drop', n: cmd.n })
      : cmd.kind === 'swap' ? await editDraftRound(admin, owner.id, round, { kind: 'swap', n: cmd.n, dish: cmd.dish })
      : await editDraftRound(admin, owner.id, round, { kind: 'add', dish: cmd.dish })
    if (r.error || !r.round) return r.error ?? 'That didn\'t work. Try again.'
    const what = cmd.kind === 'drop' ? `Took off ${r.name}.` : cmd.kind === 'swap' ? `#${cmd.n} is now ${r.name}.` : `Added ${r.name}.`
    return `${what} The vote now:\n${pickLines(r.round.candidates)}\n\nReply SEND when it looks right.`
  }
  if (cmd.kind === 'swap') return swapPlanDinner(admin, owner, cmd.n, cmd.dish)
  if (cmd.kind === 'send') return `There's no vote waiting for you to send.`
  return null   // drop / add dinner outside a draft: let the normal handling take it
}

/**
 * A family's first vote, sent as soon as the first family member replies YES (Sarah, Nov 7 2026) instead of
 * waiting for vote day. Once per household (only if it has never had a vote), classic weekly plans only.
 * Fri–Sun it's for the coming week as usual; Mon–Thu it's for NEXT week, so this week's plan isn't replaced.
 */
export async function startFirstVote(admin: SupabaseClient, ownerId: string, householdId: string, now = new Date()): Promise<CycleReport | null> {
  const { count } = await admin.from('vote_rounds').select('id', { count: 'exact', head: true }).eq('household_id', householdId)
  if ((count ?? 0) > 0) return null
  const { data: o } = await admin.from('profiles').select('timezone, settings').eq('id', ownerId).maybeSingle()
  if (!o) return null
  if (!isClassic(tripsConfig(mergeSettings(o.settings)))) return null
  const { weekday } = localNow(o.timezone || 'America/New_York', now)
  const weekStart = ['fri', 'sat', 'sun'].includes(weekday)
    ? (weekday === 'fri' ? mondayOf(new Date(now.getTime() + 3 * 86400000)) : targetWeekFor(now, weekday))
    : mondayOf(new Date(now.getTime() + 7 * 86400000))
  try { return await startVoteCycle(admin, ownerId, { now, weekStart }) } catch (e) { console.error('[first-vote]', e); return null }
}
