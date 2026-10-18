'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CATEGORY_ORDER, CATEGORY_EMOJI, type ListItem } from '@/lib/list'
import type { GroceryCategory } from '@/types'
import type { SaleItem } from '@/lib/sales-shared'

// Display helper: "0.625 lbs" -> "5/8 lb", "1 lbs" -> "1 lb", "2 cloves" stays.
const FRACTIONS: Array<[number, string]> = [
  [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'], [0.5, '½'],
  [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
]
const PLURAL_TO_SINGULAR: Record<string, string> = {
  lbs: 'lb', pounds: 'lb', pound: 'lb', ounces: 'oz', ounce: 'oz', cups: 'cup', tablespoons: 'tbsp', tablespoon: 'tbsp',
  teaspoons: 'tsp', teaspoon: 'tsp', cloves: 'clove', cans: 'can', jars: 'jar', packages: 'package', bunches: 'bunch', heads: 'head',
}
const COUNT_UNITS = new Set(['clove', 'can', 'jar', 'package', 'bunch', 'head', 'whole', 'piece', 'bag', 'box', 'bottle', 'loaf', 'dozen'])

export function formatQuantity(quantity: string | number, unit: string): string {
  const raw = String(quantity ?? '').trim()
  const n = Number(raw)
  const u = (unit ?? '').trim().toLowerCase()
  const base = PLURAL_TO_SINGULAR[u] ?? u
  let qtyText = raw
  if (!Number.isNaN(n) && raw !== '') {
    const whole = Math.floor(n)
    const frac = n - whole
    let fracText = ''
    if (frac > 0.05) {
      const match = FRACTIONS.reduce((best, cur) => (Math.abs(cur[0] - frac) < Math.abs(best[0] - frac) ? cur : best))
      fracText = Math.abs(match[0] - frac) < 0.07 ? match[1] : ''
    }
    if (fracText) qtyText = whole > 0 ? `${whole}${fracText}` : fracText
    else qtyText = String(Math.round(n * 100) / 100)
  }
  let unitText = base === 'whole' ? '' : base
  if (!Number.isNaN(n) && n > 1 && unitText) {
    if (COUNT_UNITS.has(base) || base === 'cup') unitText = base === 'bunch' ? 'bunches' : base === 'box' ? 'boxes' : `${base}s`
  }
  return `${qtyText} ${unitText}`.trim()
}

interface GroceryListProps {
  items: ListItem[]
  onToggleChecked: (item: ListItem) => void
  onToggleHave: (item: ListItem) => void
  onRemove: (item: ListItem) => void
  onAdd: (name: string, category?: GroceryCategory) => Promise<void> | void
  /** When this week's flyer is loaded: the sale entry matching a list line, for the 🏷️ tag. */
  saleFor?: (name: string) => SaleItem | null
}

const SOURCE_LABEL: Partial<Record<ListItem['source'], string>> = {
  manual: 'added', sms: 'texted', staples: 'staple', extra: 'basics',
}

export default function GroceryList({ items, onToggleChecked, onToggleHave, onRemove, onAdd, saleFor }: GroceryListProps) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const name = draft.trim()
    if (!name) return
    setAdding(true)
    try { await onAdd(name) } finally { setAdding(false); setDraft('') }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="flex gap-2 print:hidden">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add anything — 2 gallons milk, paper towels, snacks for the game…"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" disabled={adding || !draft.trim()} className="inline-flex items-center gap-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {CATEGORY_ORDER.map((category) => {
        const rows = items.filter((i) => i.category === category)
        if (!rows.length) return null
        const need = rows.filter((r) => !r.have)
        const done = need.filter((r) => r.checked).length
        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-primary/20">
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_EMOJI[category]}</span>
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">{category}</h3>
              </div>
              {done > 0 && <span className="text-xs font-medium text-muted-foreground">{done}/{need.length}</span>}
            </div>
            <ul className="space-y-1">
              {rows.map((item) => {
                const muted = item.checked || item.have
                return (
                  <li key={item.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${muted ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                    <button
                      type="button"
                      onClick={() => onToggleChecked(item)}
                      aria-label={item.checked ? 'Mark not bought' : 'Mark bought'}
                      className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.checked ? 'bg-primary border-primary' : 'border-border hover:border-primary/50'}`}
                    >
                      {item.checked && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span onClick={() => onToggleChecked(item)} className={`text-sm flex-1 cursor-pointer transition-colors ${muted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.name}
                      {SOURCE_LABEL[item.source] && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/70 no-underline">{SOURCE_LABEL[item.source]}{item.added_by ? ` · ${item.added_by}` : ''}</span>}
                      {(() => { const sale = saleFor?.(item.name); return sale ? <span className="ml-2 text-[10px] font-semibold text-primary no-underline" title={sale.note ?? ''}>🏷️ {sale.price}</span> : null })()}
                    </span>
                    {item.quantity && (
                      <span className={`text-xs font-medium ${muted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                        {formatQuantity(item.quantity, item.unit ?? '')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleHave(item)}
                      title={item.have ? 'Need it after all' : 'Already have it — skip in the cart'}
                      className={`print:hidden text-[11px] px-2 py-0.5 rounded-full border transition-colors ${item.have ? 'bg-secondary text-primary border-primary/30' : 'text-muted-foreground border-border hover:border-primary/40'}`}
                    >
                      {item.have ? 'have it' : 'have?'}
                    </button>
                    {item.source !== 'plan' && (
                      <button type="button" onClick={() => onRemove(item)} aria-label="Remove" className="print:hidden text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
