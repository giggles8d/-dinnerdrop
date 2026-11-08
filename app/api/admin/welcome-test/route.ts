import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeTest } from '@/lib/welcome-email'

export const dynamic = 'force-dynamic'

/** Sends one test of the welcome email to Sarah's own inbox only. Auth: x-image-token. */
const ALLOWED = ['setzl1979@gmail.com', 'sarah@dinnerdrop.app']

export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const token = req.headers.get('x-image-token') ?? ''
  const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  if (token.length < 32 || (data?.value as { token?: string } | null)?.token !== token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { to?: string }
  const to = String(b.to ?? '').toLowerCase()
  if (!ALLOWED.includes(to)) return NextResponse.json({ error: 'Test sends go to Sarah only' }, { status: 400 })
  return NextResponse.json(await sendWelcomeTest(to))
}
