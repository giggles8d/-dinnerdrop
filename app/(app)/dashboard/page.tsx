'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Sparkles } from 'lucide-react'
import { recordMealSignal } from '@/lib/taste-profile'
import { createClient } from '@/lib/supabase'
import MealGrid from '@/components/MealGrid'
import ConversionTracker from '@/components/ConversionTracker'
import type { Meal } from '@/types'
import { assignNights, DEFAULT_SHAPE, type PlanShape } from '@/lib/plan'
import { resolvePlanOwner } from '@/lib/household'

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
  const [planCount, setPlanCount] = useState(0)
  const [planShape, setPlanShape] = useState<PlanShape>(DEFAULT_SHAPE)
  const [isPartner, setIsPartner] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, { keep: number; skip: number; again: number; voters: string[] }>>({})
  const [planMode, setPlanMode] = useState<'fresh' | 'favorites'>('fresh')
  // Instant first plan: brand-new users (no plan yet) get their first week
  // auto-generated with smart defaults — no quiz gate before seeing value.
  const [needsPersonalize, setNeedsPersonalize] = useState(false)
  const [shouldAutoGen, setShouldAutoGen] = useState(false)
  const autoGenFired = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [isFoundingMember, setIsFoundingMember] = useState(false)
  const [familyCredit, setFamilyCredit] = useState(false)
  // Founding families have Family free for their first year (through 2027-10-18).
  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || isFoundingMember || familyCredit
  // Free plan includes unlimited weekly plans (2026-10-18). Only past_due is blocked, handled in generatePlan.
  const canGenerate = true
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
        setIsFoundingMember(profile.is_beta_member === true)
        setFamilyCredit(!!profile.family_until && new Date(profile.family_until) > new Date())
        // Don't gate the dashboard behind the quiz anymore — show the product
        // first, offer personalization after. (This was where 95% of signups
        // used to vanish.)
        setNeedsPersonalize(!profile.onboarding_complete)
      }

      // Referral attribution (no-op without the dd_ref cookie).
      if (document.cookie.includes('dd_ref=')) fetch('/api/referrals/attach', { method: 'POST' }).catch(() => {})
      if (profile?.referral_code) setReferralCode(profile.referral_code)

      // Partners who joined by invite see the household owner's plan.
      const owner = await resolvePlanOwner(supabase, user.id)
      setIsPartner(owner.isPartner)
      const planUserId = owner.ownerId

      // Run remaining queries in parallel — no dependency between them
      const [favoritesRes, planRes, countRes] = await Promise.all([
        supabase.from('favorites').select('meal_name').eq('user_id', user.id),
        supabase.from('meal_plans').select('*').eq('user_id', planUserId)
          .order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('meal_plans').select('id', { count: 'exact', head: true }).eq('user_id', planUserId),
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

        // Family votes (texted in) for this plan's week.
        if (profile?.household_id && plan.week_start) {
          const { data: voteRows } = await supabase
            .from('meal_votes')
            .select('meal_name, vote, member_id, household_members(name)')
            .eq('household_id', profile.household_id)
            .eq('week_start', plan.week_start)
          const tally: Record<string, { keep: number; skip: number; again: number; voters: string[] }> = {}
          for (const v of (voteRows ?? []) as Array<{ meal_name: string; vote: 'keep' | 'skip' | 'again'; household_members: { name: string } | { name: string }[] | null }>) {
            const t = tally[v.meal_name] ?? (tally[v.meal_name] = { keep: 0, skip: 0, again: 0, voters: [] })
            t[v.vote]++
            const hm = Array.isArray(v.household_members) ? v.household_members[0] : v.household_members
            if (hm?.name && !t.voters.includes(hm.name)) t.voters.push(hm.name)
          }
          setVotes(tally)
        }

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

      // First-ever visit with no plan: kick off generation automatically so the
      // user's first experience is watching their dinners appear.
      if (!plan && (countRes.count ?? 0) === 0 && !owner.isPartner) {
        setShouldAutoGen(true)
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    loadExistingPlan()
  }, [loadExistingPlan])

  // Auto-generate the first plan exactly once per visit (guarded by ref so it
  // can't loop). If it fails, the normal welcome card + button is the fallback.
  useEffect(() => {
    if (!initialLoading && shouldAutoGen && !autoGenFired.current) {
      autoGenFired.current = true
      generatePlan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading, shouldAutoGen])

  // Refresh subscription status when returning from Stripe
  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      const refresh = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        if (!user) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, is_beta_member, family_until')
          .eq('id', user.id)
          .single()
        if (profile) {
          setSubscriptionStatus(profile.subscription_status || 'free')
          setIsFoundingMember(profile.is_beta_member === true)
          setFamilyCredit(!!profile.family_until && new Date(profile.family_until) > new Date())
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
      router.push('/subscribe')
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

      // Generation occasionally fails on the first attempt — auto-retry once,
      // transparently, so users don't get stranded with no plan.
      let data: { meals?: Meal[]; plan?: PlanShape; error?: string } | null = null
      let lastErr: unknown = null
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 50000)
        try {
          const res = await fetch('/api/generate-plan', {
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
              mode: planMode,
            }),
          })
          const json = await res.json()
          if (!res.ok || json.error) throw new Error(json.error || `Server error ${res.status}`)
          data = json
          lastErr = null
          break
        } catch (err) {
          lastErr = err
        } finally {
          clearTimeout(timeoutId)
        }
      }

      if (!data) {
        throw lastErr instanceof Error ? lastErr : new Error('Generation failed')
      }

      if (data.meals) {
        const shape = data.plan ?? DEFAULT_SHAPE
        setPlanShape(shape)
        setPendingMeals(data.meals)
        // First plan ever: pre-select the week so one tap confirms — new users
        // should be one click from done, not facing unchecked boxes. Returning
        // users regenerating start empty and choose deliberately.
        setSelectedIds(
          planCount === 0 && !hasGenerated
            ? new Set(data.meals.slice(0, shape.dinnersPerWeek).map(m => m.day))
            : new Set()
        )
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
      const confirmed = assignNights(selectedMeals, planShape)
      const confirmedCost = confirmed.reduce((sum, m) => sum + m.estimatedCost, 0)

      // Library signal: what this family kept vs. passed on (fire and forget).
      const kept = selectedMeals.map(m => m.recipeId).filter((x): x is string => !!x)
      const skipped = pendingMeals.filter(m => !selectedIds.has(m.day)).map(m => m.recipeId).filter((x): x is string => !!x)
      if (kept.length || skipped.length) {
        fetch('/api/recipes/signal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kept, skipped }) }).catch(() => {})
      }

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
            href="/subscribe"
            className="flex items-center justify-between mb-6 px-5 py-4 rounded-xl bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Add the whole household with Family</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">Kroger cart push, priority support, new family features first · $4.99/mo · 14 days free</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-accent flex-shrink-0">
              Try Family free &rarr;
            </span>
          </Link>
        )}

        {/* Personalization nudge — user is on smart defaults, quiz is optional */}
        {needsPersonalize && !initialLoading && (
          <div className="mb-5 flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground/70">
              {isPickingMeals || hasGenerated || loading
                ? 'These dinners use smart defaults — tell us about your family to make them perfect.'
                : 'Tell us about your family to personalize your dinners.'}
            </p>
            <Link
              href="/onboarding"
              className="text-xs font-semibold text-primary hover:text-primary/80 underline flex-shrink-0 ml-4"
            >
              Personalize (2 min) &rarr;
            </Link>
          </div>
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
                ? planCount === 0
                  ? `We picked ${planShape.dinnersPerWeek} to get you started — tap any to swap · ${selectedMeals.length} selected`
                  : `Tap the dinners you want this week — pick about ${planShape.dinnersPerWeek} · ${selectedMeals.length} selected`
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
          ) : isPartner ? (
            <p className="text-xs text-muted-foreground max-w-xs">Shared household plan. Swaps and new weeks happen from the planner&apos;s account; you can edit the grocery list and vote by text.</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {favoriteNames.size >= 3 && !loading && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={planMode === 'favorites'} onChange={(e) => setPlanMode(e.target.checked ? 'favorites' : 'fresh')} className="accent-[#1a5c38]" />
                  Build from my favorites
                </label>
              )}
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
              <Link href="/settings" className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline sm:ml-1">Settings</Link>
            </div>
          )}
        </div>

        {/* First-plan auto-generation in progress */}
        {loading && !hasGenerated && !isPickingMeals && (
          <div className="mb-8 p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
            <div className="text-3xl mb-3 animate-bounce">&#127859;</div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">
              Building your first week of dinners&hellip;
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Planning a week of dinners around your budget, cook time, and who&apos;s
              at the table. Takes about 30 seconds — worth the wait.
            </p>
          </div>
        )}

                {!hasGenerated && !initialLoading && !loading && !isPickingMeals && (
          <div className="mb-8 p-6 rounded-2xl border border-accent/30 bg-accent/5 text-center">
            <div className="text-3xl mb-3">&#127858;</div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Welcome to DinnerDrop!</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
              Your family&apos;s personal dinner planner is ready. Tap &ldquo;Generate my plan&rdquo; above to get a week of dinner ideas — planned around your budget, cook time, and who&apos;s at the table — then pick the ones you want.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">&#10003; A week of dinner ideas to choose from</span>
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
            votes={votes}
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
                <p className="text-xs text-muted-foreground mb-3">Share your link — it&apos;s free for them, and when they start Family you both get a month of Family free.</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode ? `https://www.dinnerdrop.app/start?ref=${referralCode}` : 'https://www.dinnerdrop.app/start?utm_source=referral&utm_medium=dashboard')
                    alert('Link copied! Share it — DinnerDrop is free for them too.')
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
