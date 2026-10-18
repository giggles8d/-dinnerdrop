'use client'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { getStoreSearchUrl } from '@/lib/affiliate-links'
import type { GroceryCategory, GroceryItem } from '@/types'

interface GroceryListProps {
  groceryList: Record<GroceryCategory, GroceryItem[]>
  store?: string
}

const CATEGORY_ORDER: GroceryCategory[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry & Dry Goods',
  'Frozen',
  'Bakery',
  'Beverages',
]

const CATEGORY_EMOJI: Record<GroceryCategory, string> = {
  'Produce': '🥦',
  'Meat & Seafood': '🥩',
  'Dairy & Eggs': '🥛',
  'Pantry & Dry Goods': '🫙',
  'Frozen': '❄️',
  'Bakery': '🍞',
  'Beverages': '🧃',
}


// Display helper: "0.625 lbs" -> "5/8 lb", "1 lbs" -> "1 lb", "2 cloves" stays.
const FRACTIONS: Array<[number, string]> = [
  [0.125, '\u215b'], [0.25, '\u00bc'], [0.333, '\u2153'], [0.375, '\u215c'], [0.5, '\u00bd'],
  [0.625, '\u215d'], [0.667, '\u2154'], [0.75, '\u00be'], [0.875, '\u215e'],
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
  // Pluralize count units when quantity > 1 ("2 cloves"), keep weight/volume units singular ("2 lb", "3 cup" -> "3 cups").
  let unitText = base
  if (!Number.isNaN(n) && n > 1) {
    if (COUNT_UNITS.has(base) || base === 'cup') unitText = base === 'bunch' ? 'bunches' : base === 'box' ? 'boxes' : `${base}s`
  }
  return `${qtyText} ${unitText}`.trim()
}

export default function GroceryList({ groceryList, store = '' }: GroceryListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggleItem(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((category) => {
        const items = groceryList[category]
        if (!items || items.length === 0) return null
        const checkedCount = items.filter((_, i) => checked.has(`${category}-${i}`)).length

        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-primary/20">
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_EMOJI[category]}</span>
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">
                  {category}
                </h3>
              </div>
              {checkedCount > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  {checkedCount}/{items.length}
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {items.map((item, i) => {
                const key = `${category}-${i}`
                const isChecked = checked.has(key)
                return (
                  <li
                    key={key}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isChecked ? 'bg-muted/50' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div
                      onClick={() => toggleItem(key)}
                      className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-primary border-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      onClick={() => toggleItem(key)}
                      className={`text-sm flex-1 transition-colors cursor-pointer ${
                        isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className={`text-xs font-medium transition-colors ${
                      isChecked ? 'text-muted-foreground/50' : 'text-muted-foreground'
                    }`}>
                      {formatQuantity(item.quantity, item.unit)}
                    </span>
                    {store && store !== 'Kroger' && item.searchTerm && (
                      <a
                        href={getStoreSearchUrl(store, item.searchTerm)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-1 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                        title={`Find at ${store}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
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
