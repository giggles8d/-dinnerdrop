/**
 * Tap-to-vote (Nov 8 2026, Rich: "I have a hard time memorizing the numbers… I'd rather click on the ones I like").
 * A short link in the vote text (dinnerdrop.app/v/<code>) opens the week's dinner ideas as photo cards; the member taps
 * the ones they want and their picks count exactly like texted numbers (meal_votes + an inbound 'pick' log line, so the
 * round closes the same way). One code per member per round, kept in app_kv. Test codes record nothing.
 */
import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

const APP = 'https://www.dinnerdrop.app'
export interface TapCode { roundId: string; memberId: string; test?: boolean }

export async function tapVoteUrl(admin: SupabaseClient, roundId: string, memberId: string, test = false): Promise<string> {
  const byKey = `tapvote_by:${roundId}:${memberId}${test ? ':test' : ''}`
  const { data: have } = await admin.from('app_kv').select('value').eq('key', byKey).maybeSingle()
  let code = (have?.value as { code?: string } | null)?.code
  if (!code) {
    code = randomBytes(6).toString('base64url')
    const now = new Date().toISOString()
    await admin.from('app_kv').insert({ key: `tapvote:${code}`, value: { roundId, memberId, ...(test ? { test: true } : {}) }, updated_at: now })
    await admin.from('app_kv').upsert({ key: byKey, value: { code }, updated_at: now })
  }
  return `${APP}/v/${code}`
}

export async function readTapCode(admin: SupabaseClient, code: string): Promise<TapCode | null> {
  if (!/^[A-Za-z0-9_-]{6,16}$/.test(code)) return null
  const { data } = await admin.from('app_kv').select('value').eq('key', `tapvote:${code}`).maybeSingle()
  const v = data?.value as TapCode | undefined
  return v?.roundId && v?.memberId ? v : null
}
