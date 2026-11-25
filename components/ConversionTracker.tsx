'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { TRIAL_PREDICTED_VALUE, isCheckoutSessionId, regEventId, trialEventId } from '@/lib/meta-events'
import { adsAllowedInBrowser, markTestBrowser } from '@/lib/tracking-env'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    pintrk?: (...args: unknown[]) => void
    rdt?: (...args: unknown[]) => void
    __ddConversionFired?: boolean
    __ddTrialFired?: boolean
    __ddAttachSent?: boolean
  }
}

/**
 * Conversion events for the first page after an account is created, and for the return from Stripe checkout.
 * Mounted by /dashboard?new=1, /favorites?new=1, /subscribe?new=1 (with onceKey) and /dashboard?subscribed=true.
 *
 * Sign-up (new=1): Google "sign_up" + Ads conversion, Meta CompleteRegistration, Pinterest "lead",
 * Reddit "SignUp". Once per browser (onceKey). No PII is sent from the browser.
 *
 * Nov 22 2026 review (Sarah approved):
 *  - Trial (subscribed=true is detected here, whatever props the page passes): fires StartTrial instead of a
 *    second $54 CompleteRegistration, once per browser. Value = predicted value of one Family month ($4.99),
 *    since no money is charged at trial start. Google gets "start_trial" with no Ads conversion, so a trial is
 *    no longer counted as a second sign-up. Pinterest/Reddit get a custom StartTrial event.
 *  - Meta events carry an eventID shared with the server (lib/meta-capi): CompleteRegistration uses
 *    reg_<user id> and is relayed via /api/meta/event; StartTrial uses trial_<checkout session id>, which the
 *    Stripe webhook also sends. Meta counts each pair once.
 *  - Every first page also saves the sign-up source (POST /api/attribution/attach), not only the dashboard.
 */
