import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/** GET — everything we hold for the signed-in family, as one JSON download. */
export async function GET() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  const hid = profile?.household_id ?? null
  const [plans, favorites, pantry, lists, staples, members, votes, sms, handoffs] = await Promise.all([
    admin.from('meal_plans').select('*').eq('user_id', user.id).order('created_at'),
    admin.from('favorites').select('*').eq('user_id', user.id),
    admin.from('pantry_items').select('*').eq('user_id', user.id),
    admin.from('list_items').select('*').eq('user_id', user.id).order('created_at'),
    admin.from('staples').select('*').eq('user_id', user.id),
    hid ? admin.from('household_members').select('*').eq('household_id', hid) : Promise.resolve({ data: [] }),
    hid ? admin.from('meal_votes').select('*').eq('household_id', hid) : Promise.resolve({ data: [] }),
    hid ? admin.from('sms_messages').select('*').eq('household_id', hid) : Promise.resolve({ data: [] }),
    admin.from('grocery_handoffs').select('*').eq('user_id', user.id),
  ])

  const safeProfile = profile ? { ...profile } : null
  if (safeProfile) {
    for (const k of ['kroger_access_token', 'kroger_refresh_token', 'stripe_customer_id', 'stripe_subscription_id']) delete (safeProfile as Record<string, unknown>)[k]
  }
  const body = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: safeProfile,
    household: { members: members.data ?? [] },
    mealPlans: plans.data ?? [],
    favorites: favorites.data ?? [],
    pantry: pantry.data ?? [],
    groceryLists: lists.data ?? [],
    staples: staples.data ?? [],
    familyVotes: votes.data ?? [],
    textMessages: sms.data ?? [],
    cartHandoffs: handoffs.data ?? [],
  }
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="dinnerdrop-export-${new Date().toISOString().slice(0, 10)}.json"` },
  })
}
