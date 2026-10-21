/**
 * First-visit funnel tracking (table: activation_events, migration 023).
 * Best-effort: never throws, never blocks the user.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const ACTIVATION_STEPS = [
  'dashboard_view',      // opened the dashboard (once per browser session)
  'first_plan_saved',    // first week saved for them (meta.source: library | ai)
  'first_plan_failed',   // instant plan couldn't be built; fell back to AI generation
  'recipe_view',         // opened a recipe (once per session)
  'grocery_list_view',   // opened the grocery list (once per session)
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
export function trackOnce(step: ActivationStep): void {
  if (typeof window === 'undefined') return
  try {
    const key = `dd_track_${step}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // private mode etc. — still send
  }
  fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step }), keepalive: true }).catch(() => {})
}
