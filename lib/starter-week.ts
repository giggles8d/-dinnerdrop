/**
 * Starter week (Sarah, Nov 9 2026): a family that signs up and leaves before the setup questions has no week, and
 * the next morning's email says "your grocery list is ready". About 20 minutes after sign-up, if they still have
 * no week and haven't done anything in the app for 10 minutes, build one from what they told us at sign-up
 * (family size, budget) — the same library week a finished setup gets (lib/first-plan).
 *
 * The plan is marked in app_kv `starter_week:<userId>`. If they come back and finish setup, buildFirstPlan replaces
 * the starter week with one built from their answers (unless they already changed it). Run from the 2-minute poll.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildFirstPlan } from '@/lib/first-plan'
import { trackStep } from '@/lib/activation'
import { attachLibraryImages } from '@/lib/library-images'
import { planReadyHtml } from '@/lib/plan-ready-email'
import { listUrl } from '@/lib/list-link'
import { sendEmail } from '@/lib/notify'
import { shopUrl, logFollowup } from '@/lib/followup'
import type { Meal } from '@/types'

const SARAH_EMAIL = 'setzl1979@gmail.com'
export const STARTER_AFTER_MIN = 20
const IDLE_MIN = 10

export async function buildStarterWeeks(admin: SupabaseClient, now = new Date(), max = 6): Promise<{ built: number; skipped: number }> {
  const from = new Date(now.getTime() - 3 * 86400000).toISOString()
  const until = new Date(now.getTime() - STARTER_AFTER_MIN * 60000).toISOString()
  const { data: profs } = await admin.from('profiles').select('id, email, household_id').gte('created_at', from).lte('created_at', until).order('created_at')
  const cands = (profs ?? []).filter((p) => String(p.email ?? '').toLowerCase() !== SARAH_EMAIL)
  if (!cands.length) return { built: 0, skipped: 0 }
  const ids = cands.map((p) => p.id as string)
  const [{ data: plans }, { data: tried }, { data: owned }] = await Promise.all([
    admin.from('meal_plans').select('user_id').in('user_id', ids),
    admin.from('app_kv').select('key').in('key', ids.map((id) => `starter_week:${id}`)),
    admin.from('households').select('id, owner_id').in('id', cands.map((p) => p.household_id).filter(Boolean) as string[]),
  ])
  const hasPlan = new Set((plans ?? []).map((r) => r.user_id as string))
  const done = new Set((tried ?? []).map((r) => String(r.key).slice('starter_week:'.length)))
  const ownerOf = new Map((owned ?? []).map((h) => [h.id as string, h.owner_id as string]))
  // Partners who joined someone else's household plan on the owner's week; never give them their own.
  const todo = cands.filter((p) => !hasPlan.has(p.id) && !done.has(p.id) && !(p.household_id && ownerOf.get(p.household_id) && ownerOf.get(p.household_id) !== p.id))
  let built = 0, skipped = 0
  for (const p of todo.slice(0, max)) {
    // Still in the app (maybe mid-setup)? Leave them; try again on a later poll.
    const { data: last } = await admin.from('activation_events').select('created_at').eq('user_id', p.id).neq('step', 'followup_sent').order('created_at', { ascending: false }).limit(1)
    if (last?.[0] && now.getTime() - new Date(last[0].created_at).getTime() < IDLE_MIN * 60000) { skipped++; continue }
    // Claim first so two polls can't both build.
    const { error: claimErr } = await admin.from('app_kv').insert({ key: `starter_week:${p.id}`, value: { at: now.toISOString(), status: 'building' }, updated_at: now.toISOString() })
    if (claimErr) { skipped++; continue }
    const r = await buildFirstPlan(admin, p.id).catch((e) => ({ ok: false as const, reason: String(e) }))
    if (!r.ok || r.existing) {
      await admin.from('app_kv').update({ value: { at: now.toISOString(), status: r.ok ? 'had a plan' : `failed: ${r.reason}` } }).eq('key', `starter_week:${p.id}`)
      skipped++; continue
    }
    const { data: plan } = await admin.from('meal_plans').select('id, meals, week_start').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1)
    const names = ((plan?.[0]?.meals as Array<{ name: string }> | undefined) ?? []).map((m) => m.name)
    await admin.from('app_kv').update({ value: { at: now.toISOString(), status: 'built', planId: plan?.[0]?.id ?? null, names } }).eq('key', `starter_week:${p.id}`)
    await trackStep(admin, p.id, 'starter_week_built', { count: r.meals.length })
    // They left before seeing a dinner: send the week right away, with photos and the one-tap cart
    // (Nov 21 2026 review — the first email used to come 12–36 hours later and never showed the dinners).
    await sendStarterEmail(admin, p.id, (plan?.[0]?.meals as Meal[] | undefined) ?? [], plan?.[0]?.week_start as string | undefined).catch((e) => console.error('[starter-week] email failed', e))
    built++
  }
  return { built, skipped }
}

/** If this family's only plan is an untouched starter week, remove it so finishing setup builds one from their answers. */
export async function dropStarterWeek(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data: kv } = await admin.from('app_kv').select('value').eq('key', `starter_week:${userId}`).maybeSingle()
  const v = kv?.value as { status?: string; planId?: string | null; names?: string[] } | null
  if (v?.status !== 'built' || !v.planId) return false
  const { data: plans } = await admin.from('meal_plans').select('id, meals').eq('user_id', userId)
  if ((plans ?? []).length !== 1 || plans![0].id !== v.planId) return false
  // Changed since we built it (swapped a dinner)? Then it's theirs now; keep it.
  const now = ((plans![0].meals as Array<{ name: string }>) ?? []).map((m) => m.name).join('|')
  if (now !== (v.names ?? []).join('|')) return false
  await admin.from('meal_plans').delete().eq('id', v.planId).eq('user_id', userId)
  await admin.from('app_kv').update({ value: { ...v, status: 'replaced by setup' } }).eq('key', `starter_week:${userId}`)
  return true
}

const APP = 'https://www.dinnerdrop.app'

async function sendStarterEmail(admin: SupabaseClient, userId: string, meals: Meal[], weekStart?: string): Promise<void> {
  if (!meals.length) return
  const { data: p } = await admin.from('profiles').select('email, full_name, email_unsubscribed').eq('id', userId).maybeSingle()
  if (!p?.email || p.email_unsubscribed) return
  const { count } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if ((count ?? 0) > 0) return
  const withPhotos = await attachLibraryImages(admin, meals)
  const first = (p.full_name || '').trim().split(' ')[0] || 'there'
  const subject = withPhotos.length > 1 ? `Your week: ${withPhotos[0].name} and ${withPhotos.length - 1} more` : 'Your dinners for the week are ready'
  const html = planReadyHtml({
    firstName: first,
    meals: withPhotos,
    weekLabel: weekStart ? new Date(`${weekStart}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'this week',
    note: 'We finished your week for you. Groceries for every dinner are on one list.',
    unsubscribeUrl: `${APP}/unsubscribe?uid=${userId}`,
    shopUrl: shopUrl(userId, 'starter'),
    listLink: listUrl(userId),
    why: 'You signed up for DinnerDrop today, so we planned your first week.',
  })
  await sendEmail(p.email, subject, html)
  await logFollowup(admin, userId, 'starter')
}
