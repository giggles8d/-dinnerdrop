import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { browserContext, isNativeAppUA, metaCapiEnabled, sendMetaEvent } from '@/lib/meta-capi'
import { RELAY_EVENTS, isClientEventId, regEventId, type RelayEvent } from '@/lib/meta-events'

/**
 * POST — browser-to-server relay for Meta Conversions API. (Nov 22 2026 review, Sarah approved)
 *
 * The browser fires the pixel event with an eventID, then posts the same name and id here so Meta also gets
 * it from our server (ad blockers and in-app browsers drop some pixel events). Guards, so this can't be used
 * to inflate conversions:
 *   - signed-in users only; never from the native app (no ad tracking there);
 *   - only the event names in RELAY_EVENTS;
 *   - CompleteRegistration: accounts created in the last 3 days; the id is built here from the account id
 *     (reg_<uid>), so repeats are deduplicated by Meta;
 *   - AddToCart / CartSentRepeat: the user must have a grocery_handoffs row written in the last 15 minutes.
 *     AddToCart (first send) only when that is the user's only send; later sends are CartSentRepeat.
 * Body: { event, eventId?, url?, store?, value? }. Always answers 200 { ok, sent } except for bad input / auth.
 */
const SITE = /(^|\.)dinnerdrop\.app$/

export async function POST(req: NextRequest) {
  if (!metaCapiEnabled()) return NextResponse.json({ ok: true, sent: false })
  if (isNativeAppUA(req.headers.get('user-agent'))) return NextResponse.json({ ok: true, sent: false })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const event = body?.event as RelayEvent | undefined
  if (!event || !RELAY_EVENTS.includes(event)) return NextResponse.json({ error: 'bad event' }, { status: 400 })

  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // event_source_url: the page the event happened on, only if it is one of ours.
  let sourceUrl = `${req.nextUrl.origin}/dashboard`
  const rawUrl = typeof body?.url === 'string' ? body.url : req.headers.get('referer')
  if (rawUrl) {
    try {
      const u = new URL(rawUrl)
      if (SITE.test(u.hostname) || u.host === req.nextUrl.host) sourceUrl = `${u.origin}${u.pathname}`
    } catch { /* keep default */ }
  }

  const ctx = browserContext(req.headers, req.cookies)
  const userData = { email: user.email, externalId: user.id, ...ctx }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  if (event === 'CompleteRegistration') {
    const { data: me } = await admin.from('profiles').select('created_at').eq('id', user.id).maybeSingle()
    const createdAt = new Date(me?.created_at ?? user.created_at).getTime()
    if (!(Date.now() - createdAt < 3 * 86400000)) return NextResponse.json({ ok: true, sent: false })
    const sent = await sendMetaEvent({
      eventName: 'CompleteRegistration', eventId: regEventId(user.id), eventSourceUrl: sourceUrl, user: userData,
      customData: { value: 10, currency: 'USD', content_name: 'DinnerDrop Signup' },
    })
    return NextResponse.json({ ok: true, sent })
  }

  // Grocery send. The send's grocery_handoffs row is written before the browser calls fireCartSent; allow a
  // short wait in case a caller writes it in parallel.
  const clientId = isClientEventId(body?.eventId) ? body!.eventId as string : null
  if (!clientId) return NextResponse.json({ error: 'bad eventId' }, { status: 400 })
  const sends = async () => {
    const { data, count } = await admin.from('grocery_handoffs').select('created_at', { count: 'exact' })
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
    return { count: count ?? 0, newest: data?.[0]?.created_at ? new Date(data[0].created_at as string).getTime() : 0 }
  }
  let s = await sends()
  if (s.count === 0) { await new Promise((r) => setTimeout(r, 1500)); s = await sends() }
  if (s.count === 0 || Date.now() - s.newest > 15 * 60000) return NextResponse.json({ ok: true, sent: false })

  const store = typeof body?.store === 'string' ? body.store.slice(0, 60) : undefined
  const n = Number(body?.value)
  const value = Number.isFinite(n) && n > 0 && n < 2000 ? Math.round(n) : undefined
  const firstOnServer = s.count === 1

  if (firstOnServer) {
    // The family's first send ever. If the browser thought so too, reuse its id so Meta dedups the pair.
    const eventId = event === 'AddToCart' ? clientId : `cart1_${user.id}`
    const sent = await sendMetaEvent({
      eventName: 'AddToCart', eventId, eventSourceUrl: sourceUrl, user: userData,
      customData: { content_name: 'Grocery list sent', content_category: store, currency: 'USD', value },
    })
    return NextResponse.json({ ok: true, sent })
  }
  // A later send. If this browser fired AddToCart (new device or cleared storage), its event already stands
  // for this send, so don't add a second one.
  if (event === 'AddToCart') return NextResponse.json({ ok: true, sent: false })
  const sent = await sendMetaEvent({
    eventName: 'CartSentRepeat', eventId: clientId, eventSourceUrl: sourceUrl, user: userData,
    customData: { store, currency: value ? 'USD' : undefined, value },
  })
  return NextResponse.json({ ok: true, sent })
}
