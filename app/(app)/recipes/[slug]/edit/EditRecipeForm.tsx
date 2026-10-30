'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { CATEGORY_ORDER } from '@/lib/list'
import type { GroceryCategory } from '@/types'

type Ing = { name: string; quantity: string; unit: string; category: GroceryCategory; searchTerm?: string }
type Initial = { id: string; name: string; slug: string; cook_time: number | null; prep_time: number | null; servings: number | null; ingredients: Ing[] | null; steps: string[] | null }

export default function EditRecipeForm({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [cookTime, setCookTime] = useState(initial.cook_time ?? 30)
  const [prepTime, setPrepTime] = useState(initial.prep_time ?? 10)
  const [servings, setServings] = useState(initial.servings ?? 4)
  const [ings, setIngs] = useState<Ing[]>((initial.ingredients ?? []).map((i) => ({ name: i.name ?? '', quantity: String(i.quantity ?? ''), unit: i.unit ?? '', category: i.category ?? 'Pantry & Dry Goods', searchTerm: i.searchTerm })))
  const [steps, setSteps] = useState<string[]>(initial.steps ?? [''])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const setIng = (n: number, patch: Partial<Ing>) => setIngs((xs) => xs.map((x, i) => (i === n ? { ...x, ...patch } : x)))

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await fetch('/api/recipes/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: initial.id, name, cookTime, prepTime, servings, ingredients: ings, steps }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      router.push(`/recipes/${j.slug}`); router.refresh()
    } catch (x) { setErr(x instanceof Error ? x.message : 'Could not save'); setBusy(false) }
  }
  const field = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
  return (
    <div className="min-h-screen bg-background">
      <form onSubmit={save} className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Link href={`/recipes/${initial.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to the recipe</Link>
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Edit your recipe</p>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={`${field} text-2xl font-heading font-bold py-3`} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['Prep (min)', prepTime, setPrepTime, 0], ['Cook (min)', cookTime, setCookTime, 1], ['Servings', servings, setServings, 1]].map(([l, v, set, min]) => (
            <label key={l as string} className="text-xs font-semibold text-muted-foreground">{l as string}
              <input type="number" min={min as number} value={v as number} onChange={(e) => (set as (n: number) => void)(Number(e.target.value))} className={`${field} mt-1`} />
            </label>
          ))}
        </div>
        <section>
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Ingredients</h2>
          <div className="space-y-2">
            {ings.map((i, n) => (
              <div key={n} className="grid grid-cols-[1fr_4rem_5rem_auto] sm:grid-cols-[1fr_4.5rem_6rem_10rem_auto] gap-2 items-center">
                <input value={i.name} onChange={(e) => setIng(n, { name: e.target.value })} placeholder="ingredient" className={field} />
                <input value={i.quantity} onChange={(e) => setIng(n, { quantity: e.target.value })} placeholder="qty" className={field} />
                <input value={i.unit} onChange={(e) => setIng(n, { unit: e.target.value })} placeholder="unit" className={field} />
                <select value={i.category} onChange={(e) => setIng(n, { category: e.target.value as GroceryCategory })} className={`${field} hidden sm:block`}>
                  {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" onClick={() => setIngs((xs) => xs.filter((_, k) => k !== n))} aria-label="Remove ingredient" className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setIngs((xs) => [...xs, { name: '', quantity: '1', unit: '', category: 'Pantry & Dry Goods' }])} className="mt-2 inline-flex items-center gap-1 text-sm text-primary font-semibold"><Plus className="w-4 h-4" /> Add ingredient</button>
        </section>
        <section>
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Steps</h2>
          <div className="space-y-2">
            {steps.map((s, n) => (
              <div key={n} className="flex gap-2 items-start">
                <span className="mt-2.5 w-6 h-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{n + 1}</span>
                <textarea value={s} onChange={(e) => setSteps((xs) => xs.map((x, k) => (k === n ? e.target.value : x)))} rows={2} className={field} />
                <button type="button" onClick={() => setSteps((xs) => xs.filter((_, k) => k !== n))} aria-label="Remove step" className="p-2 mt-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSteps((xs) => [...xs, ''])} className="mt-2 inline-flex items-center gap-1 text-sm text-primary font-semibold"><Plus className="w-4 h-4" /> Add step</button>
        </section>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex gap-3">
          <button disabled={busy} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save recipe'}</button>
          <Link href={`/recipes/${initial.slug}`} className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
