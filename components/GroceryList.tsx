'use client'
import { useState } from 'react'
import { Plus, X, Minus, Info } from 'lucide-react'
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
  /** Change how much to buy ("2 bags of Cheetos"). Tap the quantity to show − / +. */
  onChangeQuantity?: (item: ListItem, quantity: string) => void
  onAdd: (name: string, category?: GroceryCategory) => Promise<void> | void
  /** When this week's flyer is loaded: the sale entry matching a list line, for the 🏷️ tag. */
  saleFor?: (name: string) => SaleItem | null
  /** Split orders: which store a line is assigned to, and a tap to move it. */
  storeFor?: (item: ListItem) => string | null
  onMoveStore?: (item: ListItem) => void
  /** Tap ⓘ on a line: which of this week's dinners use it, and what to buy ("1 × 32 oz carton"). */
  detailFor?: (item: ListItem) => { usedIn: string[]; buy: string | null }
}

const SOURCE_LABEL: Partial<Record<ListItem['source'], string>> = {
  manual: 'added', sms: 'texted', staples: 'staple', extra: 'basics',
}

const WEIGHT_UNITS = new Set(['lb', 'lbs', 'pound', 'pounds', 'kg', 'oz', 'ounce', 'ounces'])
function stepFor(unit: string | null): number { return WEIGHT_UNITS.has((unit ?? '').toLowerCase()) ? 0.5 : 1 }

export default function GroceryList({ items, onToggleChecked, onToggleHave, onRemove, onAdd, onChangeQuantity, saleFor, storeFor, onMoveStore, detailFor }: GroceryListProps) {
  const [qtyEdit, setQtyEdit] = useState<string | null>(null)
  const [openInfo, setOpenInfo] = useState<string | null>(null)
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
                const info = openInfo === item.id && detailFor ? detailFor(item) : null
                return (
                  <li key={item.id} className={`rounded-lg transition-colors ${muted ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                  <div className="flex items-center gap-3 px-3 py-2.5">
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
                    {(item.quantity || onChangeQuantity) && (() => {
                      const n = Number(item.quantity); const num = Number.isFinite(n) && item.quantity !== '' ? n : 1
                      const step = stepFor(item.unit); const editing = qtyEdit === item.id && !!onChangeQuantity && !muted
                      const set = (v: number) => onChangeQuantity?.(item, String(Math.round(Math.max(step, v) * 100) / 100))
                      return (
                        <span className="flex items-center gap-1 print:gap-0">
                          {editing && <button type="button" onClick={() => set(num - step)} disabled={num <= step} aria-label="Less" className="print:hidden w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 disabled:opacity-30"><Minus className="w-3 h-3" /></button>}
                          <button type="button" onClick={() => onChangeQuantity && !muted && setQtyEdit(editing ? null : item.id)} title={onChangeQuantity ? 'Tap to change how many' : undefined}
                            className={`text-xs font-medium rounded-md px-1.5 py-0.5 ${muted ? 'text-muted-foreground/50' : 'text-muted-foreground'} ${editing ? 'bg-primary/10 text-primary' : onChangeQuantity && !muted ? 'hover:bg-muted' : ''}`}>
                            {item.quantity ? formatQuantity(item.quantity, item.unit ?? '') : '1'}
                          </button>
                          {editing && <button type="button" onClick={() => set(num + step)} aria-label="More" className="print:hidden w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary/50"><Plus className="w-3 h-3" /></button>}
                        </span>
                      )
                    })()}
                    {storeFor && !muted && (() => { const st = storeFor(item); return st ? <button type="button" onClick={() => onMoveStore?.(item)} title="Tap to move to the other store" className="print:hidden text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground font-semibold whitespace-nowrap">{st}</button> : null })()}
                    <button
                      type="button"
                      onClick={() => onToggleHave(item)}
                      title={item.have ? 'Need it after all' : 'Already have it — skip in the cart'}
                      className={`print:hidden text-[11px] px-2 py-0.5 rounded-full border transition-colors ${item.have ? 'bg-secondary text-primary border-primary/30' : 'text-muted-foreground border-border hover:border-primary/40'}`}
                    >
                      {item.have ? 'have it' : 'have?'}
                    </button>
                    {detailFor && (
                      <button type="button" onClick={() => setOpenInfo(openInfo === item.id ? null : item.id)} aria-label="Which dinners use this" aria-expanded={openInfo === item.id}
                        title="Which dinners use this, and what to buy"
                        className={`print:hidden ${openInfo === item.id ? 'text-primary' : 'text-muted-foreground/60 hover:text-primary'}`}>
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.source !== 'plan' && (
                      <button type="button" onClick={() => onRemove(item)} aria-label="Remove" className="print:hidden text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {info && (
                    <div className="px-3 pb-2.5 pl-11 text-xs text-muted-foreground space-y-0.5 print:hidden">
                      <p><span className="font-semibold text-foreground">For:</span> {info.usedIn.length ? info.usedIn.join(' · ') : item.source === 'plan' ? 'this week’s dinners' : 'you added this one'}</p>
                      {info.buy && <p><span className="font-semibold text-foreground">Buy:</span> {info.buy}</p>}
                      {info.usedIn.length >= 2 && <p className="text-emerald-700">🌿 Shared by {info.usedIn.length} dinners — the whole package gets used.</p>}
                    </div>
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
