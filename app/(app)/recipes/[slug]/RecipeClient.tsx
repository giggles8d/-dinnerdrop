'use client'
import CookwareList from '@/components/CookwareList'
import RecipeNotes from '@/components/RecipeNotes'
import PrintButton from '@/components/PrintButton'
import NutritionPanel from '@/components/NutritionPanel'
import AllergenNotice from '@/components/AllergenNotice'
import { sideFor } from '@/lib/sides'
import ServingsStepper from '@/components/ServingsStepper'
import { withServings } from '@/lib/servings'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, ChefHat, CalendarPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import MealCardImage from '@/components/MealCardImage'
import CookMode from '@/components/CookMode'
import { formatQuantity } from '@/components/GroceryList'
import type { Meal } from '@/types'
import { safeBite, cookware } from '@/lib/meal-insights'
import { recipeIntro, relatedLinks } from '@/lib/recipe-intro'
import { InstacartCarrot } from '@/components/InstacartMark'

interface RecipeRow {
  id: string; name: string; slug: string; cuisine: string | null; protein: string | null
  cook_time: number | null; prep_time: number | null; servings: number | null; estimated_cost: number | null
  ingredients: Meal['ingredients']; steps: string[]; tags: string[]; image_url: string | null; image_credit: string | null
  nutrition: Meal['nutrition'] | null; source: 'generated' | 'user'; created_by: string | null; kept_count: number
}

export type { RecipeRow }

/** Client half of /recipes/[slug]. The server page fetches the recipe and passes it in, so the page renders without JS and is indexable. */
/** Pinterest's "create pin" link: this recipe's page, its photo and a short description. */
function pinterestSaveUrl(r: { slug: string; name: string; image_url: string | null; cook_time?: number | null; prep_time?: number | null }): string {
  const mins = (r.cook_time ?? 0) + (r.prep_time ?? 0)
  const q = new URLSearchParams({
    url: `https://www.dinnerdrop.app/recipes/${r.slug}`,
    media: r.image_url ?? '',
    description: `${r.name}${mins ? ` (${mins} minutes)` : ''}: an easy family dinner recipe from DinnerDrop`,
  })
  return `https://www.pinterest.com/pin/create/button/?${q.toString()}`
}

