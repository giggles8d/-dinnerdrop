import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizePhone, smsConfigured } from '@/lib/notify'
import { sendOptIn, type MemberRow } from '@/lib/texting'
import { isFamilyProfile } from '@/lib/access'

/**
 * POST — normalizes every member phone in the caller's household and sends the
 * opt-in text to anyone who hasn't joined yet. Called after Settings save when
 * texting is on.
 */
export async function POST() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('household_id, full_name, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
  if (!profile?.household_id) return NextResponse.json({ sent: 0 })
  if (!isFamilyProfile(profile)) return NextResponse.json({ sent: 0, reason: 'family_required' })
  if (!smsConfigured()) return NextResponse.json({ sent: 0, reason: 'sms_not_configured' })

  // The planner's own number (Settings → Family texting → Your number) joins the household automatically, opted in.
  const { data: me } = await admin.from('profiles').select('settings, full_name').eq('id', user.id).single()
  const ownerPhone = normalizePhone((me?.settings as { texting?: { ownerPhone?: string } } | null)?.texting?.ownerPhone)
  if (ownerPhone) {
    const { data: existingOwner } = await admin.from('household_members').select('id, phone').eq('household_id', profile.household_id).eq('profile_id', user.id).limit(1)
    if (existingOwner?.[0]) {
      if (existingOwner[0].phone !== ownerPhone) await admin.from('household_members').update({ phone: ownerPhone, phone_opt_in_at: new Date().toISOString(), phone_opted_out: false }).eq('id', existingOwner[0].id)
    } else {
      const { data: byPhone } = await admin.from('household_members').select('id').eq('household_id', profile.household_id).eq('phone', ownerPhone).limit(1)
      if (byPhone?.[0]) await admin.from('household_members').update({ profile_id: user.id, phone_opt_in_at: new Date().toISOString(), phone_opted_out: false }).eq('id', byPhone[0].id)
      else await admin.from('household_members').insert({ household_id: profile.household_id, profile_id: user.id, name: (me?.full_name || 'Me').trim().split(' ')[0].replace(/^./, (c) => c.toUpperCase()), role: 'adult', age_band: 'adult', phone: ownerPhone, phone_opt_in_at: new Date().toISOString(), can_vote: true, can_add: true })
    }
  }

  const { data: members } = await admin.from('household_members').select('*').eq('household_id', profile.household_id).not('phone', 'is', null)
  const first = (profile.full_name || '').trim().split(' ')[0]
  const family = first ? `${first.charAt(0).toUpperCase() + first.slice(1)}'s family` : 'Your family'
  let sent = 0
  for (const m of (members ?? []) as MemberRow[]) {
    const norm = normalizePhone(m.phone)
    if (!norm) continue
    if (norm !== m.phone) await admin.from('household_members').update({ phone: norm }).eq('id', m.id)
    if (await sendOptIn(admin, { ...m, phone: norm }, family)) sent++
  }
  return NextResponse.json({ sent })
}
