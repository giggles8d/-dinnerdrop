/**
 * Helpers for the Resend → DinnerDrop webhook (app/api/webhooks/resend/route.ts). Sarah, Nov 27 2026.
 * Server-only (node crypto). Kept out of the route file because Next route files may only export handlers.
 */
import { createHmac, timingSafeEqual } from 'crypto'

const TOLERANCE_S = 5 * 60

/** Svix signature check (Resend signs webhooks with Svix). Secret is the endpoint's "whsec_…" signing secret. */
export function verifySvix(secret: string, id: string, timestamp: string, signatureHeader: string, body: string, now = Date.now()): boolean {
  const ts = Number(timestamp)
  if (!id || !Number.isFinite(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_S) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest()
  // The header holds one or more "v1,<base64>" entries separated by spaces (several during secret rotation).
  return signatureHeader.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) return false
    const got = Buffer.from(sig, 'base64')
    return got.length === expected.length && timingSafeEqual(got, expected)
  })
}

export type ResendEvent = {
  type?: string
  data?: {
    email?: string
    unsubscribed?: boolean
    to?: string[] | string
    bounce?: { type?: string; subType?: string }
  }
}

export type StopReason = 'unsubscribed' | 'complained' | 'bounced'

/** Addresses this event should stop emailing, and why. Empty when the event needs no change. */
export function stopListFor(ev: ResendEvent): { emails: string[]; why: StopReason | null } {
  const d = ev.data ?? {}
  const to = (Array.isArray(d.to) ? d.to : d.to ? [d.to] : []).map((e) => String(e).toLowerCase().trim()).filter(Boolean)
  switch (ev.type) {
    case 'contact.updated':
      return d.unsubscribed === true && d.email ? { emails: [String(d.email).toLowerCase().trim()], why: 'unsubscribed' } : { emails: [], why: null }
    case 'email.complained':
      return { emails: to, why: 'complained' }
    case 'email.bounced':
      return String(d.bounce?.type ?? '').toLowerCase() === 'permanent' ? { emails: to, why: 'bounced' } : { emails: [], why: null }
    case 'email.suppressed':
      return { emails: to, why: 'bounced' }
    default:
      return { emails: [], why: null }
  }
}
