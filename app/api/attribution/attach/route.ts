import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST — copy the visitor's dd_src cookie (set by middleware: utm / ad click / referring site) onto
 * their profile as signup_source. Only for accounts created in the last 7 days that have none yet,
 * so it records how a family found us, not later visits.
 */
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  const raw = req.cookies.get('dd_src')?.value
  if (!raw) return res
  let src: Record<string, string> | null = null
  try { src = JSON.parse(decodeURIComponent(raw)) } catch { /* ignore */ }
  if (!src || typeof src.s !== 'string') return res
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return res
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: me } = await admin.from('profiles').select('created_at, signup_source').eq('id', user.id).single()
  if (!me || me.signup_source || Date.now() - new Date(me.created_at).getTime() > 7 * 86400000) return res
  const clean = Object.fromEntries(Object.entries(src).filter(([k, v]) => ['s', 'm', 'c', 'ct', 'r', 'lp', 't'].includes(k) && typeof v === 'string').map(([k, v]) => [k, v.slice(0, 80)]))
  await admin.from('profiles').update({ signup_source: clean }).eq('id', user.id).is('signup_source', null)
  return res
}
