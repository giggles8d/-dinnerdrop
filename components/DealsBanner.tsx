'use client'

import Link from 'next/link'
import { Tag } from 'lucide-react'
import { matchSale, type WeeklySales } from '@/lib/sales-shared'

/** Top of the grocery list: how many lines are on sale this week at the family's stores, and the way to the deals page. */
export default function DealsBanner({ sets, nextSets, names }: { sets: WeeklySales[]; nextSets: WeeklySales[]; names: string[] }) {
  const hits = names.filter((n) => matchSale(n, sets))
  const stores = Array.from(new Set(sets.map((s) => s.store).filter(Boolean)))
  const nextStores = Array.from(new Set(nextSets.map((s) => s.store).filter(Boolean)))
  if (!hits.length && !nextSets.length) return null
  return (
    <div className="mb-4 rounded-2xl bg-primary/10 border border-primary/15 px-4 py-3 flex items-center gap-3 print:hidden">
      <Tag className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        {hits.length ? (
          <>
            <div className="text-sm font-semibold text-foreground">{hits.length} {hits.length === 1 ? 'item is' : 'items are'} on sale this week</div>
            <div className="text-xs text-muted-foreground truncate">{stores.length ? `At ${stores.join(' and ')}` : 'From your flyer'}{nextStores.length ? ` · next week’s ${nextStores.join(', ')} ad is in` : ''}</div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-foreground">Next week’s {nextStores.join(', ')} ad is in</div>
            <div className="text-xs text-muted-foreground">See what’s going on sale before you plan.</div>
          </>
        )}
      </div>
      <Link href="/deals" className="shrink-0 text-xs font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-full">See deals</Link>
    </div>
  )
}
