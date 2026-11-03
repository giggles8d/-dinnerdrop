import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createInstacartLink } from '@/lib/instacart'
import { itemsForFamily, verifyFollowup } from '@/lib/followup'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const APP = 'https://www.dinnerdrop.app'

/**
 * GET /api/go/shop?u=<user id>&k=<follow-up kind>&s=<signature>
 * The one-tap button in follow-up emails: logs the tap, builds the family's Instacart shopping list and
 * redirects there — no sign-in needed (email apps open a browser that usually isn't signed in).
 * A bad or missing signature, or no list, falls back to the grocery list page.
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') ?? ''
  const k = (req.nextUrl.searchParams.get('k') ?? '').slice(0, 20)
  const s = req.nextUrl.searchParams.get('s') ?? ''
  const fallback = NextResponse.redirect(`${APP}/grocery-list?utm_source=email&utm_medium=lifecycle&utm_campaign=${encodeURIComponent(k || 'shop')}`, 302)
  if (!/^[0-9a-f-]{36}$/i.test(u) || !verifyFollowup(u, k, s)) return fallback

  // Email security scanners open links before the family does. The first hit returns a tiny page whose
  // script continues (scanners rarely run it); only the second hit logs the tap and builds the cart.
  if (req.nextUrl.searchParams.get('go') !== '1') {
    const next = `${req.nextUrl.pathname}?u=${encodeURIComponent(u)}&k=${encodeURIComponent(k)}&s=${encodeURIComponent(s)}&go=1`
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Opening your Instacart cart…</title>
<style>body{margin:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f6f4ef;color:#1f2a24;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center}a{display:inline-block;margin-top:16px;background:#1a5c38;color:#fff;font-weight:700;padding:14px 26px;border-radius:12px;text-decoration:none}</style></head>
<body><div><p style="font-weight:700;color:#1a5c38;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:0 0 10px">DinnerDrop</p><h1 style="font-size:22px;margin:0">Putting your groceries in Instacart…</h1><a href="${next}">Open my Instacart cart</a></div>
<script>setTimeout(function(){location.replace(${JSON.stringify(next)})},400)</script></body></html>`
    return new NextResponse(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try { await admin.from('activation_events').insert({ user_id: u, step: 'followup_click', meta: { kind: k } }) } catch { /* tracking only */ }

  try {
    const { items, weekStart, estTotal } = await itemsForFamily(admin, u)
    if (!items.length) return fallback
    const result = await createInstacartLink(items, 'DinnerDrop Weekly Groceries')
    if (!result.link || result.fallback) return fallback
    try {
      await admin.from('grocery_handoffs').insert({ user_id: u, store: 'Instacart', item_count: items.length, est_total: estTotal, week_start: weekStart })
      await admin.from('activation_events').insert({ user_id: u, step: 'followup_shop', meta: { kind: k, items: items.length } })
    } catch (e) { console.error('[go/shop] log failed', e) }
    return NextResponse.redirect(result.link, 302)
  } catch (e) {
    console.error('[go/shop] failed', e)
    return fallback
  }
}
