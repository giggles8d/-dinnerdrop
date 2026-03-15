'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Heart, RefreshCw, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useUnsplashPhoto } from '@/lib/use-unsplash-photo'
import { recordMealSignal } from '@/lib/taste-profile'
import type { Meal } from '@/types'

function HeroImage({ mealName }: { mealName: string }) {
  const { photo, loading } = useUnsplashPhoto(mealName)

  return (
    <div className="relative h-[300px] sm:h-[400px] w-full rounded-xl overflow-hidden mb-8">
      {loading ? (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      ) : photo ? (
        <>
          <img
            src={photo.url}
            alt={photo.alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          
            href={`${photo.credit.link}?utm_source=dinnerdrop&utm_medium=referral`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-3 text-[10px] text-white/70 hover:text-white transition-colors"
          >
            Photo by {photo.credit.name} on Unsplash
          </a>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-200" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
    </div>
  )
}

export default function RecipePage() {
  const params = useParams()
  const id = params.id as string

  const [meal, setMeal] = useState<Meal | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const supabase = createClient()

  const checkFavorite = useCallback(async (mealName: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('meal_name', mealName)
      .limit(1)
    setIsFavorite((data?.length ?? 0) > 0)
  }, [supabase])

  useEffect(() => {
    const stored = localStorage.getItem(`meal-${id}`)
    if (stored) {
      const parsed = JSON.parse(stored) as Meal
      setMeal(parsed)
      checkFavorite(parsed.name)
    }
  }, [id, checkFavorite])

  async function toggleFavorite() {
    if (!meal) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('meal_name', meal.name)
      setIsFavorite(false)
      await recordMealSignal({
        event_type: 'unfavorited',
        meal_name: meal.name,
        cuisine: meal.cuisine,
        protein: meal.protein,
        cook_time: meal.cookTime,
      })
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, meal_name: meal.name, meal_data: meal })
      setIsFavorite(true)
      await recordMealSignal({
        event_type: 'favorited',
        meal_name: meal.name,
        cuisine: meal.cuisine,
        protein: meal.protein,
        cook_time: meal.cookTime,
      })
    }
  }

  async function handleSwap() {
    if (!meal) return
    setSwapping(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSwapping(false); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile) { setSwapping(false); return }
    try {
      const res = await fetch('/api/swap-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMeal: meal,
          profile: {
            familySize: profile.family_size,
            weeklyBudget: profile.weekly_budget,
            maxCookTime: profile.max_cook_time,
            cuisinePreference: profile.cuisine_preference,
            dietaryNeeds: profile.dietary_needs || [],
          },
        }),
      })
      const data = await res.json()
      if (data.meal) {
        const newMeal = data.meal as Meal
        await recordMealSignal({
          event_type: 'swapped_away',
          meal_name: meal.name,
          cuisine: meal.cuisine,
          protein: meal.protein,
          cook_time: meal.cookTime,
          swapped_to_cuisine: newMeal.cuisine,
        })
        localStorage.setItem(`meal-${id}`, JSON.stringify(newMeal))
        const storedMeals = localStorage.getItem('current-meals')
        if (storedMeals) {
          const meals: Meal[] = JSON.parse(storedMeals)
          const updated = meals.map(m => m.day === meal.day ? newMeal : m)
          localStorage.setItem('current-meals', JSON.stringify(updated))
        }
        const { data: plan } = await supabase.from('meal_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
        if (plan) {
          const updatedMeals = (plan.meals as Meal[]).map(m => m.day === meal.day ? newMeal : m)
          await supabase.from('meal_plans').update({ meals: updatedMeals }).eq('id', plan.id)
        }
        setMeal(newMeal)
        checkFavorite(newMeal.name)
      }
    } catch (error) {
      console.error('Error swapping meal:', error)
    } finally {
      setSwapping(false)
    }
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-foreground font-medium">Meal not found</p>
          <Link href="/dashboard" className="text-primary hover:underline text-sm">
            Back to meal plan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to meal plan
        </Link>

        <HeroImage mealName={meal.name} />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
              {meal.day}
            </p>
            <h1 className="text-4xl font-heading font-bold text-foreground leading-tight">
              {meal.name}
            </h1>
          </div>
          <button
            onClick={toggleFavorite}
            className="p-2.5 rounded-full hover:bg-muted transition-colors flex-shrink-0 mt-1"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-6 h-6 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-400'}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{meal.prepTime + meal.cookTime} min total</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{meal.servings} servings</span>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary text-primary border border-primary/20 rounded-full px-3 py-1.5 text-xs font-semibold">
            ${meal.estimatedCost.toFixed(2)}
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
            Ingredients
          </h2>
          <ul className="space-y-1">
            {meal.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-sm text-foreground flex-1">{ing.name}</span>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {ing.quantity} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
            Instructions
          </h2>
          <ol className="space-y-4">
            {meal.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed pt-1">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="border-t border-border pt-6 flex items-center gap-3">
          <button
            onClick={handleSwap}
            disabled={swapping}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary/30 text-primary font-semibold hover:bg-secondary disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${swapping ? 'animate-spin' : ''}`} />
            {swapping ? 'Finding a new meal...' : 'Swap this meal'}
          </button>
          <p className="text-xs text-muted-foreground">
            Replace with a similar alternative
          </p>
        </div>
      </div>
    </div>
  )
}
