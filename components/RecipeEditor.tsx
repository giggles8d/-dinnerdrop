'use client'

import { Plus, X } from 'lucide-react'
import type { Meal, Ingredient } from '@/types'

const CATS: Ingredient['category'][] = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry & Dry Goods', 'Frozen', 'Bakery', 'Beverages']
const input = 'rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

/** Edit every part of a recipe: name, times, servings, each ingredient and each step. Controlled: onChange gets the whole meal. */
export default function RecipeEditor({ meal, onChange }: { meal: Meal; onChange: (m: Meal) => void }) {
  const set = (patch: Partial<Meal>) => onChange({ ...meal, ...patch })
  const setIng = (i: number, patch: Partial<Ingredient>) => set({ ingredients: meal.ingredients.map((g, j) => (j === i ? { ...g, ...patch, ...(patch.name ? { searchTerm: patch.name } : {}) } : g)) })
  const setStep = (i: number, v: string) => set({ steps: meal.steps.map((s, j) => (j === i ? v : s)) })

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Name</span>
          <input value={meal.name} onChange={(e) => set({ name: e.target.value.slice(0, 60) })} className={`${input} w-full font-semibold`} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Prep min</span>
          <input type="number" min={0} max={600} value={meal.prepTime} onChange={(e) => set({ prepTime: Math.max(0, Number(e.target.value) || 0) })} className={`${input} w-20`} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Cook min</span>
          <input type="number" min={0} max={900} value={meal.cookTime} onChange={(e) => set({ cookTime: Math.max(0, Number(e.target.value) || 0) })} className={`${input} w-20`} /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">Servings</span>
          <input type="number" min={1} max={20} value={meal.servings} onChange={(e) => set({ servings: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} className={`${input} w-20`} /></label>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1.5">Ingredients</p>
        <div className="space-y-1.5">
          {meal.ingredients.map((g, i) => (
            <div key={i} className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center">
              <input value={g.quantity} onChange={(e) => setIng(i, { quantity: e.target.value.slice(0, 12) })} placeholder="2" aria-label="Amount" className={`${input} w-16`} />
              <input value={g.unit} onChange={(e) => setIng(i, { unit: e.target.value.slice(0, 20) })} placeholder="box" aria-label="Unit" className={`${input} w-20`} />
              <input value={g.name} onChange={(e) => setIng(i, { name: e.target.value.slice(0, 60) })} placeholder="scalloped potatoes mix" aria-label="Ingredient" className={`${input} flex-1 min-w-[10rem]`} />
              <select value={g.category} onChange={(e) => setIng(i, { category: e.target.value as Ingredient['category'] })} aria-label="Grocery aisle" className={`${input} w-36 hidden sm:block`}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => set({ ingredients: meal.ingredients.filter((_, j) => j !== i) })} aria-label={`Remove ${g.name}`} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ ingredients: [...meal.ingredients, { name: '', quantity: '1', unit: '', category: 'Pantry & Dry Goods', searchTerm: '' }] })}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="w-3.5 h-3.5" />Add ingredient</button>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1.5">Steps</p>
        <ol className="space-y-1.5">
          {meal.steps.map((st, i) => (
            <li key={i} className="flex gap-1.5 items-start">
              <span className="mt-1.5 w-5 text-right text-xs text-muted-foreground">{i + 1}.</span>
              <textarea value={st} onChange={(e) => setStep(i, e.target.value.slice(0, 600))} rows={2} className={`${input} flex-1`} />
              <button type="button" onClick={() => set({ steps: meal.steps.filter((_, j) => j !== i) })} aria-label={`Remove step ${i + 1}`} className="p-1 mt-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => set({ steps: [...meal.steps, ''] })} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="w-3.5 h-3.5" />Add step</button>
      </div>
    </div>
  )
}
