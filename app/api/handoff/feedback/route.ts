import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FEEDBACK_ANSWERS, feedbackSigOk, type FeedbackAnswer } from '@/lib/order-followup'

export const dynamic = 'force-dynamic'

/** One-tap answer from the day-after-order email. Records it, then shows the matching next step. */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const h = p.get('h') ?? ''
  const a = (p.get('a') ?? '') as FeedbackAnswer
  const s = p.get('s') ?? ''
  const base = request.nextUrl.origin
  if (!/^[0-9a-f-]{36}$/.test(h) || !FEEDBACK_ANSWERS.includes(a) || !feedbackSigOk(h, s)) {
    return NextResponse.redirect(`${base}/order-feedback`)
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await admin.from('grocery_handoffs').update({ feedback: a, feedback_at: new Date().toISOString() }).eq('id', h)
  return NextResponse.redirect(`${base}/order-feedback?a=${a}`)
}
