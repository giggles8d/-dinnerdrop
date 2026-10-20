/**
 * Outbound notifications: transactional email (Resend) and SMS (Twilio REST).
 * Both are no-ops that log when their env vars are missing, so crons never crash
 * on a half-configured environment.
 */
import { Resend } from 'resend'

const APP = 'https://www.dinnerdrop.app'

export function emailShell(title: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
  <div style="font-weight:700;color:#1a5c38;font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px">DinnerDrop</div>
  <div style="background:#fff;border-radius:14px;padding:24px;border:1px solid #e6e2d8">
    <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.55">${bodyHtml}</div>
    ${cta ? `<p style="margin:22px 0 4px"><a href="${cta.href}" style="display:inline-block;background:#1a5c38;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${cta.label}</a></p>` : ''}
  </div>
  <p style="font-size:11px;color:#8a8577;margin-top:16px;line-height:1.5">You're getting this because reminders are on in your DinnerDrop settings. <a href="${APP}/settings" style="color:#8a8577">Change reminders</a> · <a href="${APP}/unsubscribe" style="color:#8a8577">Unsubscribe</a></p>
</div></body></html>`
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[notify] RESEND_API_KEY missing — would email', to, subject)
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to,
    subject,
    html,
  })
  if (error) return { ok: false, error: typeof error === 'string' ? error : (error as { message?: string }).message ?? 'send failed' }
  return { ok: true, id: data?.id }
}

export function smsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER)
}

/** E.164 normalizer for US numbers typed by hand. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (raw.trim().startsWith('+') && digits.length >= 10) return `+${digits}`
  return null
}

export async function sendSms(to: string, body: string, mediaUrl?: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) {
    console.log('[notify] Twilio not configured — would text', to, body.slice(0, 60))
    return { ok: false, error: 'Twilio not configured' }
  }
  const params = new URLSearchParams({ To: to, From: from, Body: body })
  if (mediaUrl) params.append('MediaUrl', mediaUrl)
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const json = await res.json().catch(() => ({}))
  // A picture should never cost someone the text: if the MMS is refused, send it as plain SMS.
  if (!res.ok && mediaUrl) return sendSms(to, body)
  if (!res.ok) return { ok: false, error: json.message || `Twilio ${res.status}` }
  return { ok: true, sid: json.sid }
}
