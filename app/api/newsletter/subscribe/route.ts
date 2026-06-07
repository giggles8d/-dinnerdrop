import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Newsletter signup (blog footer form). Reuses the waitlist table with
// source='newsletter' — no schema change needed. The newsletter cron pulls
// waitlist emails alongside profiles.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim(), source: 'newsletter' })

    if (error && !error.message.includes('duplicate')) {
      console.error('[newsletter/subscribe] insert error:', error)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
