import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { runAppLaunch } from '@/lib/app-launch-campaign'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * App Store launch email (lib/app-launch-campaign). POST { test?: email } sends one test copy; with no body it
 * sends the next chunk to members while app_kv `campaign_app_launch` is approved. Call again until left = 0.
 * Auth: x-image-token (app_kv recipe_image_token).
 */
async function authorized(req: NextRequest, admin: SupabaseClient): Promise<boolean> {
  const token = req.headers.get('x-image-token') ?? ''
  if (token.length < 32) return false
  const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  return (data?.value as { token?: string } | null)?.token === token
}

export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (!(await authorized(req, admin))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { test?: string }
  const test = typeof b.test === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.test) ? b.test : undefined
  return NextResponse.json(await runAppLaunch(admin, { testTo: test, budgetMs: 240000 }))
}
