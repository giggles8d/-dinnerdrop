/**
 * Shared event ids and values for Meta events sent from both the browser pixel and the server
 * (lib/meta-capi). (Nov 22 2026 review, Sarah approved)
 *
 * Meta counts a browser event and a server event once when both carry the same event_name and event_id,
 * so both sides build ids with these helpers. Client-safe: no server imports here.
 */

/** StartTrial value: the predicted value of one Family month ($4.99). No money is charged at trial start. */
export const TRIAL_PREDICTED_VALUE = 4.99

/** CompleteRegistration: one per account, so the id is the account id. */
export const regEventId = (userId: string) => `reg_${userId}`

/** StartTrial: one per Stripe Checkout session. The success_url carries the session id to the browser. */
export const trialEventId = (checkoutSessionId: string) => `trial_${checkoutSessionId}`

/** Stripe Checkout session ids look like cs_live_... / cs_test_... */
export const isCheckoutSessionId = (s: string | null | undefined): s is string => !!s && /^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(s)

/** Event names the browser may ask the server to relay (app/api/meta/event). */
export const RELAY_EVENTS = ['CompleteRegistration', 'AddToCart', 'CartSentRepeat'] as const
export type RelayEvent = (typeof RELAY_EVENTS)[number]

/** Ids the browser makes up for one grocery send. Letters, digits, _ and - only. */
export function newEventId(prefix: string): string {
  let r = ''
  try { r = crypto.randomUUID().replace(/-/g, '') } catch { /* old browsers */ }
  if (!r) r = Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}_${r}`
}

export const isClientEventId = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{8,120}$/.test(s)
