import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PROMO_RE } from '@/lib/promo'

const ADMIN_EMAIL = 'setzl1979@gmail.com'

async function authorized(req: NextRequest): Promise<boolean> {
  const secret = req.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const tok = req.headers.get('x-image-token')
  if (tok) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
    if (data?.value && (data.value as { token?: string }).token === tok) return true
  }
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

/** GET — every code with redemption counts. POST { code, label?, family_days?, max_redemptions?, expires_at?, active? } — create or update. */
export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: codes } = await admin.from('promo_codes').select('*').order('created_at', { ascending: false })
  const { data: reds } = await admin.from('promo_redemptions').select('code, user_id, family_until, redeemed_at').order('redeemed_at', { ascending: false }).limit(200)
  return NextResponse.json({ codes: codes ?? [], recent: reds ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as Partial<{ code: string; label: string; family_days: number; max_redemptions: number | null; expires_at: string | null; active: boolean }>
  const code = String(b.code ?? '').trim().toUpperCase()
  if (!PROMO_RE.test(code)) return NextResponse.json({ error: 'code must be 3–20 letters/digits' }, { status: 400 })
  const row: Record<string, unknown> = { code }
  if (b.label != null) row.label = b.label
  if (b.family_days != null) row.family_days = Math.max(1, Math.min(730, Number(b.family_days)))
  if ('max_redemptions' in b) row.max_redemptions = b.max_redemptions
  if ('expires_at' in b) row.expires_at = b.expires_at
  if (b.active != null) row.active = b.active
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await admin.from('promo_codes').upsert(row, { onConflict: 'code' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, code: data })
}
