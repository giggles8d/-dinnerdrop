'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    pintrk?: (...args: unknown[]) => void
    rdt?: (...args: unknown[]) => void
    __ddConversionFired?: boolean
  }
}

/**
 * Fires signup-completion conversion events across all 4 ad platforms.
 *
 * Mount this on /dashboard when ?subscribed=true is present (Stripe success_url).
 * Idempotent — guards against double-fire on remount via window.__ddConversionFired.
 *
 * Each platform consumes the canonical "sign_up" / "CompleteRegistration" / "lead" /
 * "SignUp" event names. In each ad dashboard, configure the relevant conversion
 * action to listen for these event names:
 *
 *   - Google Ads     → gtag event "sign_up"            (configure in Ads > Goals)
 *   - Meta Ads       → fbq StandardEvent CompleteRegistration (auto-detected)
 *   - Pinterest Ads  → pintrk EventName "lead"         (auto-detected)
 *   - Reddit Ads     → rdt Track "SignUp"              (configure conversion to use)
 *
 * No PII is sent — just the event ping. Conversion value is set to $54 (the
 * lifetime equivalent of 6 months × $9/mo) so the platforms can optimize toward
 * higher-LTV signups.
 */
export default function ConversionTracker({ value = 54, currency = 'USD', onceKey }: { value?: number; currency?: string; onceKey?: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.__ddConversionFired) return
    // onceKey: fire at most once per browser (free signups land on /dashboard?new=1, which can be reloaded).
    if (onceKey) {
      try { if (localStorage.getItem(onceKey)) return } catch { /* storage blocked: fire anyway */ }
    }
    window.__ddConversionFired = true

    const safeFire = (fn: (() => void), label: string) => {
      try { fn(); return true } catch (err) {
        // Never let a tracking failure surface to the user
        console.warn(`[ConversionTracker] ${label} fire failed:`, err)
        return false
      }
    }

    // The ad tags load after the page (next/script), so on a fast dashboard render gtag/fbq can still be
    // undefined here. Retry each platform every 500 ms for up to 15 s and fire each one exactly once when it
    // appears; only mark the browser as done once something actually fired (2026-10-28: Google/Meta were
    // missing most signups because the old version gave up on the first try and still marked itself done).
    const fired = { google: false, meta: false, pinterest: false, reddit: false }
    const attempt = () => {
      if (!fired.google && typeof window.gtag === 'function') {
        // GA4 "sign_up" + the Sign-up conversion action (AW-18170234265/Rv_gCJLep7YcEJmLn9hD, Count=One).
        fired.google = safeFire(() => {
          window.gtag!('event', 'sign_up', { method: 'beta100', value, currency })
          window.gtag!('event', 'conversion', { send_to: 'AW-18170234265/Rv_gCJLep7YcEJmLn9hD', value, currency })
        }, 'Google Ads')
      }
      if (!fired.meta && typeof window.fbq === 'function') {
        fired.meta = safeFire(() => window.fbq!('track', 'CompleteRegistration', { value, currency, content_name: 'DinnerDrop Signup' }), 'Meta Pixel')
      }
      if (!fired.pinterest && typeof window.pintrk === 'function') {
        fired.pinterest = safeFire(() => window.pintrk!('track', 'lead', { value, currency, lead_type: 'signup' }), 'Pinterest Tag')
      }
      if (!fired.reddit && typeof window.rdt === 'function') {
        fired.reddit = safeFire(() => window.rdt!('track', 'SignUp', { value, currency }), 'Reddit Pixel')
      }
      if (onceKey && Object.values(fired).some(Boolean)) {
        try { localStorage.setItem(onceKey, String(Date.now())) } catch { /* ignore */ }
      }
      return fired.google && fired.meta
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
