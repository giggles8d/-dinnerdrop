'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, ImageIcon, Loader2, ShoppingCart, Check } from 'lucide-react'
import MealCardImage from '@/components/MealCardImage'
import { timeLabel } from '@/lib/plan'
import type { Meal } from '@/types'

interface TonightMeal extends Meal { have: string[]; missing: string[]; coverage: number; source: 'library' | 'ai' }

/** Phone photos are several MB; send a 1280px JPEG (plenty for reading labels and produce). */
async function shrink(file: File): Promise<{ base64: string; mediaType: string }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url })
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { base64: canvas.toDataURL('image/jpeg', 0.82).split(',')[1], mediaType: 'image/jpeg' }
  } finally { URL.revokeObjectURL(url) }
}

export default function TonightPage() {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState('')
  const [usePantry, setUsePantry] = useState(true)
  const [busy, setBusy] = useState<'photo' | 'text' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<string[] | null>(null)
  const [meals, setMeals] = useState<TonightMeal[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [pantryCount, setPantryCount] = useState(0)
  const [added, setAdded] = useState<Record<string, boolean>>({})

  async function run(payload: Record<string, unknown>, kind: 'photo' | 'text') {
    setBusy(kind); setError(null); setNote(null)
    try {
      const r = await fetch('/api/tonight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, usePantry }) })
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Something went wrong — try again.'); return }
      setItems(j.items ?? []); setPantryCount(j.pantryCount ?? 0); setMeals(j.meals ?? []); setNote(j.note ?? null); setAdded({})
      if (j.items?.length && !typed) setTyped((j.items as string[]).join(', '))
    } catch { setError('Something went wrong — try again.') } finally { setBusy(null) }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { const img = await shrink(file); setTyped(''); await run({ imageBase64: img.base64, mediaType: img.mediaType }, 'photo') }
    catch { setError("Couldn't open that photo. Try another, or type what you have.") }
  }

  async function addMissing(m: TonightMeal) {
    const r = await fetch('/api/tonight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', items: m.missing }) })
    if (r.ok) setAdded((a) => ({ ...a, [m.name]: true }))
  }

  function open(m: TonightMeal) {
    try {
      localStorage.setItem(`meal-${m.day}`, JSON.stringify(m))
      localStorage.setItem(`meal-${m.day}-at`, String(Date.now()))
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to meals
        </Link>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Dinner tonight</p>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">What can I make tonight?</h1>
        <p className="text-muted-foreground mb-6">Snap your fridge or pantry, and you&apos;ll get dinners you can make with what you already have — plus what&apos;s missing, if anything.</p>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {busy === 'photo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} {busy === 'photo' ? 'Looking in your fridge…' : 'Take a photo'}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-white text-foreground font-semibold disabled:opacity-50">
              <ImageIcon className="w-4 h-4" /> Choose a photo
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Or type what you have</label>
            <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={2} placeholder="chicken thighs, broccoli, rice, cheddar, eggs" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={usePantry} onChange={(e) => setUsePantry(e.target.checked)} /> Include what&apos;s in my <Link href="/pantry" className="underline">pantry</Link>
              </label>
              <button type="button" onClick={() => run({ text: typed }, 'text')} disabled={!!busy || !typed.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary text-sm font-semibold disabled:opacity-40">
                {busy === 'text' && <Loader2 className="w-4 h-4 animate-spin" />} Find dinners
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        {items && (
          <div className="mt-8">
            {items.length > 0 && (
              <p className="text-sm text-muted-foreground mb-4"><span className="font-medium text-foreground">Working with:</span> {items.join(', ')}{pantryCount > 0 ? `, plus ${pantryCount} thing${pantryCount === 1 ? '' : 's'} from your pantry` : ''}. Missed something? Add it in the box above and tap Find dinners.</p>
            )}
            {note && <p className="text-sm text-muted-foreground mb-4">{note}</p>}
            {items.length > 0 && !meals.length && !note && (
              <p className="text-sm text-muted-foreground">Nothing fits that combination yet. Add a few more things you have and try again.</p>
            )}
            <div className="space-y-4">
              {meals.map((m) => (
                <div key={m.name} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <Link href={`/recipe/${m.day}`} onClick={() => open(m)} className="block">
                    <MealCardImage mealName={m.name} dayLabel={m.missing.length ? '' : 'You have it all'} imageUrl={m.imageUrl} />
                  </Link>
                  <div className="p-4">
                    <Link href={`/recipe/${m.day}`} onClick={() => open(m)} className="font-heading font-semibold text-lg text-foreground hover:underline">{m.name}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeLabel(m)}{m.nutrition ? ` · ${m.nutrition.calories} cal${typeof m.nutrition.carbs === 'number' ? ` · ${m.nutrition.carbs}g carbs` : ''}` : ''}{m.source === 'ai' ? ' · written for what you have' : ''}
                    </p>
                    <p className="text-sm mt-2">
                      {m.missing.length
                        ? <><span className="text-foreground font-medium">You&apos;re missing {m.missing.length}:</span> <span className="text-muted-foreground">{m.missing.join(', ')}</span></>
                        : <span className="text-primary font-medium">You have everything (beyond salt, oil and spices).</span>}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link href={`/recipe/${m.day}?cook=1`} onClick={() => open(m)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Cook this tonight</Link>
                      {m.missing.length > 0 && (
                        <button type="button" onClick={() => addMissing(m)} disabled={added[m.name]} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground disabled:opacity-60">
                          {added[m.name] ? <><Check className="w-4 h-4" /> On your list</> : <><ShoppingCart className="w-4 h-4" /> Add missing to my list</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
