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
                      {item.quantity} {item.unit}
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
