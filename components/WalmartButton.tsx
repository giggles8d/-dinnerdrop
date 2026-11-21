'use client'

import { fireCartSent } from '@/lib/cart-conversion'
import { useState } from 'react'
import { X } from 'lucide-react'
import { isNativeApp, openExternal, tapHaptic } from '@/lib/native'
import { track } from '@/lib/activation'
import type { GroceryCategory, GroceryItem } from '@/types'
import type { WalmartMatch, WalmartProduct } from '@/lib/walmart'

interface Props {
  groceryList: Record<GroceryCategory, GroceryItem[]>
  weekStart?: string
  onSent?: () => void
}

const BLUE = '#0071CE'
const YELLOW = '#FFC220'

/**
 * "Shop at Walmart": match the list to real Walmart products, let the family review and swap,
 * then one tap adds everything to their Walmart cart (they check out on Walmart.com).
 */
export default function WalmartButton({ groceryList, weekStart, onSent }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<WalmartMatch[] | null>(null)
  const [picked, setPicked] = useState<Record<number, { product: WalmartProduct | null; qty: number }>>({})
  const [swapping, setSwapping] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const itemCount = Object.values(groceryList).reduce((n, arr) => n + arr.length, 0)

  const [done, setDone] = useState<{ sent: number; total: number; missing: string[] } | null>(null)

  async function fetchMatches(): Promise<WalmartMatch[] | null> {
    const res = await fetch('/api/walmart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groceryList }) })
    const j = await res.json()
    if (!res.ok) { setError(j.error || 'Could not reach Walmart. Try again in a minute.'); return null }
    return j.matches as WalmartMatch[]
  }

  /** Optional review: match, then show the swap sheet before anything goes to the cart. */
  async function start() {
    tapHaptic(); setLoading(true); setError(null)
    track('cta_tap', { page: 'grocery-list', id: 'walmart_review' })
    try {
      const m = await fetchMatches()
      if (!m) return
      setMatches(m)
      const init: Record<number, { product: WalmartProduct | null; qty: number }> = {}
      m.forEach((x, i) => { init[i] = { product: x.product, qty: x.qty } })
      setPicked(init)
    } catch { setError('Could not reach Walmart. Try again in a minute.') } finally { setLoading(false) }
  }

  /**
   * One tap (Nov 15 2026): 4 of 4 families who opened the review sheet left without sending.
   * Match, then go straight to the filled Walmart cart. The tab opens on the tap itself so
   * phone browsers don't block it while we match (~4 s).
   */
  async function oneTap() {
    tapHaptic(); setLoading(true); setError(null); setDone(null)
    track('cta_tap', { page: 'grocery-list', id: 'walmart_button' })
    const win = isNativeApp() ? null : window.open('', '_blank')
    try { if (win) { win.opener = null; win.document.title = 'Walmart'; win.document.body.innerHTML = '<p style="font:16px -apple-system,sans-serif;padding:24px">Filling your Walmart cart…</p>' } } catch { /* cross-origin later */ }
    const fail = (msg: string) => { try { win?.close() } catch { /* ignore */ } setError(msg) }
    try {
      const m = await fetchMatches()
      if (!m) { try { win?.close() } catch { /* ignore */ } return }
      const lines = m.filter((x) => x.product && x.qty > 0).map((x) => ({ product: x.product as WalmartProduct, qty: x.qty }))
      if (!lines.length) { fail('We couldn\u2019t match your list to Walmart products. Try Instacart instead.'); return }
      const total = Math.round(lines.reduce((s2, p) => s2 + (p.product.price ?? 0) * p.qty, 0) * 100) / 100
      const res = await fetch('/api/walmart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, lines: lines.map((p) => ({ itemId: p.product.itemId, qty: p.qty })), weekStart, estTotal: total, itemCount }),
      })
      const j = await res.json()
      if (!res.ok || !j.link) { fail(j.error || 'Could not build the cart link.'); return }
      if (win && !win.closed) win.location.href = j.link
      else await openExternal(j.link)
      setDone({ sent: lines.length, total, missing: m.filter((x) => !x.product).map((x) => x.line.name) })
      fireCartSent('Walmart', total)
      onSent?.()
    } catch { fail('Could not reach Walmart. Try again in a minute.') } finally { setLoading(false) }
  }

  const chosen = matches ? matches.map((_, i) => picked[i]).filter((p) => p && p.product && p.qty > 0) as Array<{ product: WalmartProduct; qty: number }> : []
  const estTotal = chosen.reduce((s, p) => s + (p.product.price ?? 0) * p.qty, 0)
  const unmatched = matches ? matches.filter((_, i) => !picked[i]?.product) : []

  async function addAll() {
    if (!chosen.length) return
    tapHaptic(); setSending(true); setError(null)
    try {
      const res = await fetch('/api/walmart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, lines: chosen.map((p) => ({ itemId: p.product.itemId, qty: p.qty })), weekStart, estTotal: Math.round(estTotal * 100) / 100, itemCount }),
      })
      const j = await res.json()
      if (!res.ok || !j.link) { setError(j.error || 'Could not build the cart link.'); return }
      await openExternal(j.link)
      setMatches(null)
      onSent?.()
    } catch { setError('Could not build the cart link.') } finally { setSending(false) }
  }

  function setQty(i: number, qty: number) { setPicked((p) => ({ ...p, [i]: { ...p[i], qty: Math.max(0, Math.min(20, qty)) } })) }
  function choose(i: number, product: WalmartProduct) { setPicked((p) => ({ ...p, [i]: { product, qty: Math.max(1, p[i]?.qty || 1) } })); setSwapping(null) }

  return (
    <div className="space-y-2">
      <button
        onClick={oneTap}
        disabled={loading || itemCount === 0}
        className="w-full sm:w-auto px-8 py-3 rounded-lg text-white font-semibold text-base disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center gap-2"
        style={{ backgroundColor: BLUE }}
      >
        <span aria-hidden className="inline-block w-5 h-5 rounded-full" style={{ background: `radial-gradient(circle, ${YELLOW} 35%, transparent 36%), conic-gradient(${YELLOW} 0 20deg, transparent 20deg 60deg, ${YELLOW} 60deg 80deg, transparent 80deg 120deg, ${YELLOW} 120deg 140deg, transparent 140deg 180deg, ${YELLOW} 180deg 200deg, transparent 200deg 240deg, ${YELLOW} 240deg 260deg, transparent 260deg 300deg, ${YELLOW} 300deg 320deg, transparent 320deg 360deg)` }} />
        {loading ? 'Filling your Walmart cart…' : 'Send to Walmart cart'}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {done ? (
        <p className="text-[12px] text-foreground">
          ✓ {done.sent} items sent to your Walmart cart{done.total ? ` (about $${Math.round(done.total)})` : ''}. Check out on Walmart.com for pickup or delivery.
          {done.missing.length > 0 && <span className="block text-amber-800 mt-0.5">Add these yourself (no close match): {done.missing.join(', ')}.</span>}
        </p>
      ) : !matches && !error && (
        <p className="text-[11px] text-muted-foreground">
          One tap fills your Walmart cart with every item, matched to store sizes. You check out on Walmart.com.{' '}
          <button type="button" onClick={start} disabled={loading} className="underline underline-offset-2 hover:text-foreground">Review items first</button>
        </p>
      )}

      {matches && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !sending && setMatches(null)}>
          <div className="bg-background w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-heading font-bold text-lg text-foreground">Your Walmart cart</p>
                <p className="text-xs text-muted-foreground">{chosen.length} of {matches.length} items matched{unmatched.length ? ` · ${unmatched.length} to add yourself` : ''} · about ${estTotal.toFixed(2)}</p>
              </div>
              <button onClick={() => setMatches(null)} aria-label="Close" className="p-1.5 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-3 divide-y divide-border">
              {matches.map((m, i) => {
                const p = picked[i]
                return (
                  <div key={i} className="py-3">
                    <div className="flex items-start gap-3">
                      {p?.product?.image ? <img src={p.product.image} alt="" className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-muted shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{m.line.quantity} {m.line.unit} {m.line.name} <span className="text-foreground/60">· {m.plan.label}</span></p>
                        {p?.product ? (
                          <>
                            <p className="text-sm font-medium text-foreground leading-snug">{p.product.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.product.price != null ? `$${p.product.price.toFixed(2)} each` : 'price at checkout'}{!p.product.inStock ? ' · may be out of stock' : ''}</p>
                          </>
                        ) : (
                          <p className="text-sm text-amber-700">No close match — add this one in Walmart yourself.</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {p?.product && (
                            <div className="inline-flex items-center rounded-full border border-border">
                              <button onClick={() => setQty(i, (p.qty || 0) - 1)} className="px-2.5 py-0.5 text-sm" aria-label="Fewer">−</button>
                              <span className="px-1 text-sm font-semibold min-w-[1.25rem] text-center">{p.qty}</span>
                              <button onClick={() => setQty(i, (p.qty || 0) + 1)} className="px-2.5 py-0.5 text-sm" aria-label="More">+</button>
                            </div>
                          )}
                          {(m.alternatives.length > 0 || m.product) && (
                            <button onClick={() => setSwapping(swapping === i ? null : i)} className="text-xs text-primary underline underline-offset-2">{swapping === i ? 'Done' : 'Change'}</button>
                          )}
                        </div>
                      </div>
                    </div>
                    {swapping === i && (
                      <div className="mt-2 ml-[4.25rem] grid gap-1.5">
                        {[m.product, ...m.alternatives].filter((x): x is WalmartProduct => !!x && x.itemId !== p?.product?.itemId).map((alt) => (
                          <button key={alt.itemId} onClick={() => choose(i, alt)} className="flex items-center gap-2 text-left rounded-lg border border-border px-2 py-1.5 hover:border-primary/60">
                            {alt.image ? <img src={alt.image} alt="" className="w-8 h-8 rounded object-cover bg-muted" /> : <div className="w-8 h-8 rounded bg-muted" />}
                            <span className="text-xs text-foreground flex-1 leading-snug">{alt.name}</span>
                            <span className="text-xs text-muted-foreground">{alt.price != null ? `$${alt.price.toFixed(2)}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-4 border-t border-border space-y-2 native-raise">
              <button onClick={addAll} disabled={sending || !chosen.length} className="w-full px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50" style={{ backgroundColor: BLUE }}>
                {sending ? 'Opening Walmart…' : `Add ${chosen.length} items to my Walmart cart →`}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">Opens Walmart.com with these items in your cart. Prices are Walmart&apos;s for your store; we add nothing. Items stay on your list until you confirm the order.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
