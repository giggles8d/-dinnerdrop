/**
 * Referral credits: when a referred family's first Family payment lands
 * (subscription_status = 'active'), both families get +30 days of Family via
 * profiles.family_until. Runs from the daily cron.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, emailShell } from '@/lib/notify'

const DAYS = 30

function plus30(from: string | null): string {
  const base = from && new Date(from) > new Date() ? new Date(from) : new Date()
  base.setUTCDate(base.getUTCDate() + DAYS)
  return base.toISOString()
}

export async function creditReferrals(admin: SupabaseClient): Promise<{ credited: number; errors: string[] }> {
  const out = { credited: 0, errors: [] as string[] }
  const { data: pending } = await admin.from('referrals').select('id, referrer_id, referred_id').eq('status', 'pending')
  for (const r of pending ?? []) {
    try {
      const { data: referred } = await admin.from('profiles').select('id, email, full_name, subscription_status, family_until').eq('id', r.referred_id).single()
      if (!referred || referred.subscription_status !== 'active') continue
      const { data: referrer } = await admin.from('profiles').select('id, email, full_name, family_until, email_unsubscribed').eq('id', r.referrer_id).single()
      if (!referrer) { await admin.from('referrals').update({ status: 'void' }).eq('id', r.id); continue }

      await admin.from('profiles').update({ family_until: plus30(referrer.family_until) }).eq('id', referrer.id)
      await admin.from('profiles').update({ family_until: plus30(referred.family_until) }).eq('id', referred.id)
      await admin.from('referrals').update({ status: 'credited', credited_at: new Date().toISOString() }).eq('id', r.id)
      out.credited++

      const who = (referred.full_name || 'A family you invited').split(' ')[0]
      if (referrer.email && !referrer.email_unsubscribed) {
        await sendEmail(referrer.email, `${who} joined Family — a free month is on your account`, emailShell(
          'Thanks for spreading the word',
          `<p>${who} started the Family plan with your link, so you've both got a month of Family on us. It's applied automatically — nothing to do.</p>`,
          { label: 'See your account', href: 'https://www.dinnerdrop.app/account' }
        ))
      }
      if (referred.email) {
        await sendEmail(referred.email, `A free month of Family, from the family who invited you`, emailShell(
          'Welcome to Family',
          `<p>Because you joined through a friend's link, your first month of Family is free — already applied. Enjoy the cart pushes and family texting.</p>`,
          { label: 'Plan this week', href: 'https://www.dinnerdrop.app/dashboard' }
        ))
      }
    } catch (e) {
      out.errors.push(`${r.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return out
}
