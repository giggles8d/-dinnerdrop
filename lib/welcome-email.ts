/**
 * Personal welcome email (Sarah, Nov 8 2026): goes out within a few minutes of every sign-up, written as a note
 * from Sarah, not a newsletter: thanks for joining, we're a small startup that cares about support, reply with
 * anything, and the few features worth trying first. Plain styling on purpose so it reads like a real email.
 * From "Sarah Etzl <sarah@dinnerdrop.app>", replies go to her inbox. Once per account (app_kv welcome:<id>).
 * Run from the 2-minute texting poll, next to the sign-up alerts.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { cartOfferLive } from '@/lib/cart-offer'

const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah Etzl <sarah@dinnerdrop.app>'
const SKIP = /@camcomfginc\.com$/i

function firstName(full: string | null | undefined): string {
  const f = String(full ?? '').trim().split(/\s+/)[0]
  if (f && /^[a-z][a-z'-]{1,20}$/i.test(f) && !f.includes('@')) return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()
  return ''
}

export function welcomeEmail(name: string, uid: string | null): { subject: string; html: string; text: string } {
  const hi = name ? `Hi ${name},` : 'Hi there,'
  const offer = cartOfferLive()
    ? 'One more thing: this weekend only, send your first grocery cart by Sunday night and we\'ll add 3 months of Family free. No card.'
    : ''
  const unsub = uid ? `${APP}/unsubscribe?uid=${uid}` : `${APP}/unsubscribe`
  const lines = [
    hi,
    `I'm Sarah, the founder of DinnerDrop, and I just wanted to say thank you for signing up. It really does mean a lot.`,
    `I'm a working mom of three, and I built DinnerDrop for my own family first. I know the everyday chore of figuring out dinner and getting the groceries, and I felt there had to be an easier way. I still use it every week to make my own life easier, so I'm always adding new time-savers. You'll see it keep getting better.`,
    `We're a small startup, and taking care of the families who use DinnerDrop is the thing we care about most. That means a real person (me) reads every reply to this email. If something is confusing, a dinner doesn't fit your family, or you have an idea or a complaint, just hit reply. I'd love to hear from you, and I'll write back.`,
    `A few things worth trying this week:`,
  ]
  const tips: Array<[string, string]> = [
    ['Add your family.', 'Tap "Add your family" on your dashboard and put in their phone numbers. DinnerDrop texts everyone the dinner ideas, they reply with the numbers they want (no app to download), and the winners become your week.'],
    ['Swap anything.', "Don't love a dinner? Tap it and swap it. Every dinner comes with a protein, a starch and a vegetable, and DinnerDrop learns what your family skips."],
    ['Send the list to your cart.', 'One tap puts the whole grocery list in your Instacart, Walmart or Kroger cart. You look it over and check out there.'],
    ['Text your questions.', 'Once your family is set up, anyone can text "ADD milk" to put it on the list, or ask a cooking question like "what can I use instead of sour cream?"'],
  ]
  const close = [
    offer,
    `Your first week is waiting here: ${APP}/dashboard`,
    'Thank you again for trusting us with dinner.',
  ].filter(Boolean)
  const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`
  const link = (t: string) => t.replace(`${APP}/dashboard`, `<a href="${APP}/dashboard?utm_source=email&utm_medium=welcome" style="color:#1a5c38">dinnerdrop.app/dashboard</a>`)
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px">
${lines.map(p).join('\n')}
<ul style="margin:0 0 14px;padding-left:20px">${tips.map(([b, t]) => `<li style="margin-bottom:8px"><b>${b}</b> ${t}</li>`).join('')}</ul>
${close.map((c) => p(link(c))).join('\n')}
<p style="margin:0">Sarah Etzl<br>Founder, DinnerDrop<br><a href="mailto:sarah@dinnerdrop.app" style="color:#1a5c38">sarah@dinnerdrop.app</a></p>
<p style="margin:28px 0 0;font-size:12px;color:#888">You're getting this because you just signed up at dinnerdrop.app. <a href="${unsub}" style="color:#888">Unsubscribe</a></p>
</div>`
  const text = [...lines.slice(0, -1), lines[lines.length - 1] + '\n' + tips.map(([b, t]) => `- ${b} ${t}`).join('\n'), ...close, 'Sarah Etzl\nFounder, DinnerDrop\nsarah@dinnerdrop.app', `Unsubscribe: ${unsub}`].join('\n\n')
  return { subject: name ? `Thank you for joining DinnerDrop, ${name}` : 'Thank you for joining DinnerDrop', html, text }
}

/** Welcome every account created in the last 3 hours that hasn't had one. */
export async function sendWelcomeEmails(admin: SupabaseClient, now = new Date()): Promise<{ sent: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0 }
  const { data: profs } = await admin.from('profiles').select('id, email, full_name, email_unsubscribed')
    .gte('created_at', new Date(now.getTime() - 3 * 3600000).toISOString()).limit(50)
  const todo = (profs ?? []).filter((p) => p.email && !p.email_unsubscribed && !SKIP.test(String(p.email)) && String(p.email).toLowerCase() !== 'setzl1979@gmail.com')
  if (!todo.length) return { sent: 0 }
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  for (const p of todo) {
    const { error: claimErr } = await admin.from('app_kv').insert({ key: `welcome:${p.id}`, value: { at: now.toISOString() }, updated_at: now.toISOString() })
    if (claimErr) continue   // already welcomed (or another poll has it)
    const m = welcomeEmail(firstName(p.full_name as string), p.id as string)
    const { error } = await resend.emails.send({
      from: FROM,
      to: String(p.email),
      subject: m.subject,
      html: m.html,
      text: m.text,
      reply_to: 'sarah@dinnerdrop.app',
      headers: { 'List-Unsubscribe': `<${APP}/api/email/unsubscribe?uid=${p.id}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    })
    if (error) {
      console.error('[welcome] send failed', p.id, error)
      await admin.from('app_kv').update({ value: { at: now.toISOString(), error: String((error as { message?: string }).message ?? error) } }).eq('key', `welcome:${p.id}`)
    } else sent++
  }
  return { sent }
}

/** One test send of the welcome email (admin route), same sender and headers as the real one. */
export async function sendWelcomeTest(to: string, name = 'Jen'): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY missing' }
  const m = welcomeEmail(name, null)
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM, to, subject: `[Test] ${m.subject}`, html: m.html, text: m.text, reply_to: 'sarah@dinnerdrop.app' })
  return error ? { ok: false, error: String((error as { message?: string }).message ?? error) } : { ok: true, id: data?.id }
}
