import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isTestProfile } from '@/lib/tracking-env'
import { SUMMARY_TEST_KEY, summaryGroup } from '@/lib/summary-test'

export const dynamic = 'force-dynamic'

/** GET → { group: 'summary_a' | 'summary_b' | null } for the signed-in family (lib/summary-test; off by default). */
export async function GET() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ group: null })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const [{ data: kv }, { data: profile }] = await Promise.all([
    admin.from('app_kv').select('value').eq('key', SUMMARY_TEST_KEY).maybeSingle(),
    admin.from('profiles').select('created_at, email, settings').eq('id', user.id).maybeSingle(),
  ])
  if (!kv) return NextResponse.json({ group: null })
  const group = summaryGroup({ value: kv.value, userId: user.id, createdAt: profile?.created_at as string | null, isTest: isTestProfile(profile as { email?: string; settings?: unknown } | null) })
  return NextResponse.json({ group })
}
