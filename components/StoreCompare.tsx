'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Store, Split, X } from 'lucide-react'
import type { ListItem } from '@/lib/list'
import type { WeeklySales } from '@/lib/sales-shared'
import { quoteStores, proposeSplit, type StorePref } from '@/lib/compare'

interface Props {
  items: ListItem[]
  baseline: (i: ListItem) => number
  stores: StorePref[]
  sets: WeeklySales[]
  globalFactor: number
  split: Record<string, string> | null             // itemId → store name, when splitting
  onSplit: (assign: Record<string, string> | null, stores: [string, string] | null) => void
}

/**
 * "Which store this week?" — quotes the list at each of the family's stores (flyer sale
 * prices where known, learned store factors otherwise) and offers a two-store split.
 */
export default function StoreCompare({ items, baseline, stores, sets, globalFactor, split, onSplit }: Props) {
  const quotes = useMemo(() => quoteStores(items, baseline, stores, sets, globalFactor), [items, baseline, stores, sets, globalFactor])
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
        {!flyersLoaded && <span className="text-[11px] text-muted-foreground">no flyers loaded — using what each store usually costs you</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {quotes.map((q, i) => (
          <div key={q.store} className={`rounded-xl border p-3 bg-white ${i === 0 ? 'border-primary' : 'border-border'}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-foreground">{q.store}{i === 0 ? <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-bold">cheapest</span> : null}</span>
              <span className="text-lg font-heading font-bold text-foreground">${q.total.toFixed(0)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {q.onSale > 0 ? `${q.onSale} items on sale · saves ≈ $${q.saleSavings.toFixed(0)}` : 'nothing from this list in its flyer'}
              {q.factor !== 1 ? ` · runs ${q.factor.toFixed(2)}× typical` : ''}
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
