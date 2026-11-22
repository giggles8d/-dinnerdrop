import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { listRouteFor, sendListToShopper } from '@/lib/list-link'

export const dynamic = 'force-dynamic'

/**
 * "Text me this list" / "Email me this list" on the grocery list page (Nov 22 2026 review, Sarah approved).
 *   GET  → { channel: 'sms' | 'email' | null, hint } so the button can say which one it will do.
 *   POST { estTotal?, weekStart? } → texts or emails the no-sign-in list link (lib/list-link) and records the send
 *        in grocery_handoffs (store 'In store'), the same "first send" as an online cart.
 */
function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const r = await listRouteFor(admin(), user.id)
  return NextResponse.json({ channel: r.channel, hint: r.hint })
}

export async function POST(request: Request) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json().catch(() => ({})) as { estTotal?: unknown; weekStart?: unknown }
  const db = admin()
  const { ownerId } = await resolvePlanOwner(db, user.id)
  const r = await sendListToShopper(db, {
    userId: user.id,
    ownerId,
    estTotal: Number(b.estTotal) || null,
    weekStart: typeof b.weekStart === 'string' ? b.weekStart : null,
  })
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Could not send your list.' }, { status: 400 })
  return NextResponse.json(r)
}
