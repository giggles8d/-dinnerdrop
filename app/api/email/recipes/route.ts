import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendWeekRecipes } from '@/lib/recipe-email'

export const maxDuration = 60

/** POST — email the signed-in family this week's recipe cards (one PDF per dinner). Always resends. */
export async function POST() {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const r = await sendWeekRecipes(admin, user.id, { force: true })
  return NextResponse.json(r, { status: r.sent ? 200 : 400 })
}