export default function RecipeClient({ initial }: { initial: RecipeRow }) {
  const slug = initial.slug
  const supabase = useMemo(() => createClient(), [])
  const [r] = useState<RecipeRow | null>(initial)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [fav, setFav] = useState(false)
  const [cooking, setCooking] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const [servings, setServings] = useState<number | null>(null)
  const [shopping, setShopping] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      if (user) {
        const { data: f } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('meal_name', initial.name).limit(1)
        setFav(!!f?.length)
      }
      setLoading(false)
    })()
  }, [slug, initial.name, supabase])

  const baseMeal: Meal | null = r ? {
    day: 'Saved', name: r.name, cuisine: r.cuisine ?? undefined, protein: r.protein ?? undefined, cookTime: r.cook_time ?? 30, prepTime: r.prep_time ?? 10,
    servings: r.servings ?? 4, estimatedCost: Number(r.estimated_cost ?? 0), ingredients: r.ingredients ?? [], steps: r.steps ?? [], tags: r.tags ?? [],
    nutrition: r.nutrition ?? undefined, imageUrl: r.image_url ?? undefined, recipeId: r.id, fromLibrary: true,
  } : null
  // Make it for a different number of people: amounts, cost and "Add to this week" all follow.
  const meal: Meal | null = baseMeal && servings && servings !== baseMeal.servings ? withServings(baseMeal, servings) : baseMeal

  async function toggleFav() {
    if (!userId || !r || !meal) return
    if (fav) { await supabase.from('favorites').delete().eq('user_id', userId).eq('meal_name', r.name); setFav(false) }
    else { await supabase.from('favorites').insert({ user_id: userId, meal_name: r.name, meal_data: meal }); setFav(true) }
  }

  /** Put this dinner into the current week's plan (replaces the first night without a library pick, or appends). */
  async function addToWeek() {
    if (!userId || !meal) return
    const { data: plan } = await supabase.from('meal_plans').select('id, meals, total_estimated_cost').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single()
    if (!plan) { setAdded('Generate a week on your dashboard first, then add this.'); return }
    const meals = (plan.meals as Meal[]) ?? []
    if (meals.some((m) => m.name === meal.name)) { setAdded('Already in this week.'); return }
    const day = `Day ${meals.length + 1}`
    const next = [...meals, { ...meal, day }]
    await supabase.from('meal_plans').update({ meals: next, total_estimated_cost: Number(plan.total_estimated_cost || 0) + meal.estimatedCost, grocery_list: {} }).eq('id', plan.id)
    localStorage.setItem('current-meals', JSON.stringify(next))
    setAdded('Added to this week. Your grocery list will rebuild with it.')
  }

  /** This recipe's ingredients as an Instacart list — no account needed (opened in a new tab). */
  async function shopIngredients() {
    if (!r || shopping === 'busy') return
    // Open the tab now, inside the click, so popup blockers allow it; point it at Instacart once the link is ready.
    const tab = window.open('', '_blank')
    setShopping('busy')
    try {
      const res = await fetch('/api/recipes/shop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: r.slug, servings: meal?.servings }) })
      const j = await res.json()
      if (!res.ok || !j.url) throw new Error(j.error || 'failed')
      if (tab) tab.location.href = j.url
      else window.location.href = j.url
      setShopping('done')
    } catch {
      tab?.close()
      setShopping('error')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!r || !meal) return <div className="min-h-screen flex items-center justify-center text-center"><div><p className="font-medium">Recipe not found</p><Link href="/recipes" className="text-primary text-sm hover:underline">Back to the library</Link></div></div>

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/recipes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 print:hidden"><ArrowLeft className="w-4 h-4" /> Recipe library</Link>
        {cooking && <CookMode meal={meal} onClose={() => setCooking(false)} />}
        <div className="relative rounded-xl overflow-hidden mb-6 print:hidden">
          <MealCardImage mealName={r.name} dayLabel={r.source === 'user' && !!userId && r.created_by === userId ? 'Your recipe' : ''} imageUrl={r.image_url ?? undefined} />
          {/* Save to Pinterest (Nov 8 2026): the pin links back here, and Pinterest reads the recipe details from this page. */}
          {r.image_url && (
            <a href={pinterestSaveUrl(r)} target="_blank" rel="noopener noreferrer" aria-label={`Save ${r.name} to Pinterest`}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#e60023] px-3.5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#ad081b]">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.7 2-2.7.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.8-4.6-3.2 0-5.1 2.4-5.1 4.9 0 1 .4 2 .9 2.6.1.1.1.2.1.3l-.3 1.3c-.1.2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.4 0-3.6 2.6-6.9 7.5-6.9 3.9 0 7 2.8 7 6.6 0 3.9-2.5 7.1-5.9 7.1-1.2 0-2.3-.6-2.6-1.3l-.7 2.7c-.3 1-1 2.2-1.4 3A10 10 0 1 0 12 2Z" /></svg>
              Save
            </a>
          )}
        </div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-4xl font-heading font-bold text-foreground leading-tight">{r.name}</h1>
          {r.tags.includes('family-favorite') && (() => {
            const stars = Number(r.tags.find((t) => t.startsWith('family-rating-'))?.slice(14)) || 0
            return <p className="mt-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">🏡 A family favorite{stars ? ` · ${'★'.repeat(stars)} from the family that shared it` : ''}</p>
          })()}
          <div className="flex items-center gap-1 print:hidden">{r.source === 'user' && !!userId && r.created_by === userId && <Link href={`/recipes/${r.slug}/edit`} className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-foreground hover:bg-muted">Edit</Link>}<PrintButton /><button onClick={toggleFav} className="p-2 rounded-full hover:bg-muted" aria-label="Favorite"><Heart className={`w-6 h-6 ${fav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} /></button></div>
        </div>
        {/* Recipe-card header (Nov 12 2026): one plain facts row, then tag chips, the way the Recipe Fix Desk shows a recipe. */}
        <div className="mb-6 pb-6 border-b border-border space-y-4">
          <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base text-muted-foreground">
            <div className="flex items-center gap-2"><dt className="sr-only">Serves</dt><dd className="font-semibold text-foreground"><ServingsStepper servings={meal.servings} onChange={setServings} /></dd></div>
            <div className="flex items-center gap-1.5"><dt>Prep</dt><dd className="font-semibold text-foreground">{meal.prepTime} min</dd></div>
            <div className="flex items-center gap-1.5"><dt>Cook</dt><dd className="font-semibold text-foreground">{meal.cookTime} min</dd></div>
            {meal.estimatedCost > 0 && <div className="flex items-center gap-1.5"><dt>Cost</dt><dd className="font-semibold text-foreground">${meal.estimatedCost.toFixed(2)}</dd></div>}
            {meal.nutrition && <div className="flex items-center gap-1.5"><dt className="sr-only">Nutrition</dt><dd><span className="font-semibold text-foreground">{meal.nutrition.calories}</span> cal · <span className="font-semibold text-foreground">{meal.nutrition.protein}g</span> protein</dd></div>}
          </dl>
          {r.tags.filter((t) => !t.startsWith('family-rating-')).length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {r.tags.filter((t) => !t.startsWith('family-rating-')).map((t) => <li key={t} className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">{t}</li>)}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            <span title="Pans and pots the steps use">🍳 {cookware(meal).label}</span>
            {safeBite(meal) && <span title="The one plain component a picky eater can have on its own"> · Picky-eater safe bet: <span className="font-medium text-foreground">{safeBite(meal)}</span></span>}
            {r.kept_count > 0 && <span> · kept by {r.kept_count} {r.kept_count === 1 ? 'family' : 'families'}</span>}
          </p>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={shopIngredients} disabled={shopping === 'busy'} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-[#0AAD0A]/40 bg-white text-[#003D29] text-sm font-semibold hover:bg-[#0AAD0A]/5 disabled:opacity-60"><InstacartCarrot height={16} /> {shopping === 'busy' ? 'Opening Instacart…' : 'Shop ingredients'}</button>
            {userId ? (
              <button onClick={addToWeek} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-primary/30 text-primary text-sm font-semibold hover:bg-secondary"><CalendarPlus className="w-4 h-4" /> Add to this week</button>
            ) : (
              <Link href={`/signup?redirect=${encodeURIComponent('/recipes/' + r.slug)}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-primary/30 text-primary text-sm font-semibold hover:bg-secondary"><CalendarPlus className="w-4 h-4" /> Plan my week with this — free</Link>
            )}
            <button onClick={() => setCooking(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"><ChefHat className="w-4 h-4" /> Cook mode</button>
          </div>
        </div>
        {added && <p className="text-sm text-primary mb-4">{added}</p>}
        {shopping === 'error' && <p className="text-sm text-destructive mb-4 print:hidden">Couldn&apos;t open Instacart just now — please try again.</p>}
        {shopping === 'done' && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-secondary/60 px-4 py-3 text-sm print:hidden">
            <span className="text-foreground">Your ingredients are on an Instacart list in the new tab — pick a store and check out there.</span>{' '}
            {userId
              ? <button onClick={addToWeek} className="font-semibold text-primary underline">Add this dinner to my week too</button>
              : <Link href={`/signup?redirect=${encodeURIComponent('/recipes/' + r.slug)}`} className="font-semibold text-primary underline">Want 5 dinners like this planned every week, on one list? Start free</Link>}
          </div>
        )}
        <p className="mb-4 text-sm text-foreground/80 leading-relaxed">{recipeIntro({ ...meal, cuisine: r.cuisine, protein: r.protein })}</p>
        <p className="mb-4 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Goes with:</span> {sideFor(meal).name} <span className="text-xs">({sideFor(meal).minutes} min)</span></p>
        <AllergenNotice ingredients={meal.ingredients} name={meal.name} />
        <div className="print:hidden">
          <RecipeNotes recipeName={meal.name} />
          <CookwareList meal={meal} />
        </div>
        <section className="mb-8">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Ingredients</h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed marker:text-foreground">
            {meal.ingredients.map((ing, i) => {
              const q = formatQuantity(ing.quantity, ing.unit)
              return <li key={i}>{q && <span className="font-semibold">{q}</span>}{q ? ' ' : ''}{ing.name}</li>
            })}
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Steps</h2>
          <ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed marker:text-foreground">
            {meal.steps.map((s, i) => (
              <li key={i} className="pl-1">{s}</li>
            ))}
          </ol>
        </section>
        <div className="mt-8"><NutritionPanel nutrition={meal.nutrition} /></div>
        <nav aria-label="More dinners like this" className="mt-10 print:hidden">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">More like this</h2>
          <ul className="flex flex-wrap gap-2">
            {relatedLinks({ ...meal, cuisine: r.cuisine, protein: r.protein }).map((l) => (
              <li key={l.href}><Link href={l.href} className="inline-block rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        {r.image_credit && <p className="text-[10px] text-muted-foreground mt-8">Photo: {r.image_credit}</p>}
      </div>
    </div>
  )
}
