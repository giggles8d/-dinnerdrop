import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { familySavings } from '@/lib/savings'
import { resolvePlanOwner } from '@/lib/household'

export const dynamic = 'force-dynamic'

/** GET → this family's "saved vs takeout" numbers (household partners see the owner's). */
export async function GET() {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const owner = await resolvePlanOwner(admin, user.id).catch(() => ({ ownerId: user.id }))
  return NextResponse.json(await familySavings(admin, owner.ownerId))
}
