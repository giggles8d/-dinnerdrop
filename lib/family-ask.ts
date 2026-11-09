/**
 * The person in charge (Sarah, Nov 7 2026): each family names them (Settings → texting.leaderTitle, e.g. "Mom",
 * "Head Chef"); blank uses their first name. What they can do by text or on the site:
 *  - Review the vote before it goes out (texting.reviewFirst): the round waits as a draft; they drop / swap / add
 *    dinners, then SEND (or it goes out on its own after texting.reviewHours).
 *  - Change the week after the vote: "swap 2 for tacos" → the plan changes and the family is told.
 *  - Ask the family a quick question ("ask everyone: tacos tonight?") → answers collected, result texted back.
 *  - Takeout: "takeout from Wingstop" → everyone replies with their order; one combined list comes back,
 *    with links to order (affiliate-tagged when the programs are set up — /api/go/takeout).
 * Drafts and open questions live in app_kv (no schema change).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings } from '@/lib/settings'
import type { Meal } from '@/types'

export const APP_URL = 'https://www.dinnerdrop.app'

export function firstNameOf(fullName: string | null | undefined): string {
  const f = (fullName || '').trim().split(' ')[0]
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : ''
}

/** What the family calls the person in charge: their chosen title, else their first name. */
export function leaderLabel(owner: { full_name: string | null; settings: unknown }): string {
  const t = mergeSettings(owner.settings).texting.leaderTitle?.trim()
  return t || firstNameOf(owner.full_name) || 'Your planner'
}

/* ------------------------------ drafts ------------------------------ */

export interface DraftInfo { roundId: string; ownerId: string; sendAt: string }
const draftKey = (householdId: string) => `vote_draft:${householdId}`

export async function getDraft(admin: SupabaseClient, householdId: string): Promise<DraftInfo | null> {
  const { data } = await admin.from('app_kv').select('value').eq('key', draftKey(householdId)).maybeSingle()
  const v = data?.value as DraftInfo | undefined
  return v?.roundId ? v : null
}
export async function setDraft(admin: SupabaseClient, householdId: string, d: DraftInfo): Promise<void> {
  await admin.from('app_kv').upsert({ key: draftKey(householdId), value: d, updated_at: new Date().toISOString() })
}
export async function clearDraft(admin: SupabaseClient, householdId: string): Promise<void> {
  await admin.from('app_kv').delete().eq('key', draftKey(householdId))
}
export async function draftRoundIds(admin: SupabaseClient): Promise<Set<string>> {
  const { data } = await admin.from('app_kv').select('value').like('key', 'vote_draft:%')
  return new Set((data ?? []).map((r) => (r.value as DraftInfo)?.roundId).filter(Boolean))
}
export async function dueDrafts(admin: SupabaseClient, now = new Date()): Promise<Array<DraftInfo & { householdId: string }>> {
  const { data } = await admin.from('app_kv').select('key, value').like('key', 'vote_draft:%')
  return (data ?? []).map((r) => ({ ...(r.value as DraftInfo), householdId: String(r.key).slice('vote_draft:'.length) }))
    .filter((d) => d.roundId && new Date(d.sendAt).getTime() <= now.getTime())
}

/* ----------------------- planner commands by text ----------------------- */

export type LeaderCommand =
  | { kind: 'send' }
  | { kind: 'swap'; n: number; dish: string }
  | { kind: 'drop'; n: number }
  | { kind: 'add_dinner'; dish: string }
  | { kind: 'ask'; question: string }
  | { kind: 'takeout'; place: string }

