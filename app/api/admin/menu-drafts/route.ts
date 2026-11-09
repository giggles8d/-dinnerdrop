import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runMenuDraftSweep, nextWeekStart } from '@/lib/menu-drafts'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const auth = request.headers.get('authorization')
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true
  const token = request.headers.get('x-image-token')
  if (!token || token.length < 32) return false
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  return (data?.value as { token?: string } | null)?.token === token
}

/** POST — build this weekend's menu drafts now (normally the Friday sweep does it) and apply pending edits. */
export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const r = await runMenuDraftSweep(admin, new Date(), 240000, 4)
  return NextResponse.json({ week: nextWeekStart(), ...r })
}
