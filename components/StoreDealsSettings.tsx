'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Tag } from 'lucide-react'
import { isUpcoming, type WeeklySales } from '@/lib/sales-shared'

/**
 * Settings → Stores: one row per store the family lists, with the state of its weekly ad
 * (DinnerDrop reads most big chains' ads on their preview days; anything else can be snapped).
 */
const AUTO = /^(tops|wegmans|aldi|walmart|price chopper|market 32|family fare|publix|weis|kroger|smith|fred meyer|king soopers|ralphs|fry'?s|harris teeter)/i
const AD_DAY: Record<string, string> = { tops: 'Sundays', wegmans: 'Sundays', 'price chopper': 'Sundays', 'market 32': 'Sundays', 'family fare': 'Sundays', aldi: 'Wednesdays', publix: 'Wednesdays', weis: 'Thursdays', walmart: 'daily (rollbacks)', kroger: 'Wednesdays', smith: 'Wednesdays' }

function adDay(store: string): string {
  const k = Object.keys(AD_DAY).find((k) => store.toLowerCase().startsWith(k))
  return k ? AD_DAY[k] : 'weekly'
}

export default function StoreDealsSettings({ stores }: { stores: string[] }) {
  const [sets, setSets] = useState<WeeklySales[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try { const r = await fetch('/api/deals', { cache: 'no-store' }); const j = await r.json(); setSets(j.sets ?? []) } catch { /* ignore */ } finally { setLoaded(true) }
  }, [])
  useEffect(() => { load() }, [load])

  if (!stores.length) return null
  const total = sets.filter((s) => !isUpcoming(s)).reduce((n, s) => n + s.items.length, 0)

  return (
    <div className="rounded-2xl border border-border bg-white divide-y divide-border">
      {stores.map((name) => {
        const mine = sets.filter((s) => s.store.toLowerCase().startsWith(name.toLowerCase().slice(0, 4)))
        const cur = mine.find((s) => !isUpcoming(s))
        const next = mine.find((x) => isUpcoming(x))
        const auto = AUTO.test(name)
        return (
          <div key={name} className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-primary shrink-0">{name.trim().charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{name}</div>
              <div className="text-xs text-muted-foreground">
                {!loaded ? 'Checking the ad…'
                  : cur ? `${cur.items.length} deals this week${next ? ` · next week loaded (${next.items.length})` : ''}`
                  : next ? `Next week’s ad loaded (${next.items.length} deals)`
                  : auto ? `No ad yet — we read it ${adDay(name)}` : 'No ad yet — snap the flyer and we share it with every family at this store'}
              </div>
            </div>
            {cur || next ? (
              <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{cur?.source?.startsWith('shared') || next?.source?.startsWith('shared') ? 'Auto' : 'Loaded'}</span>
            ) : auto ? (
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Auto</span>
            ) : null}
          </div>
        )
      })}
      {loaded && total > 0 && (
        <div className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-primary" /> {total} sale items at your stores this week. <Link href="/deals" className="text-primary underline">See the deals</Link>
        </div>
      )}
    </div>
  )
}
