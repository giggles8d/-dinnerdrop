'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { CATEGORY_ORDER, CATEGORY_EMOJI } from '@/lib/list'
import type { GroceryCategory } from '@/types'

/**
 * The no-sign-in list a family opens in the store from a text or email (app/list, Nov 22 2026 review, Sarah
 * approved). Built for one hand in a grocery aisle: big rows, tap anywhere on a row to check it off, lines stay
 * where they are (moving them while she shops loses her place), and a running "left to get" count at the top.
 * Checks are kept on this phone; lines that exist on the family's list are also saved to it (/api/send-list/check),
 * so the app's list matches the basket.
 */
export interface InStoreLine { id: string | null; name: string; qty: string; category: GroceryCategory; checked: boolean }

export default function InStoreList({ u, s, weekKey, lines }: { u: string; s: string; weekKey: string; lines: InStoreLine[] }) {
  const storeKey = `dd.list.${u}.${weekKey}`
  const keyOf = (l: InStoreLine) => l.id ?? `n:${l.name.toLowerCase()}`
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(lines.map((l) => [keyOf(l), l.checked])))

  // Checks made on this phone earlier (also covers lines with no row on the family's list yet).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey)
      if (raw) setChecked((cur) => ({ ...cur, ...(JSON.parse(raw) as Record<string, boolean>) }))
    } catch { /* storage blocked: server state only */ }
  }, [storeKey])

  function toggle(l: InStoreLine) {
    const k = keyOf(l)
    const next = !checked[k]
    setChecked((cur) => {
      const out = { ...cur, [k]: next }
      try { localStorage.setItem(storeKey, JSON.stringify(out)) } catch { /* ignore */ }
      return out
    })
    if (l.id) {
      fetch('/api/send-list/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u, s, id: l.id, checked: next }), keepalive: true }).catch(() => {})
    }
  }

  const groups = useMemo(() => CATEGORY_ORDER.map((c) => ({ c, rows: lines.filter((l) => l.category === c) })).filter((g) => g.rows.length), [lines])
  const left = lines.filter((l) => !checked[keyOf(l)]).length
  const done = lines.length - left

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 px-4 pt-3 pb-3 bg-background/95 backdrop-blur border-b border-border">
        <p className="text-sm font-semibold text-foreground" aria-live="polite">
          {left === 0 ? 'All done. Everything is in the basket.' : `${left} left to get`}
          <span className="font-normal text-muted-foreground">{left === 0 ? '' : ` · ${done} of ${lines.length} checked`}</span>
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <div className="h-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none" style={{ width: `${lines.length ? (done / lines.length) * 100 : 0}%` }} />
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.c} className="mt-6" aria-labelledby={`cat-${g.c}`}>
          <h2 id={`cat-${g.c}`} className="text-sm font-semibold text-muted-foreground mb-1">
            <span aria-hidden="true">{CATEGORY_EMOJI[g.c]} </span>{g.c}
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {g.rows.map((l) => {
              const on = !!checked[keyOf(l)]
              return (
                <li key={keyOf(l)}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(l)}
                    className="w-full min-h-[52px] flex items-center gap-3 px-4 py-3 text-left touch-manipulation select-none [-webkit-tap-highlight-color:transparent] active:bg-muted transition-colors duration-150"
                  >
                    <span aria-hidden="true" className={`shrink-0 w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition-colors duration-150 ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-gray-300 bg-white'}`}>
                      {on && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                    <span className={`flex-1 min-w-0 text-base leading-snug ${on ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{l.name}</span>
                    {l.qty && <span className={`shrink-0 text-sm tabular-nums ${on ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>{l.qty}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
