import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let body: { uid?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { uid } = body
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    await supabase
      .from('profiles')
      .update({ email_unsubscribed: true })
      .eq('id', uid)
  } catch (err) {
    // Log but don't fail — user intent is to unsubscribe, always confirm success
    console.error('[api/email/unsubscribe] DB update failed:', err)
  }

  return NextResponse.json({ success: true })
}
