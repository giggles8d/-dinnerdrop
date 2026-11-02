'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tag } from 'lucide-react'
import { isUpcoming, type SaleItem, type WeeklySales } from '@/lib/sales-shared'

/**
 * Dashboard card: this week's deals at the family's stores, one tap to /deals — shown whether or
 * not they have a plan, so a family can shop the ad even on a week they skip planning.
 */
export default function DealsCard() {
  const [sets, setSets] = useState<WeeklySales[] | null>(null)
  const [stores, setStores] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/deals', { cache: 'no-store' }).then((r) => r.json()).then((j) => { setSets(j.sets ?? []); setStores(j.stores ?? []) }).catch(() => setSets([]))
  }, [])
  if (sets === null) return null
  const current = sets.filter((s) => !isUpcoming(s))
  const next = sets.filter((s) => isUpcoming(s))
  const total = current.reduce((n, s) => n + s.items.length, 0)
  const storeNames = Array.from(new Set(current.map((s) => s.store).filter(Boolean)))
  const headline: Array<SaleItem & { store: string }> = []
  for (const s of current) for (const i of s.items) if (/meat|seafood|produce/i.test(i.category ?? '') && headline.length < 3 && !headline.some((h) => h.name === i.name)) headline.push({ ...i, store: s.store })

  if (!total) {
    return (
      <Link href={stores.length ? '/deals' : '/settings?section=stores'} className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors">
        <span className="text-sm"><span className="font-semibold text-foreground">🏷️ Store deals</span> <span className="text-muted-foreground">{stores.length ? `We read ${stores.slice(0, 3).join(', ')} ads each week — nothing loaded yet.` : 'Add your stores and we read their weekly ads for you.'}</span></span>
        <span className="text-sm font-semibold text-primary whitespace-nowrap">{stores.length ? 'See →' : 'Add stores →'}</span>
      </Link>
    )
  }
  return (
    <Link href="/deals" className="mb-4 block rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm inline-flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /><span className="font-semibold text-foreground">{total} deals this week at {storeNames.join(', ')}</span></span>
        <span className="text-sm font-semibold text-primary whitespace-nowrap">Shop the deals →</span>
      </div>
      {headline.length > 0 && (
        <div className="mt-1 text-xs text-muted-foreground truncate">
          {headline.map((h) => `${h.name} ${h.price}`).join(' · ')}{next.length ? ` · next week's ${next.map((s) => s.store).join(', ')} ad is in` : ''}
        </div>
      )}
    </Link>
  )
}