export default function ConversionTracker({ value = 54, currency = 'USD', onceKey }: { value?: number; currency?: string; onceKey?: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (/DinnerDropApp/.test(navigator.userAgent)) return // no ad tracking inside the native app

    // Save how this family found us (dd_src cookie from middleware). Idempotent server-side; once per page load.
    if (!window.__ddAttachSent && document.cookie.includes('dd_src=')) {
      window.__ddAttachSent = true
      fetch('/api/attribution/attach', { method: 'POST' }).catch(() => {})
    }

    // Ad events only where the ad tags load: www.dinnerdrop.app, not a dd_test=1 browser (Sarah, Nov 25 2026).
    if (!adsAllowedInBrowser()) return

    const params = new URLSearchParams(window.location.search)
    const trial = params.get('subscribed') === 'true'
    // trial=0: the family's free days were already over, so checkout charged right away (no trial). That is a
    // purchase, not a trial: the Stripe webhook sends Purchase/Subscribe from invoice.paid, so fire nothing here
    // (Nov 22 2026 review: trial ends when free Family days end).
    if (trial && params.get('trial') === '0') return
    const key = trial ? 'dd_trial_conv' : onceKey
    if (trial ? window.__ddTrialFired : window.__ddConversionFired) return
    // Fire at most once per browser (these pages can be reloaded).
    if (key) {
      try { if (localStorage.getItem(key)) return } catch { /* storage blocked: fire anyway */ }
    }
    if (trial) window.__ddTrialFired = true
    else window.__ddConversionFired = true

    const safeFire = (fn: (() => void), label: string) => {
      try { fn(); return true } catch (err) {
        // Never let a tracking failure surface to the user
        console.warn(`[ConversionTracker] ${label} fire failed:`, err)
        return false
      }
    }

    let eventId: string | undefined
    const sid = params.get('session_id')
    if (trial && isCheckoutSessionId(sid)) eventId = trialEventId(sid)
    const ev = trial
      ? { amount: TRIAL_PREDICTED_VALUE, cur: 'USD' }
      : { amount: value, cur: currency }

    // Sign-up: the Meta event id is reg_<account id>, the same id /api/meta/event sends to the Conversions API.
    // getSession() reads the local session (no network). The relay runs even when the pixel is blocked.
    // The relay also answers { test: true } for a test account; then nothing fires and this browser is marked
    // dd_test=1, so later pages load no ad tags (Sarah, Nov 25 2026). Every platform waits for that answer.
    let idLookupDone = trial || !onceKey
    let isTest = false
    if (!idLookupDone) {
      createClient().auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id
        if (!uid) return
        eventId = regEventId(uid)
        return fetch('/api/meta/event', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'CompleteRegistration', url: window.location.href }),
        }).then((r) => r.json()).then((j: { test?: boolean }) => {
          if (j?.test) { isTest = true; markTestBrowser() }
        })
      }).catch(() => {}).finally(() => { idLookupDone = true })
    }

    // The ad tags load after the page (next/script), so on a fast dashboard render gtag/fbq can still be
    // undefined here. Retry each platform every 500 ms for up to 15 s and fire each one exactly once when it
    // appears; only mark the browser as done once something actually fired (2026-10-28: Google/Meta were
    // missing most signups because the old version gave up on the first try and still marked itself done).
    const fired = { google: false, meta: false, pinterest: false, reddit: false }
    const attempt = () => {
      if (!idLookupDone) return false
      if (isTest) return true // test account: fire nothing, stop retrying
      if (!fired.google && typeof window.gtag === 'function') {
        fired.google = safeFire(() => {
          if (trial) {
            // Not a sign-up: no Ads sign-up conversion. Import "start_trial" in Google Ads > Goals if wanted.
            window.gtag!('event', 'start_trial', { value: ev.amount, currency: ev.cur })
          } else {
            // GA4 "sign_up" + the Sign-up conversion action (AW-18170234265/Rv_gCJLep7YcEJmLn9hD, Count=One).
            window.gtag!('event', 'sign_up', { method: 'beta100', value: ev.amount, currency: ev.cur })
            window.gtag!('event', 'conversion', { send_to: 'AW-18170234265/Rv_gCJLep7YcEJmLn9hD', value: ev.amount, currency: ev.cur })
          }
        }, 'Google Ads')
      }
      // Meta waits for the event id when one is still being looked up (sign-up path).
      if (!fired.meta && typeof window.fbq === 'function' && idLookupDone) {
        fired.meta = safeFire(() => {
          const opts = eventId ? { eventID: eventId } : undefined
          if (trial) window.fbq!('track', 'StartTrial', { value: ev.amount, currency: ev.cur, predicted_ltv: ev.amount }, opts)
          else window.fbq!('track', 'CompleteRegistration', { value: ev.amount, currency: ev.cur, content_name: 'DinnerDrop Signup' }, opts)
        }, 'Meta Pixel')
      }
      if (!fired.pinterest && typeof window.pintrk === 'function') {
        fired.pinterest = safeFire(() => trial
          ? window.pintrk!('track', 'custom', { value: ev.amount, currency: ev.cur, event_name: 'start_trial' })
          : window.pintrk!('track', 'lead', { value: ev.amount, currency: ev.cur, lead_type: 'signup' }), 'Pinterest Tag')
      }
      if (!fired.reddit && typeof window.rdt === 'function') {
        fired.reddit = safeFire(() => trial
          ? window.rdt!('track', 'Custom', { customEventName: 'StartTrial', value: ev.amount, currency: ev.cur })
          : window.rdt!('track', 'SignUp', { value: ev.amount, currency: ev.cur }), 'Reddit Pixel')
      }
      if (key && Object.values(fired).some(Boolean)) {
        try { localStorage.setItem(key, String(Date.now())) } catch { /* ignore */ }
      }
      // Keep retrying (within the 15 s window below) until all four have fired: Pinterest and Reddit load lazily
      // since Nov 25 2026, often after Google and Meta.
      return fired.google && fired.meta && fired.pinterest && fired.reddit
    }

    if (attempt()) return
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      if (attempt() || tries >= 30) window.clearInterval(timer)
    }, 500)
    // No cleanup on purpose: the retry is window-level and must survive the dashboard re-rendering/unmounting.
  }, [value, currency, onceKey])

  return null
}
