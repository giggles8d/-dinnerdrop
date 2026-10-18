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

  const { data: members } = await admin.from('household_members').select('*').eq('household_id', profile.household_id).not('phone', 'is', null)
  const family = `${(profile.full_name || '').trim().split(' ')[0] || 'Your family'}`
  let sent = 0
  for (const m of (members ?? []) as MemberRow[]) {
    const norm = normalizePhone(m.phone)
    if (!norm) continue
    if (norm !== m.phone) await admin.from('household_members').update({ phone: norm }).eq('id', m.id)
    if (await sendOptIn(admin, { ...m, phone: norm }, family)) sent++
  }
  return NextResponse.json({ sent })
}
