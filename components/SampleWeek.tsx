'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock3, Users, ShoppingCart } from 'lucide-react'
import { SAMPLE_WEEKS, sampleGroceryList, sampleWeekTotal } from '@/lib/sample-weeks'
import { formatQuantity } from '@/components/GroceryList'

interface Props {
  /** Restrict to these week keys (landing pages); omit for all. */
  keys?: string[]
  /** Initially selected key */
  initial?: string
  /** Hide the toggle row (single-week landing pages) */
  hideToggle?: boolean
  ctaHref?: string
}

export default function SampleWeek({ keys, initial, hideToggle, ctaHref = '/signup' }: Props) {
  const weeks = keys ? SAMPLE_WEEKS.filter((w) => keys.includes(w.key)) : SAMPLE_WEEKS
  const [active, setActive] = useState(initial && weeks.some((w) => w.key === initial) ? initial : weeks[0].key)
  const [showList, setShowList] = useState(false)
  const week = weeks.find((w) => w.key === active) ?? weeks[0]
  const total = sampleWeekTotal(week)
  const list = sampleGroceryList(week)
  const itemCount = Object.values(list).reduce((n, items) => n + items.length, 0)

  return (
    <div>
      {!hideToggle && weeks.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {weeks.map((w) => (
            <button
              key={w.key}
              onClick={() => { setActive(w.key); setShowList(false) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                w.key === active ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground mb-5">
        <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" />{week.household}</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 className="w-4 h-4" />{week.cookTime}</span>
        <span className="inline-flex items-center gap-1.5"><ShoppingCart className="w-4 h-4" />Budget {week.budget}{week.dietary !== 'none' ? ` · ${week.dietary}` : ''}</span>
      </div>
      <p className="text-foreground font-medium mb-5">{week.tagline}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {week.meals.map((m) => (
          <div key={m.day} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">{m.day}</p>
            <h3 className="font-heading font-semibold text-foreground leading-snug mb-2">{m.name}</h3>
            <p className="text-xs text-muted-foreground">{m.prepTime + m.cookTime} min total &middot; serves {m.servings}</p>
            <p className="text-xs text-muted-foreground mt-1">${m.estimatedCost.toFixed(2)} &middot; {m.ingredients.length} ingredients</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-2xl bg-foreground text-primary-foreground px-5 py-4">
        <div>
          <p className="text-sm text-primary-foreground/60">Estimated groceries for all five dinners</p>
          <p className="text-2xl font-heading font-bold">${total.toFixed(2)} <span className="text-sm font-normal text-primary-foreground/60">&middot; {itemCount} items, one list</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowList((v) => !v)} className="px-4 py-2 rounded-lg border border-primary-foreground/30 text-sm font-semibold hover:bg-primary-foreground/10 transition-colors">
            {showList ? 'Hide the list' : 'See the grocery list'}
          </button>
          <Link href={ctaHref} className="px-4 py-2 rounded-lg bg-accent text-foreground text-sm font-bold hover:bg-accent/90 transition-colors">
            Plan my week free &rarr;
          </Link>
        </div>
      </div>

      {showList && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 rounded-2xl border border-border bg-white p-5">
          {Object.entries(list).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">{cat}</p>
              <ul className="space-y-1 text-sm text-foreground">
                {items.map((it) => (
                  <li key={it.name} className="flex justify-between gap-3"><span>{it.name}</span><span className="text-muted-foreground">{formatQuantity(it.quantity, it.unit)}</span></li>
                ))}
              </ul>
            </div>
          ))}
          <p className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground">
            Example week. Prices are estimates at typical US grocery prices; store prices and package sizes set the final number. Pantry staples like salt, pepper, and cooking oil are assumed.
          </p>
        </div>
      )}
    </div>
  )
}
