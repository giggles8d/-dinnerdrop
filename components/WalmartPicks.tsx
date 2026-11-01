'use client'

import { useState } from 'react'
import type { ListItem } from '@/lib/list'

/** Items the family texted as Walmart links → one tap puts the exact products in a Walmart cart (Nov 1 2026). */
export default function WalmartPicks({ items, weekStart }: { items: ListItem[]; weekStart?: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const picks = items.filter((i) => i.walmart_item_id && !i.have && !i.ordered_at)
  if (!picks.length) return null

  async function addToCart() {
    setBusy(true); setErr('')
    const tab = window.open('', '_blank')
    try {
      const res = await fetch('/api/walmart/picks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, lines: picks.map((p) => ({ itemId: p.walmart_item_id, qty: Number(p.quantity) || 1 })) }),
      })
      const j = await res.json()
      if (!res.ok || !j.url) throw new Error(j.error || 'failed')
      if (tab) tab.location.href = j.url; else window.location.href = j.url
    } catch {
      tab?.close()
      setErr('Couldn’t open Walmart. Try again.')
    } finally { setBusy(false) }
  }

  const who = Array.from(new Set(picks.map((p) => p.added_by).filter(Boolean)))
  return (
    <div className="rounded-xl border border-[#0071DC]/30 bg-[#0071DC]/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-foreground">
        Walmart picks{who.length ? ` from ${who.join(' & ')}` : ''} ({picks.length})
      </p>
      <ul className="text-xs text-muted-foreground space-y-0.5">
        {picks.map((p) => (
          <li key={p.id} className="truncate">
            {p.link_url ? <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{p.name}</a> : p.name}
            {Number(p.quantity) > 1 ? ` × ${p.quantity}` : ''}
          </li>
        ))}
      </ul>
      <button type="button" onClick={addToCart} disabled={busy}
        className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#0071DC] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
        {busy ? 'Opening Walmart…' : `Add ${picks.length === 1 ? 'it' : `all ${picks.length}`} to my Walmart cart`}
      </button>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <p className="text-[11px] text-muted-foreground">The exact items they linked. Text a Walmart link to the DinnerDrop number to add one.</p>
    </div>
  )
}
