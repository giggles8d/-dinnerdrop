'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Sparkles } from 'lucide-react'
import { recordMealSignal } from '@/lib/taste-profile'
import { createClient } from '@/lib/supabase'
import MealGrid from '@/components/MealGrid'
import ConversionTracker from '@/components/ConversionTracker'
import type { Meal } from '@/types'

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [budget, setBudget] = useState('$100')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isPlanStale, setIsPlanStale] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [pendingMeals, setPendingMeals] = useState<Meal[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set())
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free')
  const [isBetaMember, setIsBetaMember] = useState(false)
  const [planCount, setPlanCount] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
  const canGenerate = isSubscribed || planCount === 0 || isBetaMember
  const isPickingMeals = pendingMeals.length > 0
  const selectedMeals = pendingMeals.filter(m => selectedIds.has(m.day))

  const loadExistingPlan = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch profile first (need onboarding_complete before proceeding)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setBudget(profile.weekly_budget)
        setSubscriptionStatus(profile.subscription_status || 'free')
        setIsBetaMember(profile.is_beta_member || false)

        if (!profile.onboarding_complete) {
          router.push('/onboarding')
          return
        }
      }

      // Run remaining queries in parallel — no dependency between them
      const [favoritesRes, planRes, countRes] = await Promise.all([
        supabase.from('favorites').select('meal_name').eq('user_id', user.id),
        supabase.from('meal_plans').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      if (favoritesRes.data) {
        setFavoriteNames(new Set(favoritesRes.data.map(f => f.meal_name)))
      }

      const plan = planRes.data
      if (plan) {
        const planMeals = plan.meals as Meal[]
        setMeals(planMeals)
        setTotalCost(plan.total_estimated_cost || 0)
        setHasGenerated(true)
        localStorage.setItem('current-meals', JSON.stringify(planMeals))

        if (plan.week_start) {
          const planWeekStart = new Date(plan.week_start)
          const today = new Date()
          const thisMonday = new Date(today)
          thisMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
          thisMonday.setHours(0, 0, 0, 0)
          if (planWeekStart < thisMonday) setIsPlanStale(true)
        }
      }

      setPlanCount(countRes.count ?? 0)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    loadExistingPlan()
  }, [loadExistingPlan])

  // Refresh subscription status when returning from Stripe
  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      const refresh = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        if (!user) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single()
        if (profile) {
          setSubscriptionStatus(profile.subscription_status || 'free')
        }
      }
      refresh()
    }
  }, [searchParams, supabase])

  async function toggleFavorite(meal: Meal) {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) return

    const isFav = favoriteNames.has(meal.name)

    if (isFav) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('meal_name', meal.name)

      setFavoriteNames(prev => {
        const next = new Set(prev)
        next.delete(meal.name)
        return next
      })
      await recordMealSignal({
        event_type: 'unfavorited',
        meal_name: meal.name,
        cuisine: meal.cuisine,
        protein: meal.protein,
        cook_time: meal.cookTime,
      })
    } else {
      await supabase.from('favorites').insert({
        user_id: user.id,
        meal_name: meal.name,
        meal_data: meal,
      })

      setFavoriteNames(prev => new Set(prev).add(meal.name))
      await recordMealSignal({
        event_type: 'favorited',
        meal_name: meal.name,
        cuisine: meal.cuisine,
        protein: meal.protein,
        cook_time: meal.cookTime,
      })
    }
  }

  async function generatePlan() {
    if (subscriptionStatus === 'past_due') {
      await handleUpdatePayment()
      return
    }
    if (!canGenerate) {
      router.push('/signup?beta=1')
      return
    }

    setLoading(true)
    setGenerateError('')

    if (hasGenerated) {
      await recordMealSignal({ event_type: 'regenerated_week' })
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch profile + favorites in parallel
      const [profileRes, favoritesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('favorites').select('meal_data').eq('user_id', user.id),
      ])

      const profile = profileRes.data
      if (!profile) { setGenerateError('Could not load your profile. Please refresh.'); return }

      const favoriteMeals = favoritesRes.data?.map(f => f.meal_data as Meal) || []

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 58000)
      let res: Response
      try {
        res = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            familySize: profile.family_size,
            weeklyBudget: profile.weekly_budget,
            maxCookTime: profile.max_cook_time,
            cuisinePreference: profile.cuisine_preference,
            dietaryNeeds: profile.dietary_needs || [],
            favoriteMeals,
            userId: user.id,
          }),
        })
      } finally {
        clearTimeout(timeoutId)
      }

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`)
      }

      if (data.meals) {
        // Show picker with all 10 options and NOTHING pre-selected — the user
        // chooses the dinners they actually want for the week.
        setPendingMeals(data.meals)
        setSelectedIds(new Set())
        setGenerateError('')
      }
    } catch (error) {
      console.error('Error generating plan:', error)
      const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))
      setGenerateError(
        isTimeout
          ? 'Generation took too long — please try again. It usually works on the second attempt.'
          : error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function toggleMealSelection(meal: Meal) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(meal.day)) {
        next.delete(meal.day)
      } else {
        next.add(meal.day)
      }
      return next
    })
  }

  async function confirmPlan() {
    if (selectedMeals.length === 0) return
    setLoading(true)
    setGenerateError('')
    try {
      const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const confirmed = selectedMeals.map((meal, i) => ({
        ...meal,
        day: DAY_NAMES[i] ?? `Day ${i + 1}`,
      }))
      const confirmedCost = confirmed.reduce((sum, m) => sum + m.estimatedCost, 0)

      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) { router.push('/login'); return }

      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

      await supabase.from('meal_plans').insert({
        user_id: user.id,
        week_start: monday.toISOString().split('T')[0],
        meals: confirmed,
        grocery_list: {},
        total_estimated_cost: confirmedCost,
      })

      setMeals(confirmed)
      setTotalCost(confirmedCost)
      setHasGenerated(true)
      setIsPlanStale(false)
      setPlanCount(prev => prev + 1)
      localStorage.setItem('current-meals', JSON.stringify(confirmed))
      setPendingMeals([])
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error confirming plan:', error)
      setGenerateError('Something went wrong saving your plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdatePayment() {
    try {
      const res = await fetch('/api/stripe/customer-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fire ad-platform conversion pings on successful Stripe return */}
      {searchParams.get('subscribed') === 'true' && <ConversionTracker />}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Past due payment banner */}
        {subscriptionStatus === 'past_due' && (
          <div className="flex items-center justify-between mb-6 px-5 py-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Payment issue — your plan is paused</p>
                <p className="text-xs text-red-600 mt-0.5">Update your payment method to restore access</p>
              </div>
            </div>
            <button
              onClick={handleUpdatePayment}
              className="text-xs font-semibold text-red-700 hover:text-red-900 flex-shrink-0 underline"
            >
              Update payment &rarr;
            </button>
          </div>
        )}

        {/* Subscription upgrade banner */}
        {!isSubscribed && subscriptionStatus !== 'past_due' && planCount > 0 && (
          <Link
            href="/signup?beta=1"
            className="flex items-center justify-between mb-6 px-5 py-4 rounded-xl bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Unlock unlimited meal plans</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">Founding offer — 6 months free · No credit card today</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-accent flex-shrink-0">
              Start free trial &rarr;
            </span>
          </Link>
        )}

        {/* Stale plan nudge */}
        {isPlanStale && hasGenerated && !loading && !initialLoading && (
          <div className="mb-5 flex items-center justify-between px-4 py-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-sm text-foreground/70">
              Your plan is from last week — ready for a fresh one?
            </p>
            <button
              onClick={generatePlan}
              disabled={loading}
              className="text-xs font-semibold text-primary hover:text-primary/80 underline flex-shrink-0 ml-4"
            >
              Refresh plan &rarr;
            </button>
          </div>
        )}

        {/* Generate error banner */}
        {generateError && (
          <div className="mb-5 flex items-center justify-between px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{generateError}</p>
            <button onClick={() => setGenerateError('')} className="text-xs font-semibold text-destructive ml-4 hover:underline">Dismiss</button>
          </div>
        )}

        <div className="flex items-start justify-between mb-8 pb-6 border-b border-border">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">
              {isPickingMeals ? 'Pick your meals' : 'Weekly meal plan'}
            </p>
            <h1 className="text-4xl font-heading font-bold text-foreground leading-tight">
              {isPickingMeals ? 'Choose your favorites' : "This week's dinners"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isPickingMeals
                ? `Tap the dinners you want this week — pick about 5 · ${selectedMeals.length} selected`
                : meals.length > 0
                  ? `${meals.length} dinners planned around your budget and preferences`
                  : 'Planned around your budget and preferences'}
            </p>
          </div>
          {isPickingMeals ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setPendingMeals([]); setSelectedIds(new Set()) }}
                className="px-4 py-3 rounded-xl border border-border text-foreground/70 font-semibold hover:bg-muted transition-colors text-sm"
              >
                Start over
              </button>
              <button
                onClick={confirmPlan}
                disabled={loading || selectedMeals.length === 0}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? 'Saving...' : `Confirm ${selectedMeals.length} meal${selectedMeals.length !== 1 ? 's' : ''} →`}
              </button>
            </div>
          ) : (
            <button
              onClick={generatePlan}
              disabled={loading || initialLoading}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {initialLoading
                ? 'Loading...'
                : loading
                ? 'Generating...'
                : !canGenerate
                  ? 'Upgrade to generate'
                  : hasGenerated
                    ? 'Generate new week'
                    : 'Generate my plan'}
            </button>
          )}
        </div>

                {!hasGenerated && !initialLoading && !isPickingMeals && (
          <div className="mb-8 p-6 rounded-2xl border border-accent/30 bg-accent/5 text-center">
            <div className="text-3xl mb-3">&#127858;</div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Welcome to DinnerDrop!</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
              Your family&apos;s personal dinner planner is ready. Tap &ldquo;Generate my plan&rdquo; above to get 10 AI-planned dinner ideas — personalized to your budget, cook time, and tastes — then pick your favorites for the week.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">&#10003; 10 dinner ideas to choose from</span>
              <span className="hidden sm:block">·</span>
              <span className="flex items-center gap-1">&#10003; Budget-tracked grocery list</span>
              <span className="hidden sm:block">·</span>
              <span className="flex items-center gap-1">&#10003; One-tap store handoff</span>
            </div>
          </div>
        )}
        {isPickingMeals ? (
          <MealGrid
            meals={pendingMeals}
            loading={loading}
            selectable
            selectedIds={selectedIds}
            onSelectMeal={toggleMealSelection}
          />
        ) : (
          <MealGrid
            meals={meals}
            loading={initialLoading || loading}
            favoriteNames={favoriteNames}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {hasGenerated && meals.length > 0 && !isPickingMeals && (
          <>
            <div className="mt-8 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Estimated total
                </span>
                <span className="text-sm text-muted-foreground">
                  Budget: {budget}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (totalCost / parseFloat(budget.replace('$', '').replace('+', ''))) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-2xl font-heading font-bold text-foreground">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/grocery-list"
                className="inline-block px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Build my grocery list &rarr;
              </Link>
              <div className="mt-6 p-4 rounded-xl border border-accent/30 bg-accent/5 text-center">
                <p className="text-sm font-semibold text-foreground mb-1">Know someone who dreads the dinner question?</p>
                <p className="text-xs text-muted-foreground mb-3">Share DinnerDrop — they get 6 months free too</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://dinnerdrop.app/beta')
                    alert('Link copied! Share it — they get 6 months free.')
                  }}
                  className="px-5 py-2 rounded-lg border border-accent text-accent text-xs font-semibold hover:bg-accent/10 transition-colors"
                >
                  Copy invite link
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
