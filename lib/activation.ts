/**
 * First-visit funnel tracking (table: activation_events, migration 023).
 * Best-effort: never throws, never blocks the user.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const ACTIVATION_STEPS = [
  'dashboard_view',      // opened the dashboard (once per browser session)
  'first_plan_saved',    // first week saved for them (meta.source: library | ai)
  'first_plan_failed',
  'picked_to_list',      // sent to the list page after picks (Nov 10 2026); meta.source 'first_plan' = straight after the first week (Nov 25 2026)
  'pantry_check_used',   // kept pantry staples off the cart (components/PantryCheck, Nov 10 2026)
  'first_week_options',  // first week shown as 12–15 dinners to pick from (Nov 9 2026)   // instant plan couldn't be built; fell back to AI generation
  'starter_week_built',  // left before setup; we built a week from their sign-up answers (lib/starter-week)
  'recipe_view',         // opened a recipe (once per session)
  'grocery_list_view',   // opened the grocery list (once per session)
  'quick_setup_done',    // answered the 3 first-visit questions (size, budget, avoid)
  'quick_setup_skipped', // skipped them (planned for the default family of 4)
  // Engagement (Oct 31 2026): what happens on the screen between the milestones above — so we can tell
  // "saw the button and ignored it" from "never reached it" from "left before the plan rendered".
  'plan_seen',           // the week's dinners rendered on screen (meta.page)
  'scroll_25', 'scroll_50', 'scroll_75', 'scroll_100', // how far down the page they got (meta.page)
  'list_cta_seen',       // a "grocery list" / Instacart call-to-action entered the viewport (meta.id)
  'dwell_30s', 'dwell_60s', 'dwell_120s', // still on the page at that mark (meta.page)
  'page_hidden',         // app/tab backgrounded (meta.page, meta.t seconds on page, meta.scroll max %)
  'page_closed',         // page unloaded (meta.page, meta.t, meta.scroll, meta.hidden: was it backgrounded first)
  'cta_tap',             // tapped a tracked button (meta.id)
  'plan_error',          // plan generation failed in the browser (meta.message)
  'walkthrough_step',    // reached a first-visit setup screen (meta.id = screen number, 0-based; meta.pos = position shown, since the Nov 25 2026 reorder put screen 7 first) — shows where families quit (Nov 21 2026)
  'app_open',            // opened inside the native iPhone/Android app (meta.platform, meta.page), once per session (Nov 14 2026)
  'list_link_open',      // opened the no-sign-in /list link (app/list), not a send; deduped per 6 hours (Nov 22 2026, Sarah approved)
  'list_item_checked',   // ticked a line off on the /list page while shopping; once per 12 hours (Nov 22 2026)
  // Purchases (Sarah, Nov 26 2026, Black Friday sale tracking): nothing recorded these before.
  'subscribe_view',      // opened /subscribe signed in, once per browser session (meta.interval, meta.sale, meta.src)
  'checkout_start',      // a Stripe Checkout session was made, server side (meta.kind family | gift, interval/plan, sale, coupon)
  'checkout_done',       // a finished Family checkout, recorded when Stripe sends them back (app/api/stripe/checkout-done)
] as const
export type ActivationStep = (typeof ACTIVATION_STEPS)[number]

export async function trackStep(admin: SupabaseClient, userId: string, step: ActivationStep, meta: Record<string, unknown> = {}): Promise<void> {
  try {
    await admin.from('activation_events').insert({ user_id: userId, step, meta })
  } catch {
    // tracking must never break the product
  }
}

/** Client helper: record a step once per browser session. */
export function trackOnce(step: ActivationStep, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    const key = `dd_track_${step}${meta?.page ? `_${meta.page}` : ''}${meta?.id ? `_${meta.id}` : ''}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // private mode etc. — still send
  }
  track(step, meta)
}

/** Client helper: record a step every time (small meta only). Uses sendBeacon when the page is going away. */
export function track(step: ActivationStep, meta?: Record<string, unknown>, opts: { beacon?: boolean } = {}): void {
  if (typeof window === 'undefined') return
  const body = JSON.stringify({ step, meta: meta ?? {} })
  try {
    if (opts.beacon && navigator.sendBeacon) { navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' })); return }
  } catch { /* fall through */ }
  fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    .then((r) => { if (r.ok) flushPending() })
    .catch(() => {})
}

/**
 * Client helper for a step that happens before sign-up (e.g. the email typo fix on /signup, Nov 25 2026): /api/track
 * needs a signed-in user, so the event waits in this browser and goes out with the first event that succeeds after
 * sign-in.
 */
const PENDING_KEY = 'dd_track_pending'
export function trackAfterSignIn(step: ActivationStep, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const body = JSON.stringify({ step, meta: meta ?? {} })
  // Signed in already (e.g. a gift bought from the app): it goes out now. Not signed in (401): keep it for later.
  fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    .then((r) => {
      if (r.status !== 401) return
      try {
        const list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') as string[]
        list.push(body)
        localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-5)))
      } catch { /* private mode: drop it */ }
    })
    .catch(() => {})
}

function flushPending(): void {
  let list: string[] = []
  try {
    list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    if (!list.length) return
    localStorage.removeItem(PENDING_KEY)
  } catch { return }
  for (const body of list) {
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  }
}
