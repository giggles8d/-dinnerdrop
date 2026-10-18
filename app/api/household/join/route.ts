import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/** POST { token } — move the signed-in user into the inviting household. */
export async function POST(req: NextRequest) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { token } = await req.json().catch(() => ({}))
  if (typeof token !== 'string' || !/^[a-f0-9]{16,64}$/i.test(token)) return NextResponse.json({ error: 'Bad invite' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: inv } = await admin.from('household_invites').select('id, household_id, accepted_at, created_at').eq('token', token).single()
  if (!inv) return NextResponse.json({ error: 'That invite link isn\'t valid.' }, { status: 404 })
  if (inv.accepted_at) return NextResponse.json({ error: 'That invite was already used. Ask for a new link.' }, { status: 410 })
  if (Date.now() - new Date(inv.created_at).getTime() > 30 * 86400000) return NextResponse.json({ error: 'That invite expired. Ask for a new link.' }, { status: 410 })

  const { data: h } = await admin.from('households').select('owner_id').eq('id', inv.household_id).single()
  if (h?.owner_id === user.id) return NextResponse.json({ ok: true, already: true })

  const { data: me } = await admin.from('profiles').select('full_name, email').eq('id', user.id).single()
  await admin.from('profiles').update({ household_id: inv.household_id }).eq('id', user.id)
  await admin.from('household_invites').update({ accepted_at: new Date().toISOString(), accepted_by: user.id, email: me?.email ?? null }).eq('id', inv.id)
  // Add them as an adult member if the owner hasn't already listed them by name.
  const name = (me?.full_name || me?.email || 'Partner').split(' ')[0]
  const { data: existing } = await admin.from('household_members').select('id').eq('household_id', inv.household_id).eq('profile_id', user.id).limit(1)
  if (!existing?.length) await admin.from('household_members').insert({ household_id: inv.household_id, profile_id: user.id, name, role: 'adult', age_band: 'adult' })
  return NextResponse.json({ ok: true })
}
