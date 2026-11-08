import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Unsubscribe. Two callers:
 *  - the /unsubscribe page (JSON body { uid } or { email });
 *  - mail apps' one-click unsubscribe (RFC 8058): POST to the List-Unsubscribe URL
 *    `/api/email/unsubscribe?uid=…` with the form body `List-Unsubscribe=One-Click`.
 * Runs with the service role: people unsubscribe from their inbox, signed out (Nov 6 2026: the old
 * user-session client meant clicks from email never saved — 0 unsubscribes in 60 days).
 */
export async function POST(request: NextRequest) {
  const q = request.nextUrl.searchParams
  let uid = q.get('uid') ?? undefined
  let email = q.get('email') ?? undefined
  // The goodbye page (Nov 8 2026) also sends { reason, note } after unsubscribing, or { action: 'resubscribe' }.
  let action: 'unsubscribe' | 'reason' | 'resubscribe' = 'unsubscribe'
  let reason = '', note = ''
  if (!uid && !email) {
    try {
      const ct = request.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        const b = (await request.json()) as { uid?: string; email?: string; action?: string; reason?: string; note?: string }
        uid = b.uid; email = b.email
        if (b.action === 'reason' || b.action === 'resubscribe') action = b.action
        reason = String(b.reason ?? '').slice(0, 40)
        note = String(b.note ?? '').slice(0, 500)
      }
    } catch { /* fall through */ }
  }
  if (!uid && !email) return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 })
  if (uid && !/^[0-9a-f-]{36}$/i.test(uid)) return NextResponse.json({ error: 'Bad uid' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (action === 'reason') {
    const REASONS = ['too_many', 'not_useful', 'not_using', 'never_signed_up', 'other']
    if (!REASONS.includes(reason)) return NextResponse.json({ error: 'Bad reason' }, { status: 400 })
    try { await admin.from('activation_events').insert({ user_id: uid ?? null, step: 'email_unsubscribe_reason', meta: { reason, note: note || null, email: uid ? null : (email ?? null) } }) } catch { /* tracking only */ }
    return NextResponse.json({ success: true })
  }
  if (action === 'resubscribe') {
    // Only for accounts (a uid link); turns the emails back on after an accidental click.
    if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
    await admin.from('profiles').update({ email_unsubscribed: false }).eq('id', uid)
    try { await admin.from('activation_events').insert({ user_id: uid, step: 'email_resubscribe', meta: {} }) } catch { /* tracking only */ }
    return NextResponse.json({ success: true })
  }
  try {
    if (uid) {
      await admin.from('profiles').update({ email_unsubscribed: true }).eq('id', uid)
    } else if (email) {
      const e = email.toLowerCase().trim()
      // Newsletter-only subscribers live in waitlist: unsubscribing removes the row.
      await admin.from('waitlist').delete().eq('email', e)
      await admin.from('profiles').update({ email_unsubscribed: true }).eq('email', e)
    }
    try { await admin.from('activation_events').insert({ user_id: uid ?? null, step: 'email_unsubscribe', meta: { via: q.get('uid') ? 'one-click' : 'page' } }) } catch { /* tracking only */ }
  } catch (err) {
    // Log but don't fail — the person's intent is to unsubscribe; always confirm.
    console.error('[api/email/unsubscribe] DB update failed:', err)
  }
  return NextResponse.json({ success: true })
}
