'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, Link2, FileText, Camera, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import MealCardImage from '@/components/MealCardImage'
import type { Meal } from '@/types'
import { FULL_COLUMNS, toLibRow, applyFilters, filtersFromQuery, filtersToQuery, activeCount, EMPTY, PROTEINS, CUISINES, STYLES, TIMES, SORTS, type LibRow, type Filters, type SortKey } from '@/lib/recipe-filters'

const PAGE = 48

/** Client half of /recipes. The server sends a slim index of the whole library; filters and sorting run here instantly. */
export default function RecipesClient({ initialRows = [] }: { initialRows?: LibRow[] }) {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<LibRow[]>(initialRows)
  const [favNames, setFavNames] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(initialRows.length === 0)
  const [f, setF] = useState<Filters>(EMPTY)
  const urlRead = useRef(false)
  const [shown, setShown] = useState(PAGE)
  const [moreOpen, setMoreOpen] = useState(false)
  const [tab, setTab] = useState<'link' | 'text' | 'photo'>('link')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    const [pub, own, favs] = await Promise.all([
      // Only when the server couldn't send the index.
      initialRows.length ? Promise.resolve({ data: null }) : supabase.from('recipes').select(FULL_COLUMNS).eq('is_public', true).order('kept_count', { ascending: false }).limit(2000),
      // The family's own recipes (private ones aren't in the public index).
      user ? supabase.from('recipes').select(FULL_COLUMNS).eq('created_by', user.id).eq('source', 'user') : Promise.resolve({ data: null }),
      user ? supabase.from('favorites').select('meal_name').eq('user_id', user.id) : Promise.resolve({ data: [] as Array<{ meal_name: string }> }),
    ])
    setRows((cur) => {
      const base = pub.data ? (pub.data as Parameters<typeof toLibRow>[0][]).map(toLibRow) : cur
      const mineRows = own.data ? (own.data as Parameters<typeof toLibRow>[0][]).map(toLibRow) : []
      const seen = new Set(mineRows.map((r) => r.id))
      return [...mineRows, ...base.filter((r) => !seen.has(r.id))]
    })
    setFavNames(new Set((favs.data ?? []).map((x: { meal_name: string }) => x.meal_name)))
    setLoading(false)
  }, [supabase, initialRows.length])

  useEffect(() => { load() }, [load])

  // Keep the URL in step with the filters so a filtered view can be shared or bookmarked.
  // (Read after mount, not via useSearchParams, so the server still renders the full library for Google.)
  useEffect(() => {
    if (!urlRead.current) {
      urlRead.current = true
      const fromUrl = filtersFromQuery(new URLSearchParams(window.location.search))
      if (activeCount(fromUrl) || fromUrl.sort !== 'kept') { setF(fromUrl); return }
    }
    setShown(PAGE)
    const qs = filtersToQuery(f)
    if (window.location.search !== qs) window.history.replaceState(null, '', `/recipes${qs}`)
  }, [f])

  const filtered = useMemo(() => applyFilters(rows, f, { userId, favNames }), [rows, f, userId, favNames])
  const n = activeCount(f)
  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }))
  const toggle = <K extends 'proteins' | 'cuisines' | 'styles'>(k: K, v: Filters[K][number]) =>
    setF((cur) => { const arr = cur[k] as string[]; return { ...cur, [k]: arr.includes(v as string) ? arr.filter((x) => x !== v) : [...arr, v] } })

  function toMeal(r: LibRow): Meal {
    return {
      day: 'Saved', name: r.name, cuisine: r.cuisine || undefined, protein: r.protein || undefined,
      cookTime: r.time || 30, prepTime: 0, servings: r.servings, estimatedCost: r.cost,
      ingredients: [], steps: [], tags: r.tags, imageUrl: r.image_url ?? undefined, recipeId: r.id, fromLibrary: true,
    }
  }

  async function toggleFavorite(r: LibRow) {
    if (!userId) return
    if (favNames.has(r.name)) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('meal_name', r.name)
      setFavNames((x) => { const m = new Set(x); m.delete(r.name); return m })
    } else {
      // Favorites store the full dinner so it can rotate into plans.
      const { data } = await supabase.from('recipes').select(FULL_COLUMNS).eq('id', r.id).maybeSingle()
      const full = data as Parameters<typeof toLibRow>[0] | null
      const meal: Meal = full ? { ...toMeal(r), cookTime: full.cook_time ?? 30, prepTime: full.prep_time ?? 10, ingredients: full.ingredients ?? [], steps: full.steps ?? [] } : toMeal(r)
      await supabase.from('favorites').insert({ user_id: userId, meal_name: r.name, meal_data: meal })
      setFavNames((x) => new Set(x).add(r.name))
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
          <p className="text-muted-foreground mt-1">Every dinner the planner has made, ranked by how often families kept it — plus your own. Heart one and it rotates into your weeks; every one comes with a grocery list for your Instacart cart.</p>
        </div>

        {/* Add your own (signed in) / invitation (signed out) */}
        {!userId && !loading && (
          <div className="rounded-2xl border border-primary/20 bg-secondary/60 p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-foreground">Every recipe here comes with a grocery list that lands in your Instacart cart in one tap. Free, no card.</p>
            <Link href="/signup?redirect=%2Frecipes" className="inline-flex justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 whitespace-nowrap">Start free &rarr;</Link>
          </div>
        )}
        {userId && <div className="rounded-2xl border border-border bg-white p-5 mb-8">
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
        </div>}

        {/* Filters */}
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search dinners or ingredients" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm" />
            </div>
            <select value={f.time} onChange={(e) => set({ time: Number(e.target.value) })} aria-label="Total time" className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {TIMES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <select value={f.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} aria-label="Sort" className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {SORTS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Protein">
            {PROTEINS.map((p) => (
              <button key={p.v} onClick={() => toggle('proteins', p.v)} aria-pressed={f.proteins.includes(p.v)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${f.proteins.includes(p.v) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:border-primary/40'}`}>{p.l}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cuisine">
            {CUISINES.map((c) => (
              <button key={c.v} onClick={() => toggle('cuisines', c.v)} aria-pressed={f.cuisines.includes(c.v)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${f.cuisines.includes(c.v) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:border-primary/40'}`}>{c.l}</button>
            ))}
            <button onClick={() => setMoreOpen((o) => !o)} className="rounded-full border px-3 py-1.5 text-sm transition-colors border-dashed border-border text-muted-foreground hover:text-foreground">{moreOpen ? 'Fewer filters' : 'More filters'}{f.styles.length || f.without ? ` (${f.styles.length + (f.without ? 1 : 0)})` : ''}</button>
          </div>
          {moreOpen && (
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Style">
                {STYLES.map((t) => (
                  <button key={t.v} onClick={() => toggle('styles', t.v)} aria-pressed={f.styles.includes(t.v)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${f.styles.includes(t.v) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:border-primary/40'}`}>{t.l}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="without" className="text-sm text-muted-foreground">Leave out:</label>
                <input id="without" value={f.without} onChange={(e) => set({ without: e.target.value })} placeholder="e.g. mushrooms, olives" className="flex-1 min-w-[180px] rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
              </div>
              {userId && (
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={f.favs} onChange={(e) => set({ favs: e.target.checked })} className="accent-[#1a5c38]" /> My favorites</label>
                  <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={f.mine} onChange={(e) => set({ mine: e.target.checked })} className="accent-[#1a5c38]" /> Recipes I added</label>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{loading ? 'Loading…' : `${filtered.length} dinner${filtered.length === 1 ? '' : 's'}`}</span>
            {n > 0 && <button onClick={() => setF({ ...EMPTY, sort: f.sort })} className="text-primary hover:underline">Clear filters</button>}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-72 rounded-xl border border-border bg-card animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">{n > 0 ? 'No dinners match all of those — try removing a filter.' : f.mine ? 'Nothing here yet — add a recipe above.' : 'Nothing here yet. Dinners show up as families plan them.'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.slice(0, shown).map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden group hover:shadow-md transition-shadow">
                <Link href={`/recipes/${r.slug}`} className="block">
                  <MealCardImage mealName={r.name} dayLabel={r.source === 'user' && r.created_by === userId ? 'Yours' : ''} imageUrl={r.image_url ?? undefined} />
                </Link>
                <div className="relative p-4 space-y-2">
                  <button onClick={() => (userId ? toggleFavorite(r) : (window.location.href = `/signup?redirect=${encodeURIComponent('/recipes/' + r.slug)}`))} className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 hover:bg-background" aria-label="Favorite">
                    <Heart className={`w-4 h-4 ${favNames.has(r.name) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  </button>
                  <Link href={`/recipes/${r.slug}`} className="block pr-8">
                    <h3 className="font-heading font-semibold leading-tight text-card-foreground group-hover:text-primary">{r.name}</h3>
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.time} min · {r.servings} servings · 🍳 {r.cook}{r.kept > 0 ? ` · kept by ${r.kept} ${r.kept === 1 ? 'family' : 'families'}` : ''}</div>
                  {r.safe && <div className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Safe bet for the picky one:</span> {r.safe}</div>}
                  {r.tags.length > 0 && <div className="flex flex-wrap gap-1">{r.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">{t}</span>)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filtered.length > shown && (
          <div className="mt-8 text-center">
            <button onClick={() => setShown((x) => x + PAGE)} className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Show more ({filtered.length - shown} left)</button>
          </div>
        )}
      </div>
    </div>
  )
}
