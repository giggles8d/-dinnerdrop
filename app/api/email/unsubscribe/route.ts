import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let body: { uid?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { uid, email } = body
  if (!uid && !email) {
    return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    if (uid) {
      await supabase
        .from('profiles')
        .update({ email_unsubscribed: true })
        .eq('id', uid)
    } else if (email) {
      // Newsletter-only subscribers (waitlist table): unsubscribing = removing
      // the row. Needs service role — waitlist has RLS service-only access.
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await admin.from('waitlist').delete().eq('email', email.toLowerCase().trim())
      await admin.from('profiles').update({ email_unsubscribed: true }).eq('email', email.toLowerCase().trim())
    }
  } catch (err) {
    // Log but don't fail — user intent is to unsubscribe, always confirm success
    console.error('[api/email/unsubscribe] DB update failed:', err)
  }

  return NextResponse.json({ success: true })
}
