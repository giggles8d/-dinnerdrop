'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Minus, Plus } from 'lucide-react'
import { isStockUpDeal, stockUpScore, type SaleItem, type WeeklySales } from '@/lib/sales-shared'
import type { GroceryCategory } from '@/types'

const CATS: GroceryCategory[] = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages']

/** "buy 2 get 2" → 4, "2 for $5" → 2, "10 for $10" → 6 cap, else 2 for a plain pantry deal. */
function stockQty(i: SaleItem): number {
  const t = `${i.price} ${i.note ?? ''}`.toLowerCase()
  const bxgy = t.match(/buy\s*(\d+)\s*,?\s*get\s*(\d+)/) ?? t.match(/\bb(\d)g(\d)\b/)
  if (bxgy) return Number(bxgy[1]) + Number(bxgy[2])
  const nfor = t.match(/(\d+)\s*for\s*\$/)
  if (nfor) return Math.min(6, Number(nfor[1]))
  return 2
}

/**
 * "Stock up while it's cheap": the multi-buys and pantry/drink deals from this week's ads that
 * aren't on the list yet (the Dr Pepper buy-2-get-2 moment). Settings → Store deals turns it off.
 */
export default function StockUpDeals({ sets, onList, onAdd }: {
  sets: WeeklySales[]
  onList: (name: string) => boolean
  onAdd: (pick: { name: string; category: GroceryCategory; searchTerm: string; quantity?: string; unit?: string }) => Promise<void> | void
}) {
  const [qty, setQty] = useState<Record<string, number>>({})
  const [done, setDone] = useState<Record<string, number>>({})
  // Strongest multi-buys first (buy 2 get 2 → N for $ → marked down); shelf-stable aisles only.
  const deals = sets.flatMap((s) => s.items.filter(isStockUpDeal).map((i) => ({ ...i, store: s.store, key: `${s.id}:${i.name}` })))
    .filter((i) => /pantry|beverage|frozen|dairy|bakery/i.test(i.category ?? 'Pantry') && !onList(i.name))
    .sort((a, b) => stockUpScore(b) - stockUpScore(a))
    .slice(0, 6)
  if (!deals.length) return null
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 print:hidden">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-heading font-semibold text-foreground">Stock up while it’s cheap</h2>
        <Link href="/deals" className="text-xs text-primary underline">All deals</Link>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Multi-buys and pantry deals at your stores this week. Optional — add what you’ll actually use.</p>
      <div className="divide-y divide-amber-100">
        {deals.map((i) => {
          const n = qty[i.key] ?? stockQty(i)
          const added = done[i.key]
          const cat = (CATS.includes(i.category as GroceryCategory) ? i.category : 'Pantry & Dry Goods') as GroceryCategory
          return (
            <div key={i.key} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground capitalize truncate">{i.name}</div>
                <div className="text-[11px] text-amber-900 font-semibold">{i.store} · {i.price}{i.note ? ` · ${i.note}` : ''}</div>
              </div>
              {added ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Check className="w-3.5 h-3.5" /> Added {added}</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label="Fewer" onClick={() => setQty((q) => ({ ...q, [i.key]: Math.max(1, n - 1) }))} className="w-8 h-8 rounded-full border border-border bg-white flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-4 text-center text-sm font-bold">{n}</span>
                  <button type="button" aria-label="More" onClick={() => setQty((q) => ({ ...q, [i.key]: Math.min(12, n + 1) }))} className="w-8 h-8 rounded-full border border-border bg-white flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={async () => { await onAdd({ name: i.name, category: cat, searchTerm: i.brand ? `${i.brand} ${i.name}` : i.name, quantity: String(n), unit: i.unit && /^(each|lb|oz|pack|bag|box|can|jar|bottle|dozen|gallon)$/.test(i.unit) ? i.unit : undefined }); setDone((d) => ({ ...d, [i.key]: n })) }} className="ml-1 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Add {n}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
