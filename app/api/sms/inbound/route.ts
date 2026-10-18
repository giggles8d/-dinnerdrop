import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { handleInbound } from '@/lib/texting'

export const dynamic = 'force-dynamic'

/**
 * Twilio inbound webhook for the shared toll-free number.
 * Known DinnerDrop family member → handled here (votes, add-to-list, YES/STOP).
 * Anyone else → forwarded to the FamCEO app's webhook so that product keeps working
 * on the same number (FAMCEO_SMS_FORWARD_URL, default https://fam-ceo.com/api/sms/inbound).
 */
const FORWARD_URL = process.env.FAMCEO_SMS_FORWARD_URL || 'https://fam-ceo.com/api/sms/inbound'

function twiml(message: string): NextResponse {
  const esc = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${message ? `<Message>${esc}</Message>` : ''}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

/** Twilio request signature: HMAC-SHA1 of (url + sorted POST params) with the auth token. */
function validSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return true // not configured yet — don't block forwarding
  if (!signature) return false
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('')
  const expected = createHmac('sha1', token).update(data).digest('base64')
  return expected === signature
}

export async function POST(request: NextRequest) {
  const raw = await request.text()
  const params: Record<string, string> = {}
  new URLSearchParams(raw).forEach((v, k) => { params[k] = v })
  const from = params.From || ''
  const body = params.Body || ''
  const sid = params.MessageSid || null

  // Twilio signs the public URL it was configured with.
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'}/api/sms/inbound`
  const signature = request.headers.get('x-twilio-signature')
  if (!validSignature(publicUrl, params, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const result = await handleInbound(admin, from, body, sid)
    if (result.handled) return twiml(result.reply)
  } catch (e) {
    console.error('[sms/inbound] handler error', e)
  }

  // Not one of ours — hand the original request to FamCEO and relay its TwiML.
  try {
    const fwd = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(signature ? { 'X-Twilio-Signature': signature } : {}) },
      body: raw,
    })
    const text = await fwd.text()
    return new NextResponse(text, { status: fwd.ok ? 200 : 200, headers: { 'Content-Type': fwd.headers.get('content-type') || 'text/xml' } })
  } catch (e) {
    console.error('[sms/inbound] forward failed', e)
    return twiml('')
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'dinnerdrop-sms' })
}
