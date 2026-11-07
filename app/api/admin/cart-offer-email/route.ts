import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/notify'
import { cartOfferLive } from '@/lib/cart-offer'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * Weekend offer email (Sarah, Nov 7 2026): people who signed up in the last 30 days and never sent a cart.
 *  GET            → how many would get it + the email itself
 *  POST {send:true} → sends it, once per person (app_kv cart_offer_email:<id>)
 */
async function authorized(): Promise<boolean> {
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL
  } catch { return false }
}

const SUBJECT = 'This weekend: send your first cart, get 3 months free'
function emailHtml(): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1a1a1a;line-height:1.5">
<p style="font-weight:700;color:#2f6b4f;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 10px">DinnerDrop</p>
<h1 style="font-size:22px;margin:0 0 12px">Your dinners are planned. Send the cart by Sunday and get 3 months of Family free.</h1>
<p>You signed up for DinnerDrop but haven't sent your first grocery cart yet. This weekend only: send it by <b>Sunday night (Nov 8)</b> and we'll add <b>3 months of Family</b> to your account. No card.</p>
<p>Family is the full version: your family votes on dinner by text, your own family recipes go in the mix, and anyone can text a cooking question or add to the list.</p>
<p>It takes one tap: open your week, tap <b>Shop ingredients</b>, and your whole list lands in your Instacart, Walmart or Kroger cart.</p>
<p><a href="https://www.dinnerdrop.app/grocery-list?utm_source=email&utm_medium=offer&utm_campaign=cart3" style="display:inline-block;background:#2f6b4f;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Send my cart</a></p>
<p style="font-size:13px;color:#666">Offer ends Sunday, Nov 8 at 11:59 PM ET. For your first cart on DinnerDrop; one per account.</p>
</div>`
}
const TEXT = `You signed up for DinnerDrop but haven't sent your first grocery cart yet. Send it by Sunday night (Nov 8) and get 3 months of Family free, no card. Open your week and tap Shop ingredients: https://www.dinnerdrop.app/grocery-list`

async function recipients(admin: SupabaseClient) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: profs } = await admin.from('profiles').select('id, created_at, email_unsubscribed, subscription_status').gte('created_at', since)
  const ids = (profs ?? []).filter((p) => !p.email_unsubscribed && p.subscription_status !== 'active').map((p) => p.id as string)
  if (!ids.length) return []
  const { data: carts } = await admin.from('grocery_handoffs').select('user_id').in('user_id', ids)
  const sent = new Set((carts ?? []).map((c) => c.user_id as string))
  const out: { id: string; email: string }[] = []
  for (const id of ids.filter((x) => !sent.has(x))) {
    const { data } = await admin.auth.admin.getUserById(id)
    const email = data?.user?.email
    if (!email || /@camcomfginc\.com$/i.test(email) || email.toLowerCase() === ADMIN_EMAIL) continue
    out.push({ id, email })
  }
  return out
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const list = await recipients(admin)
  return NextResponse.json({ count: list.length, subject: SUBJECT, html: emailHtml() })
}

export async function POST(req: NextRequest) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!cartOfferLive()) return NextResponse.json({ error: 'The offer has ended.' }, { status: 400 })
  const b = await req.json().catch(() => ({})) as { send?: boolean; testTo?: string }
  if (b.testTo) {
    const r = await sendEmail(String(b.testTo), SUBJECT, emailHtml(), { text: TEXT })
    return NextResponse.json({ test: r.ok })
  }
  if (b.send !== true) return NextResponse.json({ error: 'Pass {send:true}' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  let sent = 0, skipped = 0
  for (const r of await recipients(admin)) {
    const key = `cart_offer_email:${r.id}`
    const { error } = await admin.from('app_kv').insert({ key, value: { at: new Date().toISOString() }, updated_at: new Date().toISOString() })
    if (error) { skipped++; continue }
    const res = await sendEmail(r.email, SUBJECT, emailHtml(), { text: TEXT })
    if (res.ok) sent++
    await new Promise((ok) => setTimeout(ok, 250))
  }
  return NextResponse.json({ sent, skipped })
}
