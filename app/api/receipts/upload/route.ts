import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { receiptFeatureAllowed } from '@/lib/receipts'
import { readReceiptRequest, processReceipt } from '@/lib/receipt-upload'

export const dynamic = 'force-dynamic'
export const maxDuration = 60


/** GET — is the receipt upload available to this user? (drives whether the card renders) */
export async function GET() {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  return NextResponse.json({ enabled: !!user && receiptFeatureAllowed(user.email) })
}

/**
 * POST multipart/form-data { images: File[] (1-12 screenshots of the order; the client downsizes them first) }
 * Parses the screenshots, reconciles with the list that went to the store, restores anything the
 * store didn't have to the active list, learns the real total, and returns a summary.
 */
export async function POST(request: NextRequest) {
  const sb = createServerSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!receiptFeatureAllowed(user.email)) return NextResponse.json({ error: 'Not available yet' }, { status: 403 })

  const input = await readReceiptRequest(request)
  if (input instanceof NextResponse) return input
  return processReceipt(user.id, user.email ?? '', input, 'upload')
}
