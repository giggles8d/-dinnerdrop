'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import MealCardImage from '@/components/MealCardImage'
import ConversionTracker from '@/components/ConversionTracker'
import { recordMealSignal } from '@/lib/taste-profile'
import { attachLibraryImages } from '@/lib/library-images'
import type { Meal } from '@/types'

interface FavoriteRow {
  id: string
  meal_name: string
  meal_data: Meal
  created_at: string
}

function getFavMealId(fav: FavoriteRow) {
  return `fav-${fav.id.slice(0, 8)}`
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const loadFavoritesRef = useRef<null | (() => Promise<void>)>(null)
  const supabase = createClient()
  // New signups from /mealime land here with ?new=1 — fire the same ad signup conversion as /dashboard.
  const [isNewSignup, setIsNewSignup] = useState(false)
  useEffect(() => { setIsNewSignup(new URLSearchParams(window.location.search).get('new') === '1') }, [])

  // "Bring your favorites": names typed on /mealime (or here) are rebuilt as full
  // recipes for this family and saved. Names left on /mealime before signup are
  // picked up from localStorage on first visit.
  const runImport = useCallback(async (names: string) => {
    if (!names.trim()) return
    setImporting(true)
    setImportMsg(null)
    try {
      const res = await fetch('/api/import-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportMsg(data.imported > 0
        ? `Added ${data.imported} dinner${data.imported === 1 ? '' : 's'} to your favorites${data.skipped ? ` (${data.skipped} already there)` : ''}. They'll rotate into your weekly plans.`
        : 'Those dinners are already in your favorites.')
      setImportText('')
      setShowImport(false)
      await loadFavoritesRef.current?.()
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Import failed — please try again.')
    } finally {
      setImporting(false)
    }
  }, [])

  const loadFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const rows = data as FavoriteRow[]
      const withImages = await attachLibraryImages(supabase, rows.map((r) => r.meal_data))
      setFavorites(rows.map((r, i) => ({ ...r, meal_data: withImages[i] ?? r.meal_data })))
    }
    setLoading(false)
  }, [supabase])

  loadFavoritesRef.current = loadFavorites

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  useEffect(() => {
    try {
      const pending = localStorage.getItem('dd_import_names')
      if (pending && pending.trim()) {
        localStorage.removeItem('dd_import_names')
        setShowImport(true)
        runImport(pending)
      }
    } catch { /* storage unavailable */ }
  }, [runImport])

  async function removeFavorite(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    const fav = favorites.find(f => f.id === id)
    await supabase.from('favorites').delete().eq('id', id)
    setFavorites(prev => prev.filter(f => f.id !== id))
    if (fav) {
      await recordMealSignal({
        event_type: 'unfavorited',
        meal_name: fav.meal_data.name,
        cuisine: fav.meal_data.cuisine,
        protein: fav.meal_data.protein,
        cook_time: fav.meal_data.cookTime,
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {isNewSignup && <ConversionTracker value={10} onceKey="dd_signup_conv" />}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Your favorite meals
          </h1>
          <p className="text-muted-foreground mt-1">
            Meals you love will be included in future plans automatically.
          </p>
          <button
            onClick={() => setShowImport((v) => !v)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Download className="w-4 h-4" />
            Bring dinners you already love (from Mealime, a notebook, anywhere)
          </button>
          {showImport && (
            <div className="mt-3 rounded-xl border border-border bg-card p-4 max-w-2xl">
              <p className="text-sm text-muted-foreground mb-2">
                Type or paste the names, one per line. We rebuild each one as a full recipe for your family size and add it here.
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={5}
                placeholder={'Sheet pan lemon chicken\nTaco bowls\nOne-pot sausage pasta'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => runImport(importText)}
                disabled={importing || !importText.trim()}
                className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {importing ? 'Rebuilding your recipes…' : 'Add to my favorites'}
              </button>
            </div>
          )}
          {importMsg && <p className="mt-3 text-sm text-foreground">{importMsg}</p>}
          {importing && !showImport && <p className="mt-3 text-sm text-muted-foreground">Rebuilding the dinners you brought with you…</p>}
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-foreground font-medium">No favorites yet</p>
            <p className="text-muted-foreground text-sm">
              Tap the heart icon on any meal card to save it here.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 px-6 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favorites.map((fav) => {
              const meal = fav.meal_data
              const mealId = getFavMealId(fav)
              return (
                <div
                  key={fav.id}
                  className="rounded-lg border border-border bg-card hover:shadow-md transition-shadow overflow-hidden"
                >
                  <Link
                    href={`/recipe/${mealId}`}
                    onClick={() => localStorage.setItem(`meal-${mealId}`, JSON.stringify(meal))}
                    className="block"
                  >
                    <MealCardImage mealName={meal.name} dayLabel={meal.day} imageUrl={meal.imageUrl} />
                  </Link>

                  <div className="relative">
                    <button
                      onClick={(e) => removeFavorite(e, fav.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors z-10"
                      aria-label="Remove from favorites"
                    >
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </button>
                    <Link
                      href={`/recipe/${mealId}`}
                      onClick={() => localStorage.setItem(`meal-${mealId}`, JSON.stringify(meal))}
                      className="block p-4 space-y-2"
                    >
                      <h3 className="text-base font-heading font-semibold text-card-foreground leading-tight pr-8">
                        {meal.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{meal.cookTime} min</span>
                        <span>&middot;</span>
                        <span>{meal.servings} servings</span>
                      </div>
                      <div className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                        ${meal.estimatedCost.toFixed(2)}
                      </div>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
