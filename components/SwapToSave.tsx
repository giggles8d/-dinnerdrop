'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Check, Tag } from 'lucide-react'

interface Hit { ingredient: string; item: string; price: string; store: string; main: boolean }
interface Suggestion {
  day: string
  current: { name: string; hits: number }
  next: { recipeId: string; name: string; image: string | null; cookTime: number | null; hits: Hit[] }
  store: string
}

/**
 * "Swap a dinner to save": one or two of this week's dinners that use little from the sale ads,
 * each paired with a library dinner built on what's on sale at the family's stores. One tap swaps it;
 * the grocery list rebuilds with the new dinner's ingredients.
 */
export default function SwapToSave({ onSwapped, compact = false }: { onSwapped?: () => void; compact?: boolean }) {
  const [items, setItems] = useState<Suggestion[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/deals/swaps', { cache: 'no-store' }).then((r) => r.json()).then((j) => setItems(j.suggestions ?? [])).catch(() => setItems([]))
  }, [])

  if (!items || !items.length) return null

  async function swap(s: Suggestion) {
    setBusy(s.day); setError('')
    try {
      const res = await fetch('/api/deals/swaps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day: s.day, recipeId: s.next.recipeId }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not swap right now.')
      setDone((d) => ({ ...d, [s.day]: s.next.name }))
      try { localStorage.removeItem('current-meals') } catch { /* ignore */ }
      onSwapped?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not swap right now.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={`${compact ? 'mb-4' : 'mt-6'} rounded-2xl border border-primary/20 bg-primary/5 p-5 print:hidden`}>
      <h2 className="font-heading font-semibold text-foreground flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Swap a dinner to save</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">These dinners use what&rsquo;s on sale at your stores this week. Swap one in and your grocery list updates.</p>
      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.day} className="rounded-xl bg-white border border-border p-3 flex gap-3 items-start">
            {s.next.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.next.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">{s.day}</div>
              <div className="text-sm font-semibold text-foreground flex flex-wrap items-center gap-1.5">
                <span className="line-through decoration-muted-foreground/60 text-muted-foreground font-normal">{s.current.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{s.next.name}</span>
              </div>
              <div className="text-[11px] text-primary font-semibold mt-1">
                {s.next.hits.length} on sale{s.store ? ` at ${s.store}` : ''}: {s.next.hits.map((h) => `${h.item} ${h.price}`).join(' · ')}
              </div>
            </div>
            {done[s.day] ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0"><Check className="w-3.5 h-3.5" /> Swapped</span>
            ) : (
              <button type="button" disabled={busy === s.day} onClick={() => swap(s)} className="shrink-0 h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60">
                {busy === s.day ? 'Swapping…' : 'Swap it'}
              </button>
            )}
          </div>
        ))}
      </div>
      {error ? <p className="text-xs text-red-700 mt-2">{error}</p> : null}
    </div>
  )
}
