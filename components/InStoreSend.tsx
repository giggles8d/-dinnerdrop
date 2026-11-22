'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Mail, Check } from 'lucide-react'
import { track } from '@/lib/activation'
import { fireCartSent } from '@/lib/cart-conversion'
import { tapHaptic } from '@/lib/native'

/**
 * "Text me this list" / "Email me this list" (Nov 22 2026 review, Sarah approved). The send for families who shop
 * in the store: a text when they have a verified number with texting on, else an email, with a link that opens the
 * list on their phone with no sign-in (/list). The server records it as a send (grocery_handoffs 'In store').
 *   variant 'primary'   → the main action on the list for in-store families
 *   variant 'secondary' → a quiet text button under the Instacart button for everyone else
 *   variant 'compact'   → the pinned bottom bar
 */
type Route = { channel: 'sms' | 'email' | null; hint: string }
let routeCache: Promise<Route> | null = null
function loadRoute(): Promise<Route> {
  if (!routeCache) routeCache = fetch('/api/send-list', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { channel: null, hint: '' })).catch(() => ({ channel: null, hint: '' }))
  return routeCache
}

export default function InStoreSend({ estTotal, weekStart, onSent, variant = 'primary' }: { estTotal?: number; weekStart?: string; onSent?: () => void; variant?: 'primary' | 'secondary' | 'compact' }) {
  const [route, setRoute] = useState<Route | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { let on = true; loadRoute().then((r) => { if (on) setRoute(r) }); return () => { on = false } }, [])

  if (!route?.channel) return null
  const sms = route.channel === 'sms'
  const label = sms ? 'Text me this list' : 'Email me this list'
  const Icon = sms ? MessageSquare : Mail

  async function send() {
    if (state === 'sending') return
    tapHaptic()
    setState('sending')
    setError(null)
    track('cta_tap', { id: `instore_send_${variant}`, channel: route?.channel })
    try {
      const r = await fetch('/api/send-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estTotal, weekStart }) })
      const j = await r.json().catch(() => ({})) as { error?: string; duplicate?: boolean }
      if (!r.ok) { setState('error'); setError(j.error ?? 'That didn’t go through. Try again.'); return }
      setState('sent')
      if (!j.duplicate) fireCartSent('In store', estTotal)
      onSent?.()
    } catch {
      setState('error')
      setError('That didn’t go through. Check your connection and try again.')
    }
  }

  const sentText = sms ? `Sent. Check your texts (${route.hint}).` : `Sent to ${route.hint}.`
  const press = 'touch-manipulation select-none [-webkit-tap-highlight-color:transparent] transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100'

  if (variant === 'secondary') {
    return (
      <div className="mt-3">
        {state === 'sent' ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary" role="status"><Check className="w-4 h-4" aria-hidden="true" />{sentText}</p>
        ) : (
          <button type="button" onClick={send} disabled={state === 'sending'} className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 disabled:opacity-60 ${press}`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
            {state === 'sending' ? 'Sending…' : `Shopping in the store? ${label}`}
          </button>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
    )
  }

  if (variant === 'compact') {
    return state === 'sent'
      ? <span className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-primary" role="status"><Check className="w-4 h-4" aria-hidden="true" />Sent</span>
      : <button type="button" onClick={send} disabled={state === 'sending'} className={`shrink-0 inline-flex min-h-[44px] items-center gap-2 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 ${press}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />{state === 'sending' ? 'Sending…' : label}
        </button>
  }

  return (
    <div>
      {state === 'sent' ? (
        <div className="rounded-xl bg-white border border-primary/30 px-4 py-3" role="status">
          <p className="inline-flex items-center gap-1.5 font-semibold text-primary"><Check className="w-5 h-5" aria-hidden="true" />{sentText}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Open it in the store and check items off as you go. No sign-in needed.</p>
        </div>
      ) : (
        <>
          <button type="button" onClick={send} disabled={state === 'sending'} className={`w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center gap-2 px-8 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm disabled:opacity-60 ${press}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />{state === 'sending' ? 'Sending…' : label}
          </button>
          <p className="text-sm text-muted-foreground mt-2">For the store. Check items off on your phone as you shop.{sms ? '' : ` Goes to ${route.hint}.`}</p>
        </>
      )}
      {error && <p className="text-sm text-destructive mt-2" role="alert">{error}</p>}
    </div>
  )
}
