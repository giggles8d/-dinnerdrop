import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 60

// Counts true beta-member redemptions from Supabase instead of asking Stripe
// for a coupon that may not exist. Returns the number of spots remaining
// out of the 100-family beta cap.
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_beta_member', true)

    const used = count ?? 0
    const spotsRemaining = Math.max(0, 100 - used)
    return NextResponse.json({ spotsRemaining })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error fetching beta spots:', message)
    // Fall back to "open" so the page still loads with a CTA.
    return NextResponse.json({ spotsRemaining: 100 }, { status: 200 })
  }
}
