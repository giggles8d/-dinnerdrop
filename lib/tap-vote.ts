/**
 * Tap-to-vote (Nov 8 2026, Rich: "I have a hard time memorizing the numbers… I'd rather click on the ones I like").
 * A short link in the vote text (dinnerdrop.app/v/<code>) opens the week's dinner ideas as photo cards; the member taps
 * the ones they want and their picks count exactly like texted numbers (meal_votes + an inbound 'pick' log line, so the
 * round closes the same way). One code per member per round, kept in app_kv. Test codes record nothing.
 *
 * Nov 8 2026 (Sarah): the "which dinners should come back?" text gets the same tap page (mode 'again'): tapping a
 * dinner = "bring it back" (an 'again' vote, same as texting AGAIN + numbers). Any family member can also ♥ a dinner on
 * either page to save it to the family favorites (shown as "♥ added by Rich"); the planner can remove it.
 */
import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

const APP = 'https://www.dinnerdrop.app'
export interface TapCode {
  memberId: string
  test?: boolean
  /** 'vote' (default): picks for an open vote round. 'again': which recent dinners to bring back. */
  mode?: 'vote' | 'again'
  roundId?: string
  /** mode 'again': the plan owner, the plan week the votes are filed under, and the dinners in the text (same order). */
  ownerId?: string
  weekStart?: string
  meals?: string[]
}

async function codeFor(admin: SupabaseClient, byKey: string, value: TapCode): Promise<string> {
  const { data: have } = await admin.from('app_kv').select('value').eq('key', byKey).maybeSingle()
  let code = (have?.value as { code?: string } | null)?.code
  if (!code) {
    code = randomBytes(6).toString('base64url')
    const now = new Date().toISOString()
    await admin.from('app_kv').insert({ key: `tapvote:${code}`, value, updated_at: now })
    await admin.from('app_kv').upsert({ key: byKey, value: { code }, updated_at: now })
  }
  return `${APP}/v/${code}`
}

export async function tapVoteUrl(admin: SupabaseClient, roundId: string, memberId: string, test = false): Promise<string> {
  return codeFor(admin, `tapvote_by:${roundId}:${memberId}${test ? ':test' : ''}`, { roundId, memberId, ...(test ? { test: true } : {}) })
}

/** The "bring it back?" tap link: one per member per send day (the dinners are fixed in the code, like the numbered text). */
export async function againTapUrl(admin: SupabaseClient, a: { ownerId: string; memberId: string; weekStart: string; meals: string[]; day: string; test?: boolean }): Promise<string> {
  return codeFor(admin, `tapagain_by:${a.memberId}:${a.day}${a.test ? ':test' : ''}`, { mode: 'again', memberId: a.memberId, ownerId: a.ownerId, weekStart: a.weekStart, meals: a.meals.slice(0, 14), ...(a.test ? { test: true } : {}) })
}

export async function readTapCode(admin: SupabaseClient, code: string): Promise<TapCode | null> {
  if (!/^[A-Za-z0-9_-]{6,16}$/.test(code)) return null
  const { data } = await admin.from('app_kv').select('value').eq('key', `tapvote:${code}`).maybeSingle()
  const v = data?.value as TapCode | undefined
  if (!v?.memberId) return null
  if (v.mode === 'again') return v.ownerId && v.weekStart && v.meals?.length ? v : null
  return v.roundId ? { ...v, mode: 'vote' } : null
}
