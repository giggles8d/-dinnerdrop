import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendWeekText } from '@/lib/texting-setup'

export const dynamic = 'force-dynamic'

/** POST — the family just confirmed the dinners they picked: text them their week (once), numbered as they see it. */
export async function POST() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const sent = await sendWeekText(admin, user.id).catch(() => false)
  return NextResponse.json({ ok: true, sent })
}
