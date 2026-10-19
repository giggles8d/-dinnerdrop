import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
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

/** GET ?id=<resend email id> — delivery status straight from Resend (signed-in user only; for debugging deliverability). */
export async function GET(request: NextRequest) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const r = await resend.emails.get(id)
  return NextResponse.json(r)
}
