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
import { ArrowLeft, Clock, Heart, ChefHat, CalendarPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import MealCardImage from '@/components/MealCardImage'
import CookMode from '@/components/CookMode'
import { formatQuantity } from '@/components/GroceryList'
import type { Meal } from '@/types'
import { timeLabel } from '@/lib/plan'
import { safeBite, cookware } from '@/lib/meal-insights'

interface RecipeRow {
  id: string; name: string; slug: string; cuisine: string | null; protein: string | null
  cook_time: number | null; prep_time: number | null; servings: number | null; estimated_cost: number | null
  ingredients: Meal['ingredients']; steps: string[]; tags: string[]; image_url: string | null; image_credit: string | null
  nutrition: Meal['nutrition'] | null; source: 'generated' | 'user'; created_by: string | null; kept_count: number
}

export type { RecipeRow }

/** Client half of /recipes/[slug]. The server page fetches the recipe and passes it in, so the page renders without JS and is indexable. */
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!r || !meal) return <div className="min-h-screen flex items-center justify-center text-center"><div><p className="font-medium">Recipe not found</p><Link href="/recipes" className="text-primary text-sm hover:underline">Back to the library</Link></div></div>

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/recipes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 print:hidden"><ArrowLeft className="w-4 h-4" /> Recipe library</Link>
        {cooking && <CookMode meal={meal} onClose={() => setCooking(false)} />}
        <div className="rounded-xl overflow-hidden mb-6 print:hidden"><MealCardImage mealName={r.name} dayLabel={r.source === 'user' && r.created_by === userId ? 'Your recipe' : ''} imageUrl={r.image_url ?? undefined} /></div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-4xl font-heading font-bold text-foreground leading-tight">{r.name}</h1>
          <div className="flex items-center gap-1 print:hidden">{r.source === 'user' && r.created_by === userId && <Link href={`/recipes/${r.slug}/edit`} className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-foreground hover:bg-muted">Edit</Link>}<PrintButton /><button onClick={toggleFav} className="p-2 rounded-full hover:bg-muted" aria-label="Favorite"><Heart className={`w-6 h-6 ${fav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} /></button></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-border">
          <span className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"><Clock className="w-3.5 h-3.5" />{timeLabel(meal)}</span>
          <ServingsStepper servings={meal.servings} onChange={setServings} />
          <span className="bg-muted rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground" title="Pans and pots the steps use">🍳 {cookware(meal).label}</span>
          {safeBite(meal) && <span className="bg-secondary text-primary border border-primary/20 rounded-full px-3 py-1.5 text-xs font-semibold" title="The one plain component a picky eater can have on its own">Picky-eater safe bet: {safeBite(meal)}</span>}
          {meal.estimatedCost > 0 && <span className="bg-secondary text-primary border border-primary/20 rounded-full px-3 py-1.5 text-xs font-semibold">${meal.estimatedCost.toFixed(2)}</span>}
          {meal.nutrition && <span className="bg-muted rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">{meal.nutrition.calories} cal · {meal.nutrition.protein}g protein</span>}
          {r.kept_count > 0 && <span className="text-xs text-muted-foreground">kept by {r.kept_count} {r.kept_count === 1 ? 'family' : 'families'}</span>}
          <div className="ml-auto flex gap-2 print:hidden">
            {userId ? (
              <button onClick={addToWeek} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-primary/30 text-primary text-sm font-semibold hover:bg-secondary"><CalendarPlus className="w-4 h-4" /> Add to this week</button>
            ) : (
              <Link href={`/signup?redirect=${encodeURIComponent('/recipes/' + r.slug)}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-primary/30 text-primary text-sm font-semibold hover:bg-secondary"><CalendarPlus className="w-4 h-4" /> Plan my week with this — free</Link>
            )}
            <button onClick={() => setCooking(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"><ChefHat className="w-4 h-4" /> Cook mode</button>
          </div>
        </div>
        {added && <p className="text-sm text-primary mb-4">{added}</p>}
        <p className="mb-4 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Goes with:</span> {sideFor(meal).name} <span className="text-xs">({sideFor(meal).minutes} min)</span></p>
        <AllergenNotice ingredients={meal.ingredients} name={meal.name} />
        <div className="print:hidden">
          <RecipeNotes recipeName={meal.name} />
          <CookwareList meal={meal} />
        </div>
        <section className="mb-8">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Ingredients</h2>
          <ul className="space-y-1">
            {meal.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30"><span className="w-1.5 h-1.5 rounded-full bg-primary" /><span className="text-sm flex-1">{ing.name}</span><span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{formatQuantity(ing.quantity, ing.unit)}</span></li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Instructions</h2>
          <ol className="space-y-4">
            {meal.steps.map((s, i) => (
              <li key={i} className="flex gap-4"><span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span><p className="text-sm leading-relaxed pt-1">{s}</p></li>
            ))}
          </ol>
        </section>
        <div className="mt-8"><NutritionPanel nutrition={meal.nutrition} /></div>
        {r.image_credit && <p className="text-[10px] text-muted-foreground mt-8">Photo: {r.image_credit}</p>}
      </div>
    </div>
  )
}
