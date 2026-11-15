'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquareText, X } from 'lucide-react'

/**
 * Asked right after a family's first cart (Sarah, Nov 15 2026): 0 of 23 families who sent a cart came back for a
 * second, and only 4 of them had given a number, so the weekly text with their cart link (lib/reorder) could
 * not reach them. Shows on the grocery list once they have sent a cart and we have no number for them.
 * Re-checks when the tab comes back into focus (they return from the store's site). Dismissable for 30 days.
 */
const KEY = 'dd_cart_text_offer_dismissed'

export default function CartTextOffer() {
  const [show, setShow] = useState(false)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [needsFamily, setNeedsFamily] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ok = phone.replace(/\D/g, '').length >= 10

  const check = useCallback(() => {
    try { if (Date.now() - Number(localStorage.getItem(KEY) || 0) < 30 * 86400000) return } catch { /* ignore */ }
    fetch('/api/texting/quick-setup').then((r) => r.json()).then((j) => { if (j.sentCart && !j.hasOwnerPhone) setShow(true) }).catch(() => {})
  }, [])
  useEffect(() => {
    check()
    const onFocus = () => { if (!document.hidden) check() }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [check])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!ok) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/texting/quick-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerPhone: phone, members: [], via: 'cart_offer' }) })
      const j = await r.json()
      if (!r.ok) { setErr(j.error || 'That didn’t save. Try again.'); return }
      if (j.familyRequired) { setNeedsFamily(true); return }
      setDone('You’re set. Look for a text from us in a minute. Every week we text you the dinners with your cart link, already filled.')
    } catch { setErr('That didn’t save. Try again.') } finally { setBusy(false) }
  }

  function dismiss() { try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ } setShow(false) }

  if (!show) return null
  return (
    <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 print:hidden">
      <div className="flex items-start gap-3">
        <MessageSquareText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">Want next week&apos;s cart by text?</p>
          {done ? <p className="text-sm text-foreground mt-1">{done}</p>
            : needsFamily ? (
              <div className="mt-1">
                <p className="text-sm text-foreground">Number saved. Texting is part of the Family plan. Start the free 14-day trial and it&apos;s on right away.</p>
                <Link href="/subscribe?auto=1" className="web-only inline-block mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Start my free trial →</Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-1">Every week we text you the dinners with your cart link, already filled. Tap and check out. No app to open.</p>
                <form onSubmit={submit} className="mt-3 flex flex-col sm:flex-row gap-2">
                  <label htmlFor="cart-text-phone" className="sr-only">Your cell</label>
                  <input id="cart-text-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="Your cell (555) 555-1234"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-input bg-background text-base" />
                  <button type="submit" disabled={busy || !ok} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                    {busy ? 'Saving…' : 'Text me next week'}
                  </button>
                </form>
                {err && <p className="text-xs text-destructive mt-2" role="alert">{err}</p>}
                <p className="text-[11px] text-muted-foreground leading-snug mt-2">
                  By tapping &ldquo;Text me next week,&rdquo; you agree to receive automated texts from DinnerDrop about your dinners and grocery list at this number (a few a week, never ads). Msg &amp; data rates may apply. Reply STOP to stop, HELP for help.
                </p>
              </>
            )}
        </div>
        {!done && <button type="button" onClick={dismiss} aria-label="Not now" className="p-1 -m-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
      </div>
    </div>
  )
}
