'use client'

import { useMemo, useState } from 'react'
import { History, Check } from 'lucide-react'
import { AISLES, aisleFor, type AisleKey, type AislePick, type UsualItem } from '@/lib/aisle'
import { normalizeItemName } from '@/lib/list'
import type { SaleItem } from '@/lib/sales-shared'

interface Props {
  onList: (name: string) => boolean           // already on this week's list?
  usuals: UsualItem[]                         // the family's own repeat buys, from past weeks
  lastWeekExtras: UsualItem[]                 // what they added last week (for "add last week's extras")
  saleFor?: (name: string) => SaleItem | null
  onAdd: (pick: { name: string; category: AislePick['category']; searchTerm: string; quantity?: string; unit?: string }) => Promise<void> | void
  onAddMany: (picks: Array<{ name: string; category: AislePick['category']; searchTerm: string; quantity?: string; unit?: string }>) => Promise<void> | void
}

/**
 * "Rest of the shop": fruit, veg, snacks, drinks, frozen, breakfast, lunch, dairy, household.
 * One tap adds an item with a sensible quantity. The family's usuals come first in every aisle.
 */
export default function RestOfShop({ onList, usuals, lastWeekExtras, saleFor, onAdd, onAddMany }: Props) {
  const [aisle, setAisle] = useState<AisleKey | 'usuals'>(usuals.length ? 'usuals' : 'fruit')
  const [addedLast, setAddedLast] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [typed, setTyped] = useState('')
  const [q, setQ] = useState('')

  const usualsByAisle = useMemo(() => {
    const m = new Map<AisleKey, UsualItem[]>()
    for (const u of usuals) { const k = aisleFor(u.name); m.set(k, [...(m.get(k) ?? []), u]) }
    return m
  }, [usuals])

  const picksFor = (key: AisleKey | 'usuals'): Array<AislePick & { usual?: boolean; times?: number }> => {
    if (key === 'usuals') return usuals.slice(0, 24).map((u) => ({ name: u.name, category: u.category, searchTerm: u.searchTerm, quantity: u.quantity, unit: u.unit, usual: true, times: u.times }))
    const a = AISLES.find((x) => x.key === key)!
    const mine = (usualsByAisle.get(key) ?? []).map((u) => ({ name: u.name, category: u.category, searchTerm: u.searchTerm, quantity: u.quantity, unit: u.unit, usual: true, times: u.times }))
    const seen = new Set(mine.map((m) => normalizeItemName(m.name)))
    return [...mine, ...a.picks.filter((p) => !seen.has(normalizeItemName(p.name)))]
  }

  const allPicks = picksFor(aisle)
  const needle = q.trim().toLowerCase()
  type Pick = AislePick & { usual?: boolean; times?: number }
  const searched: Pick[] | null = needle ? (AISLES.flatMap((a) => a.picks) as Pick[]).concat(usuals.map((u) => ({ name: u.name, category: u.category, searchTerm: u.searchTerm, quantity: u.quantity, unit: u.unit, usual: true, times: u.times }))).filter((p, i, arr) => p.name.toLowerCase().includes(needle) && arr.findIndex((x) => normalizeItemName(x.name) === normalizeItemName(p.name)) === i) : null
  const LIMIT = 16
  const picks = searched ?? (showAll ? allPicks : allPicks.slice(0, LIMIT))
  const pendingLast = lastWeekExtras.filter((u) => !onList(u.name))

  return (
    <div className="mt-10 rounded-2xl border border-accent/30 bg-accent/5 p-5 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-heading font-semibold text-foreground">The rest of the shop</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Fruit, snacks, drinks, the dog&apos;s food — tap and it rides along in the same cart. Your usuals come first.</p>
        </div>
        {pendingLast.length > 0 && (
          <button
            type="button"
            disabled={addedLast}
            onClick={async () => { await onAddMany(pendingLast.map((u) => ({ name: u.name, category: u.category, searchTerm: u.searchTerm, quantity: u.quantity, unit: u.unit }))); setAddedLast(true) }}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {addedLast ? <><Check className="w-3.5 h-3.5" /> Added</> : <><History className="w-3.5 h-3.5" /> Add last week&apos;s extras ({pendingLast.length})</>}
          </button>
        )}
      </div>

      <div className="mt-4 mb-3 flex flex-col sm:flex-row gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the aisles… (strawberries, K-cups, dog treats)" className="flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm" />
        <form onSubmit={(e) => { e.preventDefault(); const t = typed.trim(); if (!t) return; onAdd({ name: t, category: 'Pantry & Dry Goods', searchTerm: t }); setTyped('') }} className="flex gap-2">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Not listed? Type it" className="w-44 rounded-lg border border-input bg-white px-3 py-2 text-sm" />
          <button type="submit" disabled={!typed.trim()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Add</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {usuals.length > 0 && (
          <button type="button" onClick={() => { setAisle('usuals'); setShowAll(false) }} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${aisle === 'usuals' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`}>⭐ Your usuals</button>
        )}
        {AISLES.map((a) => (
          <button key={a.key} type="button" onClick={() => { setAisle(a.key); setShowAll(false) }} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${aisle === a.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`}>{a.emoji} {a.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {picks.map((p) => {
          const on = onList(p.name)
          const sale = saleFor?.(p.name)
          return (
            <button
              key={p.name}
              type="button"
              disabled={on}
              onClick={() => onAdd({ name: p.name, category: p.category, searchTerm: p.searchTerm, quantity: p.quantity, unit: p.unit })}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${on ? 'bg-secondary text-primary border-primary/30 cursor-default' : 'bg-white text-foreground border-border hover:border-primary/50 hover:bg-secondary/40'}`}
              title={p.usual ? `You've bought this ${p.times} time${p.times === 1 ? '' : 's'}` : undefined}
            >
              {on ? '✓' : '+'} {p.name}{p.usual && !on ? ' ⭐' : ''}{sale ? <span className="ml-1 text-[10px] font-semibold text-primary">🏷️ {sale.price}</span> : null}
            </button>
          )
        })}
        {!searched && allPicks.length > LIMIT && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="px-3 py-1.5 rounded-full text-sm font-semibold text-primary hover:underline">
            {showAll ? 'Show fewer' : `Show all ${allPicks.length}`}
          </button>
        )}
        {searched && searched.length === 0 && <span className="text-sm text-muted-foreground self-center">Nothing by that name — type it in the box above and it goes on the list.</span>}
      </div>
    </div>
  )
}
