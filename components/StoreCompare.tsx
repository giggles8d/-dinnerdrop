'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Store, Split, X } from 'lucide-react'
import { normalizeItemName, type ListItem } from '@/lib/list'
import type { WeeklySales } from '@/lib/sales-shared'
import { quoteStores, proposeSplit, type StorePref } from '@/lib/compare'

interface Props {
  items: ListItem[]
  baseline: (i: ListItem) => number
  stores: StorePref[]
  sets: WeeklySales[]
  globalFactor: number
  /** Real basket totals read from Instacart's list page (sale prices included), when the Saturday price read has run. */
  realQuotes?: Array<{ store: string; total: number; item_count: number | null; missing: string[]; items?: Array<{ name: string }> | null; created_at: string }>
  split: Record<string, string> | null             // itemId → store name, when splitting
  onSplit: (assign: Record<string, string> | null, stores: [string, string] | null) => void
}

/**
 * "Which store this week?" — quotes the list at each of the family's stores (flyer sale
 * prices where known, learned store factors otherwise) and offers a two-store split.
 */
export default function StoreCompare({ items, baseline, stores, sets, globalFactor, realQuotes = [], split, onSplit }: Props) {
  const quotes = useMemo(() => {
    const est = quoteStores(items, baseline, stores, sets, globalFactor)
    const open = items.filter((i) => !i.have && !i.checked)
    // A real quote (read from Instacart this week) replaces the estimate for that store — but only
    // if it priced the list as it is now. Items added since the read are estimated on top; if the
    // list has changed too much (e.g. the read was of last week's list) we fall back to the estimate.
    const merged = est.map((q) => {
      const real = realQuotes.find((r) => r.store.toLowerCase() === q.store.toLowerCase())
      if (!real) return { ...q, real: false, missing: [] as string[], readAt: '', added: 0 }
      const priced = new Set((real.items ?? []).map((x) => normalizeItemName(x.name)))
      let covered = 0, addedCost = 0, added = 0
      if (priced.size) {
        for (const it of open) {
          if (priced.has(normalizeItemName(it.name))) covered++
          else { added++; addedCost += baseline(it) * q.factor }
        }
        const fresh = open.length === 0 || covered / open.length >= 0.7
        if (!fresh) return { ...q, real: false, missing: [] as string[], readAt: '', added: 0 }
      } else {
        // Older quote rows don't say what they priced — trust them only if the count is close.
        const n = real.item_count ?? 0
        if (Math.abs(n - open.length) > 5) return { ...q, real: false, missing: [] as string[], readAt: '', added: 0 }
      }
      return { ...q, total: Math.round((Number(real.total) + addedCost) * 100) / 100, real: true, missing: real.missing ?? [], readAt: real.created_at, added }
    })
    return merged.sort((a, b) => a.total - b.total)
  }, [items, baseline, stores, sets, globalFactor, realQuotes])
  const anyReal = quotes.some((q) => q.real)
  const [pair, setPair] = useState<[string, string] | null>(null)

  if (stores.length < 2) {
    return (
      <div className="mt-6 rounded-2xl border border-border p-4 print:hidden text-sm text-muted-foreground">
        <Store className="inline w-4 h-4 mr-1 text-primary" />
        Compare stores: add the stores you shop (Wegmans, Tops, Aldi…) in <Link href="/settings?section=stores" className="text-primary underline">Settings → Stores</Link>, load their flyers, and the list prices itself at each one.
      </div>
    )
  }

  const best = quotes[0]
  const flyersLoaded = sets.length > 0

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-secondary/40 p-4 print:hidden">
      <div className="flex items-center gap-2 mb-2">
        <Store className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">Which store this week?</h2>
        {!flyersLoaded && !anyReal && <span className="text-[11px] text-muted-foreground">estimates from what each store usually costs you — real prices load every Sunday morning</span>}
        {anyReal && <span className="text-[11px] text-primary font-medium">real prices from Instacart, sales included</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {quotes.map((q, i) => (
          <div key={q.store} className={`rounded-xl border p-3 bg-white ${i === 0 ? 'border-primary' : 'border-border'}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-foreground">{q.store}{i === 0 ? <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-bold">cheapest</span> : null}</span>
              <span className="text-lg font-heading font-bold text-foreground">${q.total.toFixed(0)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {q.real
                ? `read from Instacart ${new Date(q.readAt).toLocaleDateString(undefined, { weekday: 'short' })}${q.added ? ` · +${q.added} added since (estimated)` : ''}${q.missing.length ? ` · doesn't carry: ${q.missing.slice(0, 3).join(', ')}${q.missing.length > 3 ? ` +${q.missing.length - 3}` : ''}` : ' · everything in stock'}`
                : `${q.onSale > 0 ? `${q.onSale} items on sale · saves ≈ $${q.saleSavings.toFixed(0)}` : 'estimate'}${q.factor !== 1 ? ` · runs ${q.factor.toFixed(2)}× typical` : ''}`}
            </p>
          </div>
        ))}
      </div>

      {quotes.length >= 2 && !split && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Split between two stores:</span>
          <select className="rounded-md border border-input bg-white px-2 py-1 text-xs" value={pair?.[0] ?? quotes[0].store} onChange={(e) => setPair([e.target.value, pair?.[1] ?? (quotes.find((q) => q.store !== e.target.value)?.store ?? quotes[1].store)])}>
            {quotes.map((q) => <option key={q.store} value={q.store}>{q.store}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">+</span>
          <select className="rounded-md border border-input bg-white px-2 py-1 text-xs" value={pair?.[1] ?? quotes[1].store} onChange={(e) => setPair([pair?.[0] ?? quotes[0].store, e.target.value])}>
            {quotes.map((q) => <option key={q.store} value={q.store}>{q.store}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              const [a, b] = pair ?? [quotes[0].store, quotes[1].store]
              if (a === b) return
              const sa = stores.find((s) => s.name === a)!, sb = stores.find((s) => s.name === b)!
              onSplit(proposeSplit(items, baseline, sa, sb, sets, globalFactor), [a, b])
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
          >
            <Split className="w-3.5 h-3.5" /> Propose a split
          </button>
        </div>
      )}
      {split && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          Each item goes to whichever store is cheaper for it. Tap a store badge on any line to move it.
          <button type="button" onClick={() => onSplit(null, null)} className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /> Cancel split</button>
        </div>
      )}
      {best && best.onSale === 0 && flyersLoaded && (
        <p className="text-[11px] text-muted-foreground mt-2">Flyer loaded but nothing matched — item names on the flyer may differ (“chicken thighs” vs “boneless skinless chicken thighs”). The planner still used the sales when it built the week.</p>
      )}
    </div>
  )
}
