/**
 * The planner's "Texts" screen (Sarah, Nov 7 2026): every text in and out of the family, with whether each one
 * actually reached the phone (Twilio delivery status), so the person in charge can see and fix problems.
 */

export type Delivery = { status: string; errorCode: number | null }

/** Plain-English reason for a Twilio delivery error. */
export function deliveryProblem(code: number | null, mms: boolean): string {
  switch (code) {
    case 30003: return 'The phone was off or out of service.'
    case 30004: return 'This number blocked our texts (or replied STOP to the carrier).'
    case 30005: return 'That phone number doesn\'t exist. Check it in Settings.'
    case 30006: return 'That number is a landline and can\'t get texts.'
    case 30007: return 'The carrier filtered it as spam.'
    case 30008: return mms ? 'The phone couldn\'t take the picture text. Picture messages may be off on that phone; try the plain-text vote.' : 'The carrier couldn\'t deliver it.'
    case 30019: return 'The picture was too big for that carrier.'
    case 30034: return 'The carrier is blocking our number until it\'s registered.'
    default: return code ? `The carrier couldn't deliver it (code ${code}).` : 'Not delivered.'
  }
}

/** Delivery status of everything we sent to these phones in the last `days` days, keyed by message SID. */
export async function deliveryStatuses(phones: string[], days = 14): Promise<Record<string, Delivery>> {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from || !phones.length) return {}
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
  const out: Record<string, Delivery> = {}
  await Promise.all(Array.from(new Set(phones)).slice(0, 12).map(async (to) => {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?From=${encodeURIComponent(from)}&To=${encodeURIComponent(to)}&DateSent%3E=${since}&PageSize=200`
      const res = await fetch(url, { headers: { Authorization: auth }, cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json() as { messages?: Array<{ sid: string; status: string; error_code: number | null }> }
      for (const m of json.messages ?? []) out[m.sid] = { status: m.status, errorCode: m.error_code ?? null }
    } catch { /* statuses are best-effort */ }
  }))
  return out
}

/** Short label for what a text was. */
export function intentLabel(intent: string | null, direction: string): string {
  const i = (intent ?? '').split(':')[0]
  if (direction === 'in') {
    const m: Record<string, string> = { pick: 'Vote', skip: 'Vote', add: 'Added to list', suggest: 'Dinner idea', save_recipe: 'Saved a recipe', photo: 'Photo', optin: 'Joined', stop: 'Stopped texts', start: 'Restarted texts', menu: 'Asked for menu', tonight: 'Asked about tonight', list: 'Asked for list', tally: 'Asked for votes', recipe: 'Asked for a recipe', allgood: 'All good', none: 'No picks', again: 'Bring back', order_total: 'Order total', use_up: 'Use up', thanks: 'Thanks', help: 'Help' }
    return m[i] ?? 'Text'
  }
  const m: Record<string, string> = { vote_request: 'Vote', vote_plain: 'Vote (plain text)', idea_in_vote: 'Idea in vote', again_request: 'Bring back?', anything_else: 'Anything to add?', opt_in: 'Join invite', reply: 'Reply', owner_message: 'Your message', relay: 'Passed on', for_planner: 'For you', receipt_nudge: 'Receipt', shop_reminder: 'Shop reminder', plan_ready: 'Plan ready', list_waiting: 'List waiting', dinner_ask: 'Dinner question', last_call: 'Last call', admin_message: 'Message' }
  return m[i] ?? i.replace(/_/g, ' ')
}
