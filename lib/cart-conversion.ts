/**
 * Tell the ad platforms a family sent its grocery list to a store (Nov 21 2026 review). Until now Meta only heard
 * about sign-ups (components/ConversionTracker), so Advantage+ learned to find cheap sign-ups who never shop.
 *   Meta  → standard event AddToCart (pick it as the optimization event / a column in Ads Manager)
 *   Google → event "cart_sent" (import as a conversion in Ads > Goals if wanted)
 * Fires once per browser for the first send, plus every later send as a separate "repeat" Meta custom event.
 */
type W = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void }

export function fireCartSent(store: string, value?: number): void {
  if (typeof window === 'undefined') return
  const w = window as W
  let first = true
  try { first = !localStorage.getItem('dd_cart_conv'); localStorage.setItem('dd_cart_conv', String(Date.now())) } catch { /* storage blocked: treat as first */ }
  const v = Number(value) > 0 ? Math.round(Number(value)) : undefined
  try {
    if (typeof w.fbq === 'function') {
      if (first) w.fbq('track', 'AddToCart', { content_name: 'Grocery list sent', content_category: store, currency: 'USD', ...(v ? { value: v } : {}) })
      else w.fbq('trackCustom', 'CartSentRepeat', { store })
    }
  } catch { /* never block the send */ }
  try { if (typeof w.gtag === 'function') w.gtag('event', 'cart_sent', { store, first, ...(v ? { value: v, currency: 'USD' } : {}) }) } catch { /* ignore */ }
}
