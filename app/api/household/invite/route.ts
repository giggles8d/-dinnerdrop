import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/** POST → { url } a fresh invite link for the caller's household. */
export async function POST() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
  if (!profile?.household_id) return NextResponse.json({ error: 'No household' }, { status: 400 })
  // Reuse an open invite from the last 30 days, else mint one.
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: open } = await supabase.from('household_invites').select('token').eq('household_id', profile.household_id).is('accepted_at', null).gte('created_at', since).limit(1)
  let token = open?.[0]?.token as string | undefined
  if (!token) {
    const { data, error } = await supabase.from('household_invites').insert({ household_id: profile.household_id }).select('token').single()
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not create invite' }, { status: 500 })
    token = data.token
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'
  return NextResponse.json({ url: `${base}/join/${token}` })
}
