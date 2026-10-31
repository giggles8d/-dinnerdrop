import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizePhone, smsConfigured } from '@/lib/notify'
import { sendOptIn, type MemberRow } from '@/lib/texting'
import { isFamilyProfile } from '@/lib/access'
import { mergeSettings } from '@/lib/settings'

/**
 * Family texting in one step from the dashboard card (no Settings trip):
 *  GET  → whether to show the card (has a plan, nobody has a phone yet, texting off)
 *  POST { ownerPhone?, members: [{ name, phone }] } → saves numbers, switches texting on,
 *        sends the opt-in texts (Family) or says a Family trial is needed (free).
 */
async function ctx() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
  if (!profile) return null
  return { user, admin, profile }
}

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ show: false })
  const { admin, profile } = c
  const settings = mergeSettings(profile.settings)
  const [{ count: plans }, { count: phones }] = await Promise.all([
    admin.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
    profile.household_id ? admin.from('household_members').select('id', { count: 'exact', head: true }).eq('household_id', profile.household_id).not('phone', 'is', null) : Promise.resolve({ count: 0 }),
  ])
  const show = (plans ?? 0) > 0 && (phones ?? 0) === 0 && !settings.texting.enabled && !settings.texting.ownerPhone
  return NextResponse.json({ show, family: isFamilyProfile(profile) })
}

export async function POST(request: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, admin, profile } = c
  const body = await request.json().catch(() => ({})) as { ownerPhone?: string; members?: Array<{ name?: string; phone?: string }> }
  const ownerPhone = normalizePhone(body.ownerPhone)
  const members = (body.members ?? []).map((m) => ({ name: String(m.name ?? '').trim().slice(0, 40), phone: normalizePhone(m.phone) })).filter((m) => m.phone)
  if (!ownerPhone && !members.length) return NextResponse.json({ error: 'Add at least one phone number' }, { status: 400 })

  // Household (everyone has one, but be safe).
  let householdId = profile.household_id as string | null
  if (!householdId) {
    const { data: h } = await admin.from('households').insert({ owner_id: user.id, name: `${(profile.full_name || 'Our').split(' ')[0]} family` }).select('id').single()
    householdId = h?.id ?? null
    if (householdId) await admin.from('profiles').update({ household_id: householdId }).eq('id', user.id)
  }
  if (!householdId) return NextResponse.json({ error: 'Could not set up the household' }, { status: 500 })

  // Members with phones (skip numbers already in the household).
  const { data: existing } = await admin.from('household_members').select('id, phone, name').eq('household_id', householdId)
  const known = new Set((existing ?? []).map((m) => m.phone).filter(Boolean))
  for (const m of members) {
    if (known.has(m.phone)) continue
    const sameName = (existing ?? []).find((e) => !e.phone && m.name && e.name?.toLowerCase() === m.name.toLowerCase())
    if (sameName) await admin.from('household_members').update({ phone: m.phone }).eq('id', sameName.id)
    else await admin.from('household_members').insert({ household_id: householdId, name: m.name || 'Family', role: 'adult', age_band: 'adult', phone: m.phone, can_vote: true, can_add: true })
    known.add(m.phone)
  }

  // Texting on + the planner's own number.
  const settings = mergeSettings(profile.settings)
  settings.texting.enabled = true
  if (ownerPhone) settings.texting.ownerPhone = ownerPhone
  await admin.from('profiles').update({ settings }).eq('id', user.id)

  if (!isFamilyProfile(profile)) return NextResponse.json({ ok: true, saved: members.length + (ownerPhone ? 1 : 0), familyRequired: true })
  if (!smsConfigured()) return NextResponse.json({ ok: true, saved: members.length + (ownerPhone ? 1 : 0), sent: 0, reason: 'sms_not_configured' })

  // Owner joins opted in (it's their own number); everyone else gets the YES opt-in text.
  if (ownerPhone) {
    const { data: mine } = await admin.from('household_members').select('id').eq('household_id', householdId).eq('profile_id', user.id).limit(1)
    if (mine?.[0]) await admin.from('household_members').update({ phone: ownerPhone, phone_opt_in_at: new Date().toISOString(), phone_opted_out: false }).eq('id', mine[0].id)
    else await admin.from('household_members').insert({ household_id: householdId, profile_id: user.id, name: (profile.full_name || 'Me').trim().split(' ')[0], role: 'adult', age_band: 'adult', phone: ownerPhone, phone_opt_in_at: new Date().toISOString(), can_vote: true, can_add: true })
  }
  const { data: all } = await admin.from('household_members').select('*').eq('household_id', householdId).not('phone', 'is', null)
  const first = (profile.full_name || '').trim().split(' ')[0]
  const family = first ? `${first.charAt(0).toUpperCase() + first.slice(1)}'s family` : 'Your family'
  let sent = 0
  for (const m of (all ?? []) as MemberRow[]) if (await sendOptIn(admin, m, family)) sent++
  return NextResponse.json({ ok: true, saved: members.length + (ownerPhone ? 1 : 0), sent })
}
