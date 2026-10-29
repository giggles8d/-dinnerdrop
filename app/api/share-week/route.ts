import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'

export const dynamic = 'force-dynamic'

/** POST → this family's share link for "our dinners this week" (created once, then reused). */
export async function POST() {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { ownerId } = await resolvePlanOwner(admin, user.id).catch(() => ({ ownerId: user.id }))
  const { data: have } = await admin.from('plan_shares').select('token').eq('user_id', ownerId).maybeSingle()
  let token = have?.token as string | undefined
  if (!token) {
    const abc = 'abcdefghjkmnpqrstuvwxyz23456789'
    token = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => abc[b % abc.length]).join('')
    const { error } = await admin.from('plan_shares').insert({ token, user_id: ownerId })
    if (error) {
      const { data: again } = await admin.from('plan_shares').select('token').eq('user_id', ownerId).maybeSingle()
      token = again?.token
    }
  }
  if (!token) return NextResponse.json({ error: 'Could not make a link' }, { status: 500 })
  return NextResponse.json({ url: `https://www.dinnerdrop.app/week/${token}` })
}
