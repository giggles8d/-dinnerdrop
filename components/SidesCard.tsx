'use client'
import { useState } from 'react'
import { sideFor } from '@/lib/sides'
import { normalizeItemName } from '@/lib/list'
import type { Meal, GroceryCategory } from '@/types'

/** "Sides for the week" on the grocery list: one suggested side per dinner, each addable to the list in one tap. */
export default function SidesCard({ meals, have, onAdd }: { meals: Meal[]; have: string[]; onAdd: (name: string, category: GroceryCategory, searchTerm: string, qty: { quantity: string; unit: string }) => Promise<void> }) {
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  if (!meals.length) return null
  const haveSet = new Set(have.map(normalizeItemName))
  const rows = meals.map((m) => ({ meal: m, side: sideFor(m) })).map((r) => ({ ...r, onList: r.side.items.every((i) => haveSet.has(normalizeItemName(i.name))) || added.has(r.meal.day + r.side.name) }))
  async function add(key: string, side: ReturnType<typeof sideFor>) {
    for (const i of side.items) await onAdd(i.name, i.category, i.name, { quantity: i.quantity, unit: i.unit })
    setAdded((s) => new Set(s).add(key))
  }
  return (
    <div className="mb-6 rounded-xl border border-border p-4 print:hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <div>
          <p className="text-sm font-semibold text-foreground">Sides for the week</p>
          <p className="text-xs text-muted-foreground">A simple side to go with each dinner — add the ones you want.</p>
        </div>
        <span className="text-muted-foreground text-sm">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="mt-3 divide-y divide-border">
          {rows.map(({ meal, side, onList }) => (
            <li key={meal.day} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0"><span className="text-muted-foreground">{meal.day}:</span> <span className="font-medium text-foreground">{side.name}</span> <span className="text-xs text-muted-foreground">· {side.minutes} min · with {meal.name}</span></div>
              <button onClick={() => add(meal.day + side.name, side)} disabled={onList} className="shrink-0 text-xs font-semibold text-primary disabled:text-muted-foreground">{onList ? 'On the list' : '+ Add'}</button>
            </li>
          ))}
          <li className="pt-2 text-[11px] text-muted-foreground">Sides are suggestions, not part of the dinner&apos;s cost or nutrition.</li>
        </ul>
      )}
    </div>
  )
}