/** Commands only the person in charge can text. */
export function parseLeaderCommand(raw: string): LeaderCommand | null {
  const t = raw.trim().replace(/[.!]+$/, '')
  if (/^(send|send it|send now|send the vote|send vote|looks good,? send( it)?|ok,? send( it)?)$/i.test(t)) return { kind: 'send' }
  let m = t.match(/^(?:swap|change|replace|switch)\s*#?\s*(\d{1,2})\s*(?:for|with|to|into)\s+(.{2,80})$/i)
  if (m) return { kind: 'swap', n: Number(m[1]), dish: m[2].trim() }
  // "SWAP 2" on its own: any other dinner that fits the family (the first text invites exactly this, Nov 9 2026).
  m = t.match(/^(?:swap|change|replace|switch|new)\s*#?\s*(\d{1,2})$/i)
  if (m) return { kind: 'swap', n: Number(m[1]), dish: '' }
  m = t.match(/^(?:drop|remove|cut|take off|delete)\s*#?\s*(\d{1,2})$/i)
  if (m) return { kind: 'drop', n: Number(m[1]) }
  m = t.match(/^add\s+(?:a\s+)?(?:dinner|meal|option)\s*[:\-]?\s*(.{2,80})$/i)
  if (m) return { kind: 'add_dinner', dish: m[1].trim() }
  m = t.match(/^(?:ask|poll|text|message)\s+(?:everyone|everybody|the family|family|all|the kids|kids|the group|group)\s*(if|whether)?\s*[:,\-]?\s*(.{3,300})$/i)
  if (m) {
    // "ask everyone if they want pizza tonight" → "Do you want pizza tonight?"
    const q = m[1] ? `Do you ${m[2].trim().replace(/^(they|we|everyone|everybody|you)\s+(would\s+)?/i, '')}` : m[2].trim()
    return { kind: 'ask', question: q }
  }
  m = t.match(/^(?:take ?-?out|order(?:ing)?\s+(?:take ?-?out|out|food|dinner|in|delivery)|get(?:ting)?\s+(?:take ?-?out|delivery))(?:\s+tonight)?(?:\s+(?:from|at)\s+(.{2,60}))?(?:\s+tonight)?\??$/i)
  if (m) return { kind: 'takeout', place: (m[1] ?? '').trim() }
  return null
}

/* --------------------------- family questions --------------------------- */

export interface FamilyAsk {
  id: string
  kind: 'question' | 'takeout'
  question: string
  place?: string
  at: string
  asked: Array<{ id: string; name: string }>
  answers: Record<string, { name: string; text: string; at: string }>
  done?: boolean
}
const askKey = (householdId: string) => `family_ask:${householdId}`
export const ASK_WINDOW_MIN = { question: 60, takeout: 45 }

export async function getAsk(admin: SupabaseClient, householdId: string): Promise<FamilyAsk | null> {
  const { data } = await admin.from('app_kv').select('value').eq('key', askKey(householdId)).maybeSingle()
  return (data?.value as FamilyAsk | undefined) ?? null
}
export async function putAsk(admin: SupabaseClient, householdId: string, a: FamilyAsk): Promise<void> {
  await admin.from('app_kv').upsert({ key: askKey(householdId), value: a, updated_at: new Date().toISOString() })
}
export async function openAsks(admin: SupabaseClient): Promise<Array<FamilyAsk & { householdId: string }>> {
  const { data } = await admin.from('app_kv').select('key, value').like('key', 'family_ask:%')
  return (data ?? []).map((r) => ({ ...(r.value as FamilyAsk), householdId: String(r.key).slice('family_ask:'.length) })).filter((a) => a.id && !a.done)
}
export function askIsLive(a: FamilyAsk | null, now = Date.now()): a is FamilyAsk {
  return !!a && !a.done && now - new Date(a.at).getTime() < 3 * 3600000
}

/** "4 yes, 1 no" plus who said what, for the person in charge. */
export function askSummary(a: FamilyAsk): string {
  const lines = a.asked.map((p) => {
    const ans = a.answers[p.id]
    return ans ? `• ${p.name}: ${ans.text}` : `• ${p.name}: (no answer)`
  })
  if (a.kind === 'takeout') {
    const got = Object.keys(a.answers).length
    return `DinnerDrop: takeout orders${a.place ? ` for ${a.place}` : ''} (${got} of ${a.asked.length}):\n${lines.join('\n')}\n\nOrder it: ${APP_URL}/api/go/takeout?a=doordash · Uber Eats: ${APP_URL}/api/go/takeout?a=ubereats · Grubhub: ${APP_URL}/api/go/takeout?a=grubhub`
  }
  const vals = Object.values(a.answers).map((x) => x.text.trim().toLowerCase())
  const yes = vals.filter((v) => /^(y|yes|yep|yeah|sure|ok|okay|yes please|👍|definitely|absolutely)\b/.test(v)).length
  const no = vals.filter((v) => /^(n|no|nope|nah|not really|pass|👎)\b/.test(v)).length
  const head = yes + no ? `${yes} yes, ${no} no` : `${vals.length} answered`
  return `DinnerDrop: "${a.question}" — ${head}:\n${lines.join('\n')}`
}

/** Ack to a family member who answered. */
export function askAck(a: FamilyAsk, leader: string): string {
  return a.kind === 'takeout' ? `Got your order. I'll send it to ${leader}. 🥡` : `Got it, I'll tell ${leader}. 👍`
}

/** Text to the family for a new ask. */
export function askText(a: FamilyAsk, leader: string): string {
  if (a.kind === 'takeout') return `${leader}: ordering takeout${a.place ? ` from ${a.place}` : ''} tonight! Reply with what you want (be specific, like "#4 combo, no pickles, Coke"). Reply NOTHING if you're all set.`
  return `${leader} asks: ${a.question}${/\?$/.test(a.question) ? '' : '?'} Reply YES or NO (or what you'd rather have).`
}

/* ------------------------------ week changes ------------------------------ */

export function dayShort(m: Meal): string { return (m.day || '').slice(0, 3) }
