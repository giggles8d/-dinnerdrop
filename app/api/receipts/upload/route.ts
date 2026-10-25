import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { parseReceiptImages, receiptFeatureAllowed, reconcileReceipt } from '@/lib/receipts'
import type { ClaudeImage } from '@/lib/claude'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_IMAGES = 12
const MAX_BYTES = 4 * 1024 * 1024
const TYPES: Record<string, ClaudeImage['mediaType']> = { 'image/jpeg': 'image/jpeg', 'image/jpg': 'image/jpeg', 'image/png': 'image/png', 'image/webp': 'image/webp', 'image/gif': 'image/gif' }

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

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Send the screenshots as form data' }, { status: 400 }) }
  const files = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_IMAGES)
  if (!files.length) return NextResponse.json({ error: 'Add at least one screenshot' }, { status: 400 })
  const images: ClaudeImage[] = []
  for (const f of files) {
    const mediaType = TYPES[f.type.toLowerCase()]
    if (!mediaType) return NextResponse.json({ error: `${f.name || 'That file'} isn’t an image (use PNG or JPG screenshots)` }, { status: 400 })
    if (f.size > MAX_BYTES) return NextResponse.json({ error: `${f.name || 'One screenshot'} is over 4 MB` }, { status: 400 })
    images.push({ base64: Buffer.from(await f.arrayBuffer()).toString('base64'), mediaType })
  }

  try {
    const parsed = await parseReceiptImages(images)
    if (!parsed.items.length) return NextResponse.json({ error: 'We couldn’t find any order items in those screenshots. Try the order’s receipt or “order details” screen.' }, { status: 422 })
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { ownerId } = await resolvePlanOwner(admin, user.id)
    const result = await reconcileReceipt(admin, ownerId, parsed, {
      emailId: `upload:${user.id}:${Date.now()}`, fromEmail: user.email ?? '', rawText: `[screenshot upload] ${files.length} image(s)\n${JSON.stringify(parsed)}`,
    })
    return NextResponse.json({ ok: true, store: parsed.store, service: parsed.service, total: parsed.total, items: parsed.items.length, bought: result.bought, replaced: result.replaced, refunded: result.refunded, missing: result.missing, restored: result.restored, matchedHandoff: !!result.handoffId })
  } catch (e) {
    console.error('[receipts/upload] failed:', e)
    return NextResponse.json({ error: 'We couldn’t read that receipt. Try a clearer screenshot.' }, { status: 500 })
  }
}
