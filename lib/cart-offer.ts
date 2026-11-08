/**
 * Weekend offer (Sarah, Nov 7 2026): send your FIRST grocery cart (Instacart, Walmart or Kroger)
 * by Sunday Nov 8, 11:59 PM ET and get 3 months of Family free (profiles.family_until, no card).
 * Called right after a grocery_handoffs row is written. Once per account; paying members are skipped.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/notify'

export const CART_OFFER_ENDS = new Date('2026-11-09T05:00:00Z') // Sun Nov 8, 11:59 PM ET
export const CART_OFFER_DAYS = 90

export function cartOfferLive(now = new Date()): boolean {
  return now < CART_OFFER_ENDS
}

export async function grantCartOffer(userId: string | null | undefined): Promise<boolean> {
  if (!userId || !cartOfferLive()) return false
  try {
    const admin: SupabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const key = `cart_offer:${userId}`
    const { data: done } = await admin.from('app_kv').select('key').eq('key', key).maybeSingle()
    if (done) return false
    // First cart ever: the row just written is the only one.
    const { count } = await admin.from('grocery_handoffs').select('user_id', { count: 'exact', head: true }).eq('user_id', userId)
    if ((count ?? 0) > 1) return false
    const { data: prof } = await admin.from('profiles').select('subscription_status, family_until').eq('id', userId).maybeSingle()
    if (!prof || prof.subscription_status === 'active') return false
    // Claim it first so two carts sent at once can't both grant.
    const { error } = await admin.from('app_kv').insert({ key, value: { at: new Date().toISOString() }, updated_at: new Date().toISOString() })
    if (error) return false
    const base = prof.family_until && new Date(prof.family_until) > new Date() ? new Date(prof.family_until) : new Date()
    const until = new Date(base.getTime() + CART_OFFER_DAYS * 86400000).toISOString().slice(0, 10)
    await admin.from('profiles').update({ family_until: until }).eq('id', userId)
    await admin.from('app_kv').update({ value: { at: new Date().toISOString(), until } }).eq('key', key)
    const { data: u } = await admin.auth.admin.getUserById(userId)
    const email = u?.user?.email
    if (email && !/@camcomfginc\.com$/i.test(email)) {
      const date = new Date(until + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      await sendEmail(email, 'You got 3 months of DinnerDrop Family free',
        `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1a1a1a">
<p style="font-weight:700;color:#2f6b4f;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 10px">DinnerDrop</p>
<h1 style="font-size:22px;margin:0 0 12px">Your first cart is in. Here's 3 months of Family, on us.</h1>
<p>Thanks for sending your first grocery cart this weekend. Family is on for your account until <b>${date}</b>, no card needed: family votes by text, your own family recipes, the text-a-cook helper and one-tap carts.</p>
<p><a href="https://www.dinnerdrop.app/dashboard" style="display:inline-block;background:#2f6b4f;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Open DinnerDrop</a></p>
</div>`, { text: `Your first cart is in. Family is on for your account until ${date}, no card needed. https://www.dinnerdrop.app/dashboard` })
    }
    return true
  } catch (e) {
    console.error('[cart-offer] grant failed', e)
    return false
  }
}

/**
 * Last-day reminder (Sarah, Nov 7 2026): on Sunday Nov 8 the daily cron emails everyone who signed up in the
 * last 30 days and still hasn't sent a cart. Once per person; skipped once the offer ends.
 */
export async function sendCartOfferReminders(admin: SupabaseClient, now = new Date()): Promise<{ sent: number } | { skipped: string }> {
  const etDay = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (etDay !== '2026-11-08' || !cartOfferLive(now)) return { skipped: 'not the last day of the offer' }
  const since = new Date(now.getTime() - 30 * 86400000).toISOString()
  const { data: profs } = await admin.from('profiles').select('id, email_unsubscribed, subscription_status').gte('created_at', since)
  const ids = (profs ?? []).filter((p) => !p.email_unsubscribed && p.subscription_status !== 'active').map((p) => p.id as string)
  if (!ids.length) return { sent: 0 }
  const { data: carts } = await admin.from('grocery_handoffs').select('user_id').in('user_id', ids)
  const hasCart = new Set((carts ?? []).map((c) => c.user_id as string))
  let sent = 0
  for (const id of ids.filter((x) => !hasCart.has(x))) {
    const key = `cart_offer_reminder:${id}`
    const { error } = await admin.from('app_kv').insert({ key, value: { at: new Date().toISOString() }, updated_at: new Date().toISOString() })
    if (error) continue
    const { data } = await admin.auth.admin.getUserById(id)
    const email = data?.user?.email
    if (!email || /@camcomfginc\.com$/i.test(email) || email.toLowerCase() === 'setzl1979@gmail.com') continue
    const r = await sendEmail(email, 'Last day: send your cart tonight, get 3 months free',
      `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1a1a1a;line-height:1.5">
<p style="font-weight:700;color:#2f6b4f;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 10px">DinnerDrop</p>
<h1 style="font-size:22px;margin:0 0 12px">Your week is planned. Send the cart by tonight for 3 months free.</h1>
<p>Today's the last day: send your first grocery cart by <b>11:59 PM ET tonight</b> and we'll add <b>3 months of DinnerDrop Family</b> to your account. No card.</p>
<p>Open your week, tap <b>Shop ingredients</b>, and the whole list lands in your Instacart, Walmart or Kroger cart. You can review it before you check out.</p>
<p><a href="https://www.dinnerdrop.app/grocery-list?utm_source=email&utm_medium=offer&utm_campaign=cart3_reminder" style="display:inline-block;background:#2f6b4f;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Send my cart</a></p>
<p style="font-size:13px;color:#666">For your first cart on DinnerDrop; one per account.</p>
</div>`,
      { text: "Last day: send your first grocery cart by 11:59 PM ET tonight and get 3 months of DinnerDrop Family free, no card. https://www.dinnerdrop.app/grocery-list" })
    if (r.ok) sent++
    await new Promise((ok) => setTimeout(ok, 120))
  }
  return { sent }
}
