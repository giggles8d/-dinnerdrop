import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolvePlanOwner } from '@/lib/household'
import { parseReceipt, parseReceiptImages, reconcileReceipt, type ParsedReceipt } from '@/lib/receipts'
import type { ClaudeImage } from '@/lib/claude'

const MAX_IMAGES = 12
const MAX_BYTES = 4 * 1024 * 1024
const TYPES: Record<string, ClaudeImage['mediaType']> = { 'image/jpeg': 'image/jpeg', 'image/jpg': 'image/jpeg', 'image/png': 'image/png', 'image/webp': 'image/webp', 'image/gif': 'image/gif' }

export type ReceiptInput = { text: string; images: ClaudeImage[]; fields: Record<string, string> }

/** Read the request: JSON { text, ...fields } (pasted receipt) or multipart { images[], ...fields } (screenshots). */
export async function readReceiptRequest(request: Request): Promise<ReceiptInput | NextResponse> {
  const images: ClaudeImage[] = []
  const fields: Record<string, string> = {}
  let text = ''
  if ((request.headers.get('content-type') || '').includes('application/json')) {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    for (const [k, v] of Object.entries(body)) if (typeof v === 'string') fields[k] = v
    text = (fields.text ?? '').trim()
    if (text.length < 40) return NextResponse.json({ error: 'Paste the whole receipt (select all on the receipt page, copy, paste here)' }, { status: 400 })
  } else {
    let form: FormData
    try { form = await request.formData() } catch { return NextResponse.json({ error: 'Send the screenshots as form data' }, { status: 400 }) }
    form.forEach((v, k) => { if (typeof v === 'string') fields[k] = v })
    const files = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_IMAGES)
    if (!files.length) return NextResponse.json({ error: 'Add at least one screenshot' }, { status: 400 })
    for (const f of files) {
      const mediaType = TYPES[f.type.toLowerCase()]
      if (!mediaType) return NextResponse.json({ error: `${f.name || 'That file'} isn’t an image (use PNG or JPG screenshots)` }, { status: 400 })
      if (f.size > MAX_BYTES) return NextResponse.json({ error: `${f.name || 'One screenshot'} is over 4 MB` }, { status: 400 })
      images.push({ base64: Buffer.from(await f.arrayBuffer()).toString('base64'), mediaType })
    }
  }
  return { text, images, fields }
}

/** Parse and reconcile a receipt for this user (shared by the signed-in upload and the one-tap email link). */
export async function processReceipt(userId: string, email: string, input: ReceiptInput, source: 'upload' | 'email-link'): Promise<NextResponse> {
  const { text, images } = input
  try {
    const parsed: ParsedReceipt = text ? await parseReceipt(text.slice(0, 60000)) : await parseReceiptImages(images)
    if (!parsed.items.length) return NextResponse.json({ error: 'We couldn’t find any order items in that. Try the order’s receipt or “order details” screen, or paste the receipt text.' }, { status: 422 })
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { ownerId } = await resolvePlanOwner(admin, userId)
    const result = await reconcileReceipt(admin, ownerId, parsed, {
      emailId: `${source}:${userId}:${Date.now()}`, fromEmail: email, rawText: text ? text.slice(0, 20000) : `[screenshot upload] ${images.length} image(s)\n${JSON.stringify(parsed)}`,
    })
    try { await admin.from('activation_events').insert({ user_id: userId, step: 'receipt_upload', meta: { via: source, items: parsed.items.length } }) } catch { /* tracking only */ }
    return NextResponse.json({ ok: true, store: parsed.store, service: parsed.service, total: parsed.total, items: parsed.items.length, bought: result.bought, replaced: result.replaced, refunded: result.refunded, missing: result.missing, restored: result.restored, matchedHandoff: !!result.handoffId })
  } catch (e) {
    console.error(`[receipts/${source}] failed:`, e)
    return NextResponse.json({ error: 'We couldn’t read that receipt. Try a clearer screenshot.' }, { status: 500 })
  }
}
