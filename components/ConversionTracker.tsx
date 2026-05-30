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
export default function ConversionTracker({ value = 54, currency = 'USD' }: { value?: number; currency?: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.__ddConversionFired) return
    window.__ddConversionFired = true

    const safeFire = (fn: (() => void), label: string) => {
      try { fn() } catch (err) {
        // Never let a tracking failure surface to the user
        console.warn(`[ConversionTracker] ${label} fire failed:`, err)
      }
    }

    // Google Ads — fire both GA4 standard "sign_up" event and a generic
    // Google Ads conversion ping against the configured tag (AW-18170234265).
    // Sarah maps the Sign-up conversion action to listen for "sign_up" in
    // Google Ads > Goals > Sign-up > "Use a Google tag event" panel.
    safeFire(() => {
      if (typeof window.gtag !== 'function') return
      window.gtag('event', 'sign_up', {
        method: 'beta100',
        value,
        currency,
      })
      // Also fire as a generic conversion in case the Sign-up action is set
      // to listen for "conversion" (account-default).
      window.gtag('event', 'conversion', {
        send_to: 'AW-18170234265',
        value,
        currency,
      })
    }, 'Google Ads')

    // Meta Pixel — CompleteRegistration is the canonical signup event.
    safeFire(() => {
      if (typeof window.fbq !== 'function') return
      window.fbq('track', 'CompleteRegistration', {
        value,
        currency,
        content_name: 'DinnerDrop Beta Signup',
      })
    }, 'Meta Pixel')

    // Pinterest Tag — "lead" is Pinterest's canonical signup/lead event.
    safeFire(() => {
      if (typeof window.pintrk !== 'function') return
      window.pintrk('track', 'lead', {
        value,
        currency,
        lead_type: 'beta_signup',
      })
    }, 'Pinterest Tag')

    // Reddit Pixel — placeholder. When Reddit Pixel is added to layout.tsx
    // this block will start firing. Currently a no-op (rdt undefined).
    safeFire(() => {
      if (typeof window.rdt !== 'function') return
      window.rdt('track', 'SignUp', {
        value,
        currency,
      })
    }, 'Reddit Pixel')
  }, [value, currency])

  return null
}
