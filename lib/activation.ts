/**
 * First-visit funnel tracking (table: activation_events, migration 023).
 * Best-effort: never throws, never blocks the user.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const ACTIVATION_STEPS = [
  'dashboard_view',      // opened the dashboard (once per browser session)
  'first_plan_saved',    // first week saved for them (meta.source: library | ai)
  'first_plan_failed',
  'picked_to_list',      // confirmed their picks, sent to the list page (Nov 10 2026)
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
  fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
}
