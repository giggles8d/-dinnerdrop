'use client'

import { useState } from 'react'
import { MAX_PRODUCT_PREFS, type ProductPref } from '@/lib/product-prefs'

/**
 * Settings → Stores → "My products": "When a recipe needs … → buy …" rows (lib/product-prefs).
 * Changes go through the page's patch(), which saves settings like every other field.
 */
export default function ProductPrefsEditor({ value, onChange }: { value: ProductPref[]; onChange: (v: ProductPref[]) => void }) {
  const [when, setWhen] = useState('')
  const [buy, setBuy] = useState('')
  const canAdd = when.trim().length > 1 && buy.trim().length > 1 && value.length < MAX_PRODUCT_PREFS

  function add() {
    if (!canAdd) return
    onChange([...value, { when: when.trim(), buy: buy.trim() }])
    setWhen('')
    setBuy('')
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {value.map((p, i) => (
            <li key={`${p.when}-${i}`} className="flex items-start gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground">When a recipe needs <span className="font-medium text-foreground">{p.when}</span></p>
                <p>Buy <span className="font-semibold text-foreground">{p.buy}</span></p>
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground" aria-label={`Remove ${p.buy}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs text-muted-foreground">
          When a recipe needs
          <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="cream of chicken, cream of mushroom" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="text-xs text-muted-foreground">
          Buy
          <input value={buy} onChange={(e) => setBuy(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Great Value Gluten Free Cream of Chicken Soup" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <button type="button" onClick={add} disabled={!canAdd} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          Add
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Separate a few words with commas to cover them all. Your product shows on the grocery list and goes to Walmart, Instacart and Kroger.</p>
    </div>
  )
}
