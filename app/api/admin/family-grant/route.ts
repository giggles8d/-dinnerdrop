import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { grantFamilySixMonths, familyEmailHtml, familyEmailSubject } from '@/lib/family-grant'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * Family for everyone (one-shot, Oct 31 2026).
 *  GET  ?preview=1 → the email HTML as it will be sent.
 *  POST { apply: true, email: true } → grant 6 months of Family to every account without it, email each once.
 *  POST {} → dry run: counts + sample.
 * Auth: x-admin-secret = SETUP_SECRET, one-shot token in app_kv.family_grant_token (deleted on use), or Sarah logged in.
 */
async function authorized(req: NextRequest, admin: SupabaseClient): Promise<boolean> {
  const secret = req.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const once = req.headers.get('x-once-token')
  if (once) {
    const { data } = await admin.from('app_kv').select('value').eq('key', 'family_grant_token').maybeSingle()
    if (data?.value && (data.value as { token?: string }).token === once) {
      await admin.from('app_kv').delete().eq('key', 'family_grant_token')
      return true
    }
  }
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (!(await authorized(req, admin))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const until = new Date(); until.setMonth(until.getMonth() + 6)
  const html = familyEmailHtml({ id: 'preview', full_name: 'Sarah' }, until.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
  return new NextResponse(`<!-- subject: ${familyEmailSubject()} -->\n${html}`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (!(await authorized(req, admin))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { apply?: boolean; email?: boolean }
  const report = await grantFamilySixMonths(admin, { apply: !!body.apply, email: !!body.email })
  return NextResponse.json(report)
}
