/**
 * New sign-up alerts (Sarah, Nov 7 2026): "notify me of every new sign up so I can make sure they get one on one
 * care". Each new account is texted to Sarah's phone about 20 minutes after it signs up (so the quiz answers and
 * first week are in): name, email, where they came from, family size, diet, store, and whether their first week
 * was built. Once per account (app_kv signup_alert:<id>). Sent any time of day (Sarah asked for no quiet hours).
 * Run from the 2-minute texting poll.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendSms, smsConfigured, normalizePhone } from '@/lib/notify'
import { mergeSettings } from '@/lib/settings'

const SARAH_EMAIL = 'setzl1979@gmail.com'
const SARAH_PHONE_FALLBACK = '+16072871236'

const SOURCE: Record<string, string> = { facebook: 'Facebook', fb: 'Facebook', ig: 'Instagram', instagram: 'Instagram', google: 'Google', tiktok: 'TikTok', reddit: 'Reddit', pinterest: 'Pinterest', email: 'email', youtube: 'YouTube' }

export async function sendSignupAlerts(admin: SupabaseClient, now = new Date()): Promise<{ sent: number }> {
  if (!smsConfigured()) return { sent: 0 }
  const from = new Date(now.getTime() - 14 * 3600000).toISOString()
  // 20 minutes: time to finish setup, and for lib/starter-week to build a week for anyone who left first.
  const until = new Date(now.getTime() - 20 * 60000).toISOString()
  const { data: profs } = await admin.from('profiles')
    .select('id, email, full_name, created_at, family_size, dietary_needs, weekly_budget, signup_source, settings')
    .gte('created_at', from).lte('created_at', until).order('created_at')
  const fresh = (profs ?? []).filter((p) => String(p.email ?? '').toLowerCase() !== SARAH_EMAIL)
  if (!fresh.length) return { sent: 0 }
  const { data: done } = await admin.from('app_kv').select('key').in('key', fresh.map((p) => `signup_alert:${p.id}`))
  const doneSet = new Set((done ?? []).map((d) => String(d.key)))
  const todo = fresh.filter((p) => !doneSet.has(`signup_alert:${p.id}`))
  if (!todo.length) return { sent: 0 }
  // Sarah, Nov 7 2026: text her no matter the time (no quiet hours).

  const ids = todo.map((p) => p.id as string)
  const [{ data: plans }, { data: carts }, { data: sarah }, { data: events }] = await Promise.all([
    admin.from('meal_plans').select('user_id').in('user_id', ids),
    admin.from('grocery_handoffs').select('user_id').in('user_id', ids),
    admin.from('profiles').select('settings').eq('email', SARAH_EMAIL).maybeSingle(),
    admin.from('activation_events').select('user_id, step, created_at').in('user_id', ids).neq('step', 'followup_sent'),
  ])
  // How far each one got (Sarah, Nov 9: "how far did they get").
  const stepsOf = new Map<string, { steps: Set<string>; last: number }>()
  for (const e of events ?? []) {
    const k = e.user_id as string
    const cur = stepsOf.get(k) ?? { steps: new Set<string>(), last: 0 }
    cur.steps.add(e.step as string); cur.last = Math.max(cur.last, new Date(e.created_at as string).getTime())
    stepsOf.set(k, cur)
  }
  const progress = (id: string): string => {
    if (hasCart.has(id)) return 'sent a cart ✓'
    const s = stepsOf.get(id)
    const st = s?.steps ?? new Set<string>()
    if (st.has('starter_week_built')) return st.has('dashboard_view') ? 'opened the app, left before setup · starter week built for them' : 'left right after signing up (never opened the app) · starter week built for them'
    if (hasPlan.has(id)) return st.has('grocery_list_view') ? 'week built, opened the list, no cart yet' : 'finished setup, week built, no cart yet'
    if (!st.size) return 'left right after signing up (never opened the app) · starter week coming'
    if (s && now.getTime() - s.last < 10 * 60000) return 'still in the app, in setup now'
    return 'opened the app, left before setup · starter week coming'
  }
  const hasPlan = new Set((plans ?? []).map((r) => r.user_id as string))
  const hasCart = new Set((carts ?? []).map((r) => r.user_id as string))
  const to = normalizePhone(mergeSettings(sarah?.settings).texting.ownerPhone) ?? SARAH_PHONE_FALLBACK

  // Claim first, so two polls can't both text the same sign-up.
  const claimed: typeof todo = []
  for (const p of todo) {
    const { error } = await admin.from('app_kv').insert({ key: `signup_alert:${p.id}`, value: { at: now.toISOString() }, updated_at: now.toISOString() })
    if (!error) claimed.push(p)
  }
  if (!claimed.length) return { sent: 0 }

  const line = (p: (typeof todo)[number]) => {
    const name = String(p.full_name ?? '').trim() || 'No name'
    const src = (p.signup_source as { s?: string; c?: string } | null) ?? {}
    const where = src.s ? (SOURCE[String(src.s).toLowerCase()] ?? src.s) + (src.c ? ` (${String(src.c).slice(0, 24)})` : '') : 'direct'
    const st = mergeSettings(p.settings).stores
    const store = st.usualStore || st.myStores?.[0]?.name || ''
    const diet = ((p.dietary_needs as string[] | null) ?? []).join(', ')
    const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date(p.created_at as string))
    const status = progress(p.id as string)
    return `${name} · ${p.email} · ${time} · from ${where}${p.family_size ? ` · family of ${p.family_size}` : ''}${diet ? ` · ${diet}` : ''}${store ? ` · ${store}` : ''} · ${status}`
  }

  let body: string
  if (claimed.length === 1) body = `DinnerDrop: new sign-up!\n${line(claimed[0])}`
  else if (claimed.length <= 4) body = `DinnerDrop: ${claimed.length} new sign-ups:\n${claimed.map((p, i) => `${i + 1}. ${line(p)}`).join('\n')}`
  else body = `DinnerDrop: ${claimed.length} new sign-ups. First 4:\n${claimed.slice(0, 4).map((p, i) => `${i + 1}. ${line(p)}`).join('\n')}\n+${claimed.length - 4} more: ${claimed.slice(4).map((p) => p.email).join(', ')}`
  const r = await sendSms(to, body.slice(0, 1500))
  await admin.from('sms_messages').insert({ household_id: null, member_id: null, direction: 'out', to_number: to, body: body.slice(0, 1500), intent: 'signup_alert', twilio_sid: r.sid ?? null })
  return { sent: r.ok ? claimed.length : 0 }
}
