import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Has this family gone quiet? (Sarah approved Nov 22 2026, from the week-two cart check.)
 *
 * The old "active" test looked at the newest meal plan, but the Saturday auto-plan makes a new plan every week, so no
 * family ever looked inactive and plan emails never stopped (112 never-sent families were emailed in one week).
 * Quiet = signed up more than 14 days ago AND, in the last 14 days (two missed weeks): no cart or texted list, no visit
 * to the app or the no-sign-in list, and no text from anyone in the household.
 * Quiet families get no auto-plan, no plan-ready email, no shop-day nudge, and the Sunday Drop only every 4 weeks.
 */
export const QUIET_DAYS = 14
const DAY = 86400000
const ACTIVE_STEPS = ['dashboard_view', 'grocery_list_view', 'plan_seen', 'recipe_view', 'app_open', 'list_link_open', 'list_item_checked', 'followup_click', 'followup_shop', 'cta_tap']

export async function isQuiet(admin: SupabaseClient, p: { id: string; created_at?: string | null; household_id?: string | null }, now: Date = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - QUIET_DAYS * DAY).toISOString()
  if (!p.created_at || p.created_at > since) return false
  const [{ count: sent }, { count: seen }, texted] = await Promise.all([
    admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id).gte('created_at', since),
    admin.from('activation_events').select('id', { count: 'exact', head: true }).eq('user_id', p.id).in('step', ACTIVE_STEPS).gte('created_at', since),
    p.household_id
      ? admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('household_id', p.household_id).eq('direction', 'in').gte('created_at', since)
      : Promise.resolve({ count: 0 }),
  ])
  return !sent && !seen && !texted.count
}
