/**
 * Where ad tracking may run, and which accounts are tests. (Sarah, Nov 25 2026: competitor review action 9)
 *
 * Why: the ad tags (Meta, Google Ads, Pinterest, Reddit) and the Meta Conversions API used to run on every host,
 * so a sign-up on a Vercel preview sent a real CompleteRegistration to Meta and counted in the daily numbers.
 * Now:
 *   - Browser tags load only on www.dinnerdrop.app, never in the native app, and never in a browser that has the
 *     dd_test=1 cookie. Any page opened with ?dd_test=1 sets that cookie for a year; ?dd_test=0 clears it.
 *   - Server Meta events go out only from the production deployment, and never for a test account. When the
 *     server sees a test account, it tells the browser to set dd_test=1 too.
 *   - A test account is a @dinnerdrop.app address or a profile whose settings has "isTest": true. Mark one with:
 *       update profiles set settings = settings || '{"isTest": true}' where id = '<user id>';
 *     (A settings key, not a new column, so no migration is needed.)
 *
 * Safe to import from client and server code: no Node APIs.
 */

export const PROD_HOST = 'www.dinnerdrop.app'
export const TEST_COOKIE = 'dd_test'

const INTERNAL_DOMAIN = /@dinnerdrop\.app$/i

/** True for a @dinnerdrop.app address or a profile flagged settings.isTest. */
export function isTestProfile(p: { email?: string | null; settings?: unknown } | null | undefined): boolean {
  if (!p) return false
  if (p.email && INTERNAL_DOMAIN.test(p.email.trim())) return true
  const s = p.settings as { isTest?: unknown } | null | undefined
  return s?.isTest === true
}

/** PostgREST `or` filter for test profiles, for server queries. Callers may append more conditions. */
export const TEST_PROFILE_FILTER = 'settings->>isTest.eq.true,email.ilike.%@dinnerdrop.app'

/** Server: true only on the production deployment (Vercel sets VERCEL_ENV; previews and local dev are not). */
export function isProductionServer(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

/**
 * Browser JS expression (for the inline tag scripts) that is true when ad tags may load on this page.
 * It applies ?dd_test=1 / ?dd_test=0 to the cookie first, so the page that sets it already loads no tags.
 */
export const ADS_ALLOWED_JS =
  `(function(){try{var q=/[?&]${TEST_COOKIE}=([01])(?:&|$)/.exec(location.search);` +
  `if(q){document.cookie='${TEST_COOKIE}='+(q[1]==='1'?'1; max-age=31536000':'; max-age=0')+'; path=/; SameSite=Lax; Secure';}` +
  `return location.hostname==='${PROD_HOST}'&&!/DinnerDropApp/.test(navigator.userAgent)&&!/(?:^|;\\s*)${TEST_COOKIE}=1(?:;|$)/.test(document.cookie);` +
  `}catch(e){return false}})()`

/** Browser: the same rule as ADS_ALLOWED_JS, for client code (ConversionTracker, fireCartSent). */
export function adsAllowedInBrowser(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.location.hostname !== PROD_HOST) return false
    if (/DinnerDropApp/.test(navigator.userAgent)) return false
    return !new RegExp(`(?:^|;\\s*)${TEST_COOKIE}=1(?:;|$)`).test(document.cookie)
  } catch {
    return false
  }
}

/** Browser: mark this browser as a test browser (no ad tags from the next page load on). */
export function markTestBrowser(): void {
  try { document.cookie = `${TEST_COOKIE}=1; max-age=31536000; path=/; SameSite=Lax; Secure` } catch { /* ignore */ }
}
