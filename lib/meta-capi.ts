/**
 * Meta Conversions API (server-to-server) for DinnerDrop. (Nov 22 2026 review, Sarah approved)
 *
 * Why: every Meta event used to be browser-only, so ad blockers and in-app browsers dropped some of them, and
 * Meta never heard about trials or payments at all. This sends the same events from our server. Each one shares
 * its event_id (and event_name) with the browser pixel's fbq(..., { eventID }) call, so Meta counts it once.
 *
 * Env:
 *   META_CAPI_TOKEN      access token from Events Manager (dataset 2031808580404505 > Settings > Conversions API).
 *                        Missing: every send is skipped quietly (returns false, no log).
 *   META_PIXEL_ID        optional, defaults to the DinnerDrop pixel 2031808580404505.
 *   META_CAPI_TEST_CODE  optional; when set, events go to Events Manager > Test events. Remove after testing.
 *   META_GRAPH_VERSION   optional override, defaults to v26.0 (current Graph API version, released Jul 29 2026).
 *
 * Privacy: email and external_id are normalized and SHA-256 hashed before they leave the server. IP, user agent
 * and the _fbp/_fbc cookies are sent raw (Meta requires them unhashed). Nothing personal and never the token
 * is logged; failures log only the event name and Meta's error code.
 *
 * Server-only: imports node:crypto. Never import this from a client component.
 */
import { createHash } from 'node:crypto'
import { isProductionServer, isTestProfile } from '@/lib/tracking-env'

const DEFAULT_PIXEL_ID = '2031808580404505'
const DEFAULT_GRAPH_VERSION = 'v26.0'

export type MetaActionSource = 'website' | 'system_generated'

export interface MetaUser {
  email?: string | null
  /** Our Supabase user id. Hashed before sending. */
  externalId?: string | null
  ip?: string | null
  userAgent?: string | null
  fbp?: string | null
  fbc?: string | null
}

export interface MetaEvent {
  eventName: string
  /** Shared with the browser pixel's eventID for dedup. Same string, same case. */
  eventId: string
  /** Unix seconds. Defaults to now. Meta rejects anything older than 7 days. */
  eventTime?: number
  actionSource?: MetaActionSource
  /** Required by Meta when actionSource is 'website'. */
  eventSourceUrl?: string
  user: MetaUser
  customData?: Record<string, string | number | boolean | undefined>
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const norm = (s: string | null | undefined) => (typeof s === 'string' ? s.trim().toLowerCase() : '')

/**
 * True when events may go out: a token is configured AND this is the production deployment. Previews and local
 * dev never send to Meta, even with a token (Sarah, Nov 25 2026: a preview sign-up used to count as real).
 */
export function metaCapiEnabled(): boolean {
  return Boolean(process.env.META_CAPI_TOKEN) && isProductionServer()
}

/**
 * Send one event. Never throws. Resolves true when Meta accepted it, false when skipped or rejected.
 * Times out after 4 s so a slow Meta never holds up a Stripe webhook or an API route.
 */
export async function sendMetaEvent(ev: MetaEvent): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN
  if (!token || !isProductionServer()) return false
  if (isTestProfile({ email: ev.user.email })) return false // internal address; flagged profiles are checked by callers
  try {
    const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID
    const version = process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION
    const actionSource = ev.actionSource ?? 'website'

    const user_data: Record<string, string | string[]> = {}
    const email = norm(ev.user.email)
    if (email && email.includes('@')) user_data.em = [sha256(email)]
    const ext = norm(ev.user.externalId)
    if (ext) user_data.external_id = [sha256(ext)]
    if (ev.user.ip) user_data.client_ip_address = ev.user.ip
    if (ev.user.userAgent) user_data.client_user_agent = ev.user.userAgent.slice(0, 500)
    if (ev.user.fbp) user_data.fbp = ev.user.fbp
    if (ev.user.fbc) user_data.fbc = ev.user.fbc
    if (!Object.keys(user_data).length) return false // Meta rejects events with no identifier

    const custom_data = ev.customData
      ? Object.fromEntries(Object.entries(ev.customData).filter(([, v]) => v !== undefined && v !== ''))
      : undefined

    const event: Record<string, unknown> = {
      event_name: ev.eventName,
      event_time: ev.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: ev.eventId,
      action_source: actionSource,
      user_data,
      ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
      ...(custom_data && Object.keys(custom_data).length ? { custom_data } : {}),
    }
    const body: Record<string, unknown> = { data: [event] }
    if (process.env.META_CAPI_TEST_CODE) body.test_event_code = process.env.META_CAPI_TEST_CODE

    // Token goes in the query string as Meta documents; the URL is never logged.
    const url = `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    if (res.ok) return true
    let code = ''
    try { const j = await res.json(); code = String(j?.error?.code ?? '') + (j?.error?.error_subcode ? `/${j.error.error_subcode}` : '') } catch { /* ignore */ }
    console.warn(`[meta-capi] ${ev.eventName} rejected: HTTP ${res.status}${code ? ` code ${code}` : ''}`)
    return false
  } catch (err) {
    const name = err instanceof Error ? err.name : 'error'
    console.warn(`[meta-capi] ${ev.eventName} not sent: ${name}`)
    return false
  }
}

type HeaderSource = { get(name: string): string | null }
type CookieSource = { get(name: string): { value: string } | undefined }

/**
 * Pull the browser signals Meta matches on from an incoming request: client IP (Vercel sets x-forwarded-for),
 * user agent, and the pixel's first-party _fbp / _fbc cookies.
 */
export function browserContext(headers: HeaderSource, cookies: CookieSource): Pick<MetaUser, 'ip' | 'userAgent' | 'fbp' | 'fbc'> {
  const fwd = headers.get('x-forwarded-for')
  const ip = (fwd ? fwd.split(',')[0] : headers.get('x-real-ip') ?? '').trim() || null
  const cookie = (n: string) => {
    const v = cookies.get(n)?.value
    return v && /^fb\.\d\.\d+\.[\w.-]+$/.test(v) && v.length <= 300 ? v : null
  }
  return { ip, userAgent: headers.get('user-agent'), fbp: cookie('_fbp'), fbc: cookie('_fbc') }
}

/** Inside the iOS/Android app (Capacitor adds "DinnerDropApp" to the UA) ad tags never load; send nothing there either. */
export function isNativeAppUA(ua: string | null | undefined): boolean {
  return (ua ?? '').includes('DinnerDropApp')
}
