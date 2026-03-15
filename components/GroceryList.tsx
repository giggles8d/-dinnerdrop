'use client'
import { useState } from 'react'
import type { GroceryCategory, GroceryItem } from '@/types'

interface GroceryListProps {
  groceryList: Record<GroceryCategory, GroceryItem[]>
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

export default function GroceryList({ groceryList }: GroceryListProps) {
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
                    onClick={() => toggleItem(key)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isChecked ? 'bg-muted/50' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-primary border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}>
                      {isChecked && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm flex-1 transition-colors ${
                      isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {item.name}
                    </span>
                    <span className={`text-xs font-medium transition-colors ${
                      isChecked ? 'text-muted-foreground/50' : 'text-muted-foreground'
                    }`}>
                      {item.quantity} {item.unit}
                    </span>
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
