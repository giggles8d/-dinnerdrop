import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim(), source: 'beta_full' })

    if (error && !error.message.includes('duplicate')) {
      console.error('Waitlist insert error:', error)
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
    }

    // Notify Sarah if RESEND is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'DinnerDrop <info@dinnerdrop.app>',
          to: 'info@dinnerdrop.app',
          subject: `Waitlist signup: ${email}`,
          html: `<p>Someone joined the waitlist: <strong>${email}</strong></p><p>All 100 beta spots are claimed. This user will be notified when spots open.</p>`,
        })
      } catch (notifyErr) {
        console.error('Waitlist notify failed:', notifyErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
