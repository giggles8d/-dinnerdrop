import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { startVoteCycle } from '@/lib/texting'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST — "Text my family now": auto-pick the week if needed, opt-in anyone new, send the menu. Owner only. */
export async function POST() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const report = await startVoteCycle(admin, user.id, { force: true })
    return NextResponse.json(report)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
