'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, Link2, FileText, Camera, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import MealCardImage from '@/components/MealCardImage'
import type { Meal } from '@/types'

interface RecipeRow {
  id: string
  name: string
  slug: string
  cuisine: string | null
  protein: string | null
  cook_time: number | null
  prep_time: number | null
  servings: number | null
  estimated_cost: number | null
  ingredients: Meal['ingredients']
  steps: string[]
  tags: string[]
  image_url: string | null
  nutrition: Meal['nutrition'] | null
  source: 'generated' | 'user'
  created_by: string | null
  kept_count: number
  times_planned: number
}

const TIME_FILTERS = [{ v: 0, l: 'Any time' }, { v: 20, l: '≤ 20 min' }, { v: 30, l: '≤ 30 min' }, { v: 45, l: '≤ 45 min' }]
const TAGS = ['quick', 'kid-favorite', 'sheet-pan', 'one-pot', 'air-fryer', 'slow-cooker', 'instant-pot', 'leftover-friendly', 'budget', 'high-protein', 'vegetarian']

export default function RecipesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<RecipeRow[]>([])
  const [favNames, setFavNames] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [maxTime, setMaxTime] = useState(0)
  const [tag, setTag] = useState('')
  const [mine, setMine] = useState(false)
  const [tab, setTab] = useState<'link' | 'text' | 'photo'>('link')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    const [{ data }, favs] = await Promise.all([
      supabase.from('recipes').select('id, name, slug, cuisine, protein, cook_time, prep_time, servings, estimated_cost, ingredients, steps, tags, image_url, nutrition, source, created_by, kept_count, times_planned').order('kept_count', { ascending: false }).order('times_planned', { ascending: false }).limit(400),
      user ? supabase.from('favorites').select('meal_name').eq('user_id', user.id) : Promise.resolve({ data: [] as Array<{ meal_name: string }> }),
    ])
    setRows((data as RecipeRow[]) ?? [])
    setFavNames(new Set((favs.data ?? []).map((f: { meal_name: string }) => f.meal_name)))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    if (mine && r.created_by !== userId) return false
    if (maxTime && (r.cook_time ?? 0) + (r.prep_time ?? 0) > maxTime) return false
    if (tag && !(r.tags ?? []).includes(tag)) return false
    if (q) {
      const hay = `${r.name} ${r.cuisine ?? ''} ${r.protein ?? ''} ${(r.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  function toMeal(r: RecipeRow): Meal {
    return {
      day: 'Saved', name: r.name, cuisine: r.cuisine ?? undefined, protein: r.protein ?? undefined,
      cookTime: r.cook_time ?? 30, prepTime: r.prep_time ?? 10, servings: r.servings ?? 4, estimatedCost: Number(r.estimated_cost ?? 0),
      ingredients: r.ingredients ?? [], steps: r.steps ?? [], tags: r.tags ?? [], nutrition: r.nutrition ?? undefined, imageUrl: r.image_url ?? undefined, recipeId: r.id, fromLibrary: true,
    }
  }

  async function toggleFavorite(r: RecipeRow) {
    if (!userId) return
    if (favNames.has(r.name)) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('meal_name', r.name)
      setFavNames((s) => { const n = new Set(s); n.delete(r.name); return n })
    } else {
      await supabase.from('favorites').insert({ user_id: userId, meal_name: r.name, meal_data: toMeal(r) })
      setFavNames((s) => new Set(s).add(r.name))
    }
  }

  async function submitImport(payload: Record<string, string>) {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/recipes/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setMsg(`Saved "${data.meal.name}" to your recipes and favorites. It'll rotate into your plans.`)
      setUrl(''); setText('')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 6 * 1024 * 1024) { setMsg('Photo is too large — keep it under 6 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => submitImport({ image: String(reader.result) })
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Recipe library</p>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dinners families actually kept</h1>
          <p className="text-muted-foreground mt-1">Every dinner the planner has made, ranked by how often families kept it — plus your own. Heart one and it rotates into your weeks.</p>
        </div>

        {/* Add your own */}
        <div className="rounded-2xl border border-border bg-white p-5 mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-heading font-semibold text-foreground mr-2">Add your own recipe</h2>
            {([['link', Link2, 'Paste a link'], ['text', FileText, 'Paste the text'], ['photo', Camera, 'Snap a photo']] as const).map(([k, Icon, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${tab === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:border-primary/40'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          {tab === 'link' && (
            <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) submitImport({ url: url.trim() }) }} className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… any recipe page" className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              <button disabled={busy || !url.trim()} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? 'Reading…' : 'Add'}</button>
            </form>
          )}
          {tab === 'text' && (
            <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) submitImport({ text: text.trim() }) }} className="space-y-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Name, ingredients, steps — however you have it written down." className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              <button disabled={busy || text.trim().length < 10} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? 'Reading…' : 'Add recipe'}</button>
            </form>
          )}
          {tab === 'photo' && (
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? 'Reading the photo…' : 'Choose or take a photo'}</button>
              <span className="text-xs text-muted-foreground">A recipe card, cookbook page, or screenshot works.</span>
            </div>
          )}
          {msg && <p className="text-sm mt-3 text-foreground">{msg}</p>}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dinners or ingredients" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm" />
          </div>
          <select value={maxTime} onChange={(e) => setMaxTime(Number(e.target.value))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            {TIME_FILTERS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Any style</option>
            {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[#1a5c38]" /> My recipes</label>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-72 rounded-xl border border-border bg-card animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing here yet{mine ? ' — add a recipe above' : ''}. Dinners show up as families plan them.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden group hover:shadow-md transition-shadow">
                <Link href={`/recipes/${r.slug}`} className="block">
                  <MealCardImage mealName={r.name} dayLabel={r.created_by === userId ? 'Yours' : ''} imageUrl={r.image_url ?? undefined} />
                </Link>
                <div className="relative p-4 space-y-2">
                  <button onClick={() => toggleFavorite(r)} className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 hover:bg-background" aria-label="Favorite">
                    <Heart className={`w-4 h-4 ${favNames.has(r.name) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  </button>
                  <Link href={`/recipes/${r.slug}`} className="block pr-8">
                    <h3 className="font-heading font-semibold leading-tight text-card-foreground group-hover:text-primary">{r.name}</h3>
                  </Link>
                  <div className="text-xs text-muted-foreground">{(r.cook_time ?? 0) + (r.prep_time ?? 0)} min · {r.servings ?? 4} servings{r.kept_count > 0 ? ` · kept by ${r.kept_count} ${r.kept_count === 1 ? 'family' : 'families'}` : ''}</div>
                  {(r.tags ?? []).length > 0 && <div className="flex flex-wrap gap-1">{(r.tags ?? []).slice(0, 3).map((t) => <span key={t} className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">{t}</span>)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
