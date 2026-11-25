/**
 * Day 1 / 3 / 7 setup emails, sent by /api/cron/email-sequences (Nov 22 2026 review, Part 6 fixes 1-3, Sarah approved).
 *
 * Moved here from the cron's call to /api/email/send-trial so the cron can fix what the review found in one place:
 *  - Reply-To Sarah: the emails say "reply, it comes to me", but replies went to the info@ sender.
 *  - The family's first name ("Hi there" every time: the cron never passed it).
 *  - Day 3's subject and main button: the button was "Swap a dinner" (a sign-in page); now it's the one-tap cart.
 *  - In-store families (stores.mode 'instore') get the no-sign-in list link instead of an Instacart button.
 *  - "and 0 more" subjects with exactly two dinners; em dashes in subjects.
 * /api/email/send-trial is left as it was for anything else that calls it.
 */
import React from 'react'
import { SafeResend } from '@/lib/email-guard'
import { render } from '@react-email/render'
import type { SupabaseClient } from '@supabase/supabase-js'
import ActivateDay1 from '@/emails/ActivateDay1'
import ActivateDay3 from '@/emails/ActivateDay3'
import ActivateDay7 from '@/emails/ActivateDay7'
import { fromAddress } from '@/lib/notify'
import { shopUrl } from '@/lib/followup'
import { mergeSettings } from '@/lib/settings'
import { listUrl, shopsInStore } from '@/lib/list-link'

const APP = 'https://www.dinnerdrop.app'
const REPLY_TO = 'sarah@dinnerdrop.app'

export type ActivationNumber = 1 | 2 | 3

export interface ActivationProps {
  firstName?: string
  unsubscribeUrl: string
  shopUrl?: string
  listUrl?: string
  inStore?: boolean
  dinners?: string[]
}

/** "Tacos", "Tacos and Pasta", "Tacos and 4 more". */
function dinnersPhrase(d: string[]): string {
  if (d.length === 0) return ''
  if (d.length === 1) return d[0]
  if (d.length === 2) return `${d[0]} and ${d[1]}`
  return `${d[0]} and ${d.length - 1} more`
}

export function activationSubject(n: ActivationNumber, dinners: string[], inStore: boolean): string {
  const phrase = dinnersPhrase(dinners)
  if (n === 1) {
    if (dinners.length >= 2) return `${dinners.length === 2 ? `${dinners[0]} and ${dinners[1]}` : `${dinners[0]}, ${dinners[1]} and ${dinners.length - 2} more`} are ready`
    return inStore ? 'Your grocery list is ready for the store' : 'Your grocery list is ready, one tap to Instacart'
  }
  if (n === 2) return phrase ? `Your list for ${phrase} is built` : 'Your grocery list is built'
  return dinners.length ? `Still on for ${dinners[0]} this week?` : 'Your dinners are still planned'
}

const TEMPLATES: Record<ActivationNumber, React.FC<ActivationProps>> = { 1: ActivateDay1, 2: ActivateDay3, 3: ActivateDay7 }

export async function sendActivationEmail(admin: SupabaseClient, opts: { userId: string; email: string; firstName?: string | null; number: ActivationNumber }): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not configured' }
  const to = String(opts.email).trim()
  // A typo'd address ("name@hot") can't be delivered; skip it quietly.
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to)) return { ok: false, skipped: 'invalid email address' }

  const [{ data: plan }, { data: prof }] = await Promise.all([
    admin.from('meal_plans').select('meals').eq('user_id', opts.userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('profiles').select('settings').eq('id', opts.userId).maybeSingle(),
  ])
  const dinners = ((plan?.meals as Array<{ name?: string }> | null) ?? []).map((m) => String(m?.name ?? '').trim()).filter(Boolean)
  const inStore = shopsInStore(mergeSettings(prof?.settings))
  const kind = opts.number === 1 ? 'day1' : opts.number === 2 ? 'day3' : 'day7'
  const unsubscribeUrl = `${APP}/unsubscribe?uid=${opts.userId}`
  const first = String(opts.firstName ?? '').trim().split(' ')[0]

  const html = await render(React.createElement(TEMPLATES[opts.number], {
    firstName: first || 'there',
    unsubscribeUrl,
    shopUrl: shopUrl(opts.userId, kind),
    listUrl: listUrl(opts.userId),
    inStore,
    dinners,
  }))
  const send = () => new SafeResend(process.env.RESEND_API_KEY).emails.send({
    from: fromAddress(),
    to,
    reply_to: REPLY_TO,
    subject: activationSubject(opts.number, dinners, inStore),
    html,
    headers: {
      'List-Unsubscribe': `<${APP}/api/email/unsubscribe?uid=${opts.userId}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  // Resend allows 10 requests a second, shared with other jobs: wait and retry a rate-limited send.
  let { error } = await send()
  for (let attempt = 1; attempt <= 3 && error && error.name === 'rate_limit_exceeded'; attempt++) {
    await new Promise((r) => setTimeout(r, 1000 * attempt))
    ;({ error } = await send())
  }
  if (error) return { ok: false, error: typeof error === 'string' ? error : error.message ?? 'send failed' }
  return { ok: true }
}
