import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST /api/account/delete  { confirm: "DELETE" }
 * In-app account deletion (App Store guideline 5.1.1(v)).
 * Cancels any Stripe subscription immediately, detaches references other rows keep
 * to this profile, then deletes the auth user — profiles and every user-owned table
 * cascade from auth.users.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { confirm?: string }
  if (body.confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()

  // Stop billing first so a deleted account can never be charged again.
  if (profile?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'all', limit: 20 })
      for (const s of subs.data) {
        if (!['canceled', 'incomplete_expired'].includes(s.status)) await stripe.subscriptions.cancel(s.id)
      }
    } catch (err) {
      console.error('account delete: stripe cancel failed', err)
      return NextResponse.json({ error: 'We couldn’t cancel your subscription automatically. Please email info@dinnerdrop.app and we’ll finish the deletion.' }, { status: 502 })
    }
  }

  // FKs without ON DELETE CASCADE that point at this profile.
  await admin.from('profiles').update({ referred_by: null }).eq('referred_by', user.id)
  await admin.from('household_invites').update({ accepted_by: null }).eq('accepted_by', user.id)

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('account delete: deleteUser failed', error)
    return NextResponse.json({ error: 'Something went wrong deleting your account. Please email info@dinnerdrop.app.' }, { status: 500 })
  }
  await supabase.auth.signOut().catch(() => {})
  return NextResponse.json({ ok: true })
}
