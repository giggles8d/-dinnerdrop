import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { verifySvix, stopListFor, type ResendEvent } from '@/lib/resend-webhook'

/**
 * Resend → DinnerDrop webhook (Sarah, Nov 27 2026): every unsubscribe, spam complaint and hard bounce in Resend
 * updates the app right away, so the app's own emails stop too.
 *
 * Why: broadcasts sent from Resend (the Nov 27 holiday email was the first) carry Resend's own unsubscribe link,
 * and Resend had no way to tell the app. Someone who unsubscribed there kept getting the app's emails.
 *
 * Events (set on the Resend webhook):
 *   contact.updated  with unsubscribed: true  → profiles.email_unsubscribed = true, newsletter waitlist row removed
 *   email.complained (marked as spam)         → same
 *   email.bounced    Permanent, email.suppressed → same, plus settings.emailBounce { at, type }
 *   email.bounced    Temporary, anything else → no change
 * It never turns email back ON: a resubscribe in Resend does nothing here (the /unsubscribe page handles that).
 *
 * Security: Resend signs each delivery with Svix. The endpoint's signing secret is RESEND_WEBHOOK_SECRET if set,
 * otherwise app_kv 'resend_webhook_secret' { secret } (service-role only: RLS on, no policies; same place as the
 * pipeline token). Unsigned, wrongly signed or stale (over 5 minutes) requests get 401. No secret anywhere: 503.
 * Each changed profile gets an activation_events row (step 'resend_webhook', the reason, no address).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

let cachedSecret: { at: number; value: string } | null = null

async function webhookSecret(admin: SupabaseClient): Promise<string | null> {
  if (process.env.RESEND_WEBHOOK_SECRET) return process.env.RESEND_WEBHOOK_SECRET
  if (cachedSecret && Date.now() - cachedSecret.at < 5 * 60 * 1000) return cachedSecret.value
  const { data } = await admin.from('app_kv').select('value').eq('key', 'resend_webhook_secret').maybeSingle()
  const value = (data?.value as { secret?: string } | null)?.secret ?? null
  if (value) cachedSecret = { at: Date.now(), value }
  return value
}

export async function POST(request: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const secret = await webhookSecret(admin)
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  const body = await request.text()
  const ok = verifySvix(
    secret,
    request.headers.get('svix-id') ?? '',
    request.headers.get('svix-timestamp') ?? '',
    request.headers.get('svix-signature') ?? '',
    body,
  )
  if (!ok) return NextResponse.json({ error: 'Bad signature' }, { status: 401 })

  let ev: ResendEvent
  try { ev = JSON.parse(body) as ResendEvent } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const { emails, why } = stopListFor(ev)
  if (!why || emails.length === 0) return NextResponse.json({ ok: true, why: null, updated: 0 })

  let updated = 0
  for (const email of emails.slice(0, 50)) {
    if (!EMAIL_RE.test(email)) continue
    // Case-insensitive but exact: escape LIKE wildcards so "a_b@x.com" can't also match "axb@x.com".
    const exact = email.replace(/[\\%_]/g, (c) => '\\' + c)
    const { data: profs, error: readErr } = await admin.from('profiles').select('id, email, settings, email_unsubscribed').ilike('email', exact)
    // A failed read must make Resend retry, or the opt-out is lost.
    if (readErr) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    for (const p of profs ?? []) {
      if (String(p.email ?? '').toLowerCase().trim() !== email) continue
      const patch: Record<string, unknown> = { email_unsubscribed: true }
      if (why === 'bounced') {
        const settings = (p.settings && typeof p.settings === 'object' ? p.settings : {}) as Record<string, unknown>
        patch.settings = { ...settings, emailBounce: { at: new Date().toISOString(), type: ev.type === 'email.suppressed' ? 'suppressed' : 'permanent' } }
      }
      const { error } = await admin.from('profiles').update(patch).eq('id', p.id)
      if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      if (!p.email_unsubscribed) updated++
      try { await admin.from('activation_events').insert({ user_id: p.id, step: 'resend_webhook', meta: { type: ev.type ?? null, why } }) } catch { /* tracking only */ }
    }
    // Newsletter-only subscribers live in waitlist; the /unsubscribe route removes the row the same way.
    await admin.from('waitlist').delete().eq('email', email)
  }
  return NextResponse.json({ ok: true, why, updated })
}
