import { newEventId } from '@/lib/meta-events'
import { adsAllowedInBrowser } from '@/lib/tracking-env'

/**
 * Tell the ad platforms a family sent its grocery list to a store (Nov 21 2026 review). Until now Meta only heard
 * about sign-ups (components/ConversionTracker), so Advantage+ learned to find cheap sign-ups who never shop.
 *   Meta  → standard event AddToCart (pick it as the optimization event / a column in Ads Manager)
 *   Google → event "cart_sent" (import as a conversion in Ads > Goals if wanted)
 * Fires once per browser for the first send, plus every later send as a separate "repeat" Meta custom event.
 *
 * Any send counts, online or in store: an in-store list texted to the family calls this with store 'In store'
 * and is a first grocery send like any other (Sarah's decision 2, Nov 22 2026).
 *
 * Nov 22 2026 review (Sarah approved): each Meta event now carries an eventID and is relayed to
 * /api/meta/event, which sends the same event through the Conversions API, so blocked pixels still count and
 * Meta dedups the pair. The server decides "first" from grocery_handoffs, so callers must write the send's
 * grocery_handoffs row before calling this (Instacart and Walmart already do).
 */
type W = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void }

export function fireCartSent(store: string, value?: number): void {
  if (typeof window === 'undefined') return
  const w = window as W
  // Ad events only where the ad tags load: www.dinnerdrop.app, not the native app, not a dd_test=1 browser
  // (lib/tracking-env, Sarah Nov 25 2026). The server relay checks again, including test accounts.
  if (!adsAllowedInBrowser()) return
  let first = true
  try { first = !localStorage.getItem('dd_cart_conv'); localStorage.setItem('dd_cart_conv', String(Date.now())) } catch { /* storage blocked: treat as first */ }
  const v = Number(value) > 0 ? Math.round(Number(value)) : undefined
  const eventId = newEventId(first ? 'cart1' : 'cartr')
  try {
    if (typeof w.fbq === 'function') {
      if (first) w.fbq('track', 'AddToCart', { content_name: 'Grocery list sent', content_category: store, currency: 'USD', ...(v ? { value: v } : {}) }, { eventID: eventId })
      else w.fbq('trackCustom', 'CartSentRepeat', { store }, { eventID: eventId })
    }
  } catch { /* never block the send */ }
  try { if (typeof w.gtag === 'function') w.gtag('event', 'cart_sent', { store, first, ...(v ? { value: v, currency: 'USD' } : {}) }) } catch { /* ignore */ }
  // keepalive: the Instacart button may navigate this tab away right after calling us.
  try {
    fetch('/api/meta/event', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: first ? 'AddToCart' : 'CartSentRepeat', eventId, store, value: v, url: window.location.href }),
    }).catch(() => {})
  } catch { /* ignore */ }
}
