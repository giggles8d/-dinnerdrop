/**
 * One check for every email DinnerDrop sends: never email a test account. (Sarah, Nov 25 2026)
 *
 * Why: test accounts made on previews (claude-test-*@dinnerdrop.app) aren't real mailboxes. Nine of the ten emails
 * sent to them on Nov 25 bounced, and bounces hurt our sender reputation (bounce rate was already 3.7%).
 *
 * Every sender uses SafeResend instead of Resend (lib/notify sendEmail does too). It drops test recipients, logs the
 * skip and returns without calling Resend. It never throws for a skip.
 *
 * Kinds:
 *   - 'family' (the default): automated family email (welcome, day-1/3/7, plan-ready, Sunday Drop, follow-ups,
 *     check-ins, cart-ask, trial-ending, campaigns). Skips every test account: a @dinnerdrop.app address or a profile
 *     with settings.isTest = true (lib/tracking-env isTestProfile).
 *   - 'direct': a reply or an email the person asked for (sign-in code, password reset, receipt reply, Sarah's own
 *     note to a member). 'admin': email to Sarah or the team inbox. Both skip only @dinnerdrop.app addresses that
 *     aren't a real mailbox. Real mailboxes: sarah@, sarah+anything@ (Google Workspace delivers + addresses to
 *     Sarah's inbox), and info@.
 *
 * Test accounts from Nov 25 2026 on: sarah+test-<name>@dinnerdrop.app, marked settings.isTest = true. They still
 * get sign-in codes and resets (real mailbox), never automated family email.
 *
 * Not covered: app/api/stripe/webhook/route.ts sends with Resend directly and is off-limits without Sarah's OK.
 */
import { Resend, type CreateEmailOptions, type CreateEmailRequestOptions, type CreateEmailResponse } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { isTestProfile } from '@/lib/tracking-env'

export type EmailKind = 'family' | 'direct' | 'admin'

const INTERNAL_DOMAIN = /@dinnerdrop\.app$/i
/** @dinnerdrop.app addresses that are real mailboxes. */
const REAL_MAILBOX = /^(?:sarah(?:\+[^@\s]*)?|info)@dinnerdrop\.app$/i

/** True when this address is Sarah's real mailbox or the team inbox. */
export function isRealInternalMailbox(email: string): boolean {
  return REAL_MAILBOX.test(email.trim())
}

// Emails of profiles flagged settings.isTest, cached per server instance for a minute (one query, not one per email).
let flagged: { at: number; emails: Set<string> } | null = null
async function flaggedTestEmails(): Promise<Set<string>> {
  if (flagged && Date.now() - flagged.at < 60_000) return flagged.emails
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await admin.from('profiles').select('email').eq('settings->>isTest', 'true')
    if (error) throw error
    const emails = new Set((data ?? []).map((r) => String(r.email ?? '').trim().toLowerCase()).filter(Boolean))
    flagged = { at: Date.now(), emails }
    return emails
  } catch (e) {
    // If the lookup fails, the address rule still applies; never block real families' email over it.
    console.error('[email-guard] test-account lookup failed', e)
    return flagged?.emails ?? new Set()
  }
}

/** Why this address must not get this kind of email, or null if it may. */
export async function skipReason(email: string, kind: EmailKind = 'family'): Promise<string | null> {
  const e = email.trim().toLowerCase()
  if (!e) return 'empty address'
  if (kind !== 'family') {
    return INTERNAL_DOMAIN.test(e) && !isRealInternalMailbox(e) ? 'internal address that is not a mailbox' : null
  }
  if (isTestProfile({ email: e })) return 'test account (@dinnerdrop.app)'
  if ((await flaggedTestEmails()).has(e)) return 'test account (settings.isTest)'
  return null
}

function list(v: string | string[] | undefined): string[] {
  return v == null ? [] : Array.isArray(v) ? v : [v]
}

/** Drop-in for `new Resend(key)` (only `emails.send` is used by our senders). */
export class SafeResend {
  private readonly inner: Resend
  readonly emails: { send: (payload: CreateEmailOptions, options?: CreateEmailRequestOptions) => Promise<CreateEmailResponse> }

  constructor(apiKey?: string, kind: EmailKind = 'family') {
    this.inner = new Resend(apiKey)
    this.emails = {
      send: async (payload, options) => {
        const keep: string[] = []
        for (const to of list(payload.to)) {
          const why = await skipReason(to, kind)
          if (why) console.log(`[email-guard] skipped ${to}: ${why} (${kind}) — "${payload.subject}"`)
          else keep.push(to)
        }
        if (!keep.length) return { data: { id: 'skipped-test-account' }, error: null } as CreateEmailResponse
        const cc = (await Promise.all(list(payload.cc).map(async (a) => ((await skipReason(a, kind)) ? null : a)))).filter((a): a is string => !!a)
        const bcc = (await Promise.all(list(payload.bcc).map(async (a) => ((await skipReason(a, kind)) ? null : a)))).filter((a): a is string => !!a)
        return this.inner.emails.send({
          ...payload,
          to: Array.isArray(payload.to) ? keep : keep[0],
          ...(payload.cc ? { cc } : {}),
          ...(payload.bcc ? { bcc } : {}),
        } as CreateEmailOptions, options)
      },
    }
  }
}
