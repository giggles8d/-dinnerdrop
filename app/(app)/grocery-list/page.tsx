'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import GroceryList from '@/components/GroceryList'
import { getStoreHomepageUrl } from '@/lib/affiliate-links'
import { STORE_OPTIONS } from '@/lib/affiliate-links'
import type { GroceryCategory, GroceryItem, Meal } from '@/types'

type GroceryListData = Record<GroceryCategory, GroceryItem[]>

export default function GroceryListPage() {
  const [groceryList, setGroceryList] = useState<GroceryListData | null>(null)
  const [totalCost, setTotalCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generateError, setGenerateError] = useState(false)
  const [preferredStore, setPreferredStore] = useState('Instacart')
  const [krogerConnected, setKrogerConnected] = useState(false)
  const [krogerLoading, setKrogerLoading] = useState(false)
  const [krogerResult, setKrogerResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const supabase = createClient()

  const loadGroceryList = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Load profile for preferred store
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_store, kroger_access_token, kroger_token_expires_at')
      .eq('id', user.id)
      .single()

    if (profile?.preferred_store) {
      setPreferredStore(profile.preferred_store)
    }

    if (profile) {
      const tokenValid = profile.kroger_access_token &&
        (!profile.kroger_token_expires_at || new Date(profile.kroger_token_expires_at) > new Date())
      setKrogerConnected(!!tokenValid)
    }

    const { data: plan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!plan) {
      setLoading(false)
      return
    }

    setTotalCost(plan.total_estimated_cost || 0)

    // Fetch pantry items for subtraction
    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name')
      .eq('user_id', user.id)

    const pantryNames = new Set(
      (pantryItems || []).map((p: { name: string }) => p.name.toLowerCase().trim())
    )

    function subtractPantry(list: GroceryListData): GroceryListData {
      if (pantryNames.size === 0) return list
      const result: Partial<GroceryListData> = {}
      for (const category in list) {
        const cat = category as GroceryCategory
        result[cat] = list[cat].filter(
          (item: GroceryItem) => !pantryNames.has(item.name.toLowerCase().trim())
        )
      }
      return result as GroceryListData
    }

    if (plan.grocery_list && Object.keys(plan.grocery_list).length > 0) {
      setGroceryList(subtractPantry(plan.grocery_list as GroceryListData))
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/generate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals: plan.meals as Meal[], userId: user.id }),
      })

      if (!res.ok) {
        console.error('Error generating grocery list — status:', res.status)
        setGenerateError(true)
        setLoading(false)
        return
      }

      const data = await res.json()
      setGroceryList(subtractPantry(data))

      await supabase
        .from('meal_plans')
        .update({ grocery_list: data })
        .eq('id', plan.id)
    } catch (error) {
      console.error('Error generating grocery list:', error)
      setGenerateError(true)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadGroceryList()
  }, [loadGroceryList])

  async function handleChangeStore(newStore: string) {
    setPreferredStore(newStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_store: newStore })
        .eq('id', user.id)
    }
  }

  async function handleKrogerCart() {
    if (!krogerConnected) {
      window.location.href = '/api/kroger/auth'
      return
    }
    setKrogerLoading(true)
    setKrogerResult(null)
    try {
      const res = await fetch('/api/kroger/add-to-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groceryList }),
      })
      const data = await res.json()
      if (res.status === 403) {
        setKrogerConnected(false)
        setKrogerResult({ type: 'error', message: 'Kroger session expired. Please reconnect.' })
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to add to cart')
      setKrogerResult({
        type: 'success',
        message: `Added ${data.added} of ${data.total} items to your Kroger cart.`,
      })
    } catch (error) {
      setKrogerResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to add items to Kroger cart.',
      })
    } finally {
      setKrogerLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Building your grocery list...</p>
        </div>
      </div>
    )
  }

  if (generateError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <p className="text-foreground font-medium">Couldn&apos;t build your grocery list</p>
          <p className="text-muted-foreground text-sm">Something went wrong generating your list. Try again from your dashboard.</p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    )
  }

  if (!groceryList) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-foreground font-medium">No meal plan found</p>
          <p className="text-muted-foreground">Generate a meal plan first from your dashboard.</p>
          <a
            href="/dashboard"
            className="inline-block mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    )
  }

  const isKroger = preferredStore === 'Kroger'

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Grocery list</p>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Your grocery list
          </h1>
          <p className="text-muted-foreground mt-2">
            Everything you need for this week&apos;s dinners
          </p>
          {!isKroger && (
            <p className="text-xs text-muted-foreground mt-1">
              Tap any item to find it at {preferredStore}
            </p>
          )}
        </div>

        <GroceryList groceryList={groceryList} store={preferredStore} />

        <div className="mt-8 p-5 rounded-xl bg-foreground">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-foreground/60">Estimated total</span>
            <span className="text-2xl font-heading font-bold text-primary-foreground">
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border sm:static sm:mt-6 sm:p-0 sm:bg-transparent sm:border-0">
          <div className="space-y-3">
            {isKroger ? (
              <>
                {krogerConnected ? (
                  <button
                    onClick={handleKrogerCart}
                    disabled={krogerLoading}
                    className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#0067A0] text-white font-semibold text-base hover:bg-[#005a8c] disabled:opacity-50 transition-colors shadow-lg"
                  >
                    {krogerLoading ? 'Adding to cart...' : 'Send to Kroger cart'}
                  </button>
                ) : (
                  <button
                    onClick={() => { window.location.href = '/api/kroger/auth' }}
                    className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#0067A0] text-white font-semibold text-base hover:bg-[#005a8c] transition-colors shadow-lg"
                  >
                    Connect your Kroger account
                  </button>
                )}
                {krogerResult && (
                  <p className={`text-sm ${krogerResult.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                    {krogerResult.message}
                  </p>
                )}
              </>
            ) : (
              <a
                href={getStoreHomepageUrl(preferredStore)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors shadow-lg"
              >
                Shop this list at {preferredStore} &rarr;
              </a>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="store-select" className="text-xs text-muted-foreground">Change store:</label>
              <select
                id="store-select"
                value={preferredStore}
                onChange={(e) => handleChangeStore(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
              >
                {STORE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="h-20 sm:hidden" />
      </div>
    </div>
  )
}
