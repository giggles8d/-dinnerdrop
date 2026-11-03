import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyFollowup } from '@/lib/followup'
import { receiptFeatureAllowed } from '@/lib/receipts'
import { readReceiptRequest, processReceipt } from '@/lib/receipt-upload'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST (same body as /api/receipts/upload, plus u + s) — receipt upload from the day-after email link, no sign-in. */
export async function POST(request: NextRequest) {
  const input = await readReceiptRequest(request)
  if (input instanceof NextResponse) return input
  const u = input.fields.u ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(u) || !verifyFollowup(u, 'receipt', input.fields.s ?? '')) {
    return NextResponse.json({ error: 'This link has expired. Sign in and open your grocery list to upload the receipt.' }, { status: 401 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: p } = await admin.from('profiles').select('email').eq('id', u).maybeSingle()
  if (!p?.email || !receiptFeatureAllowed(p.email)) return NextResponse.json({ error: 'Not available for this account.' }, { status: 403 })
  return processReceipt(u, p.email, input, 'email-link')
}
