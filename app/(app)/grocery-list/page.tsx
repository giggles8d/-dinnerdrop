'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Copy, Printer, Share2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import GroceryList, { formatQuantity } from '@/components/GroceryList'
import InstacartButton from '@/components/InstacartButton'
import { mergeSettings } from '@/lib/settings'
import { resolvePlanOwner } from '@/lib/household'
import {
  type ListItem, type Staple, rowsFromPlanList, dueStaples, basicsFor, REST_OF_WEEK, shoppableItems,
  listToText, guessCategory, normalizeItemName, parseTypedItem,
} from '@/lib/list'
import type { GroceryCategory, GroceryItem, Meal } from '@/types'

type GroceryListData = Record<GroceryCategory, GroceryItem[]>

export default function GroceryListPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [isPartner, setIsPartner] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [staples, setStaples] = useState<Staple[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [budget, setBudget] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [generateError, setGenerateError] = useState(false)
  const [noPlan, setNoPlan] = useState(false)
  const [krogerConnected, setKrogerConnected] = useState(false)
  // Kroger cart push is a Family feature (2026-10-18). Anyone already connected keeps it.
  const [isFamily, setIsFamily] = useState(true)
  const [krogerLoading, setKrogerLoading] = useState(false)
  const [krogerResult, setKrogerResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [stapleDraft, setStapleDraft] = useState('')
  const [showStaples, setShowStaples] = useState(false)

  const loadItems = useCallback(async (uid: string, ws: string) => {
    const { data } = await supabase.from('list_items').select('*').eq('user_id', uid).eq('week_start', ws).order('created_at')
    setItems((data as ListItem[]) ?? [])
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const owner = await resolvePlanOwner(supabase, user.id)
    const uid = owner.ownerId   // partners share the household owner's plan and list
    setUserId(uid)
    setIsPartner(owner.isPartner)

    const { data: profile } = await supabase
      .from('profiles')
      .select('kroger_access_token, kroger_token_expires_at, subscription_status, is_beta_member, family_until, household_id, settings, weekly_budget, family_size')
      .eq('id', uid)
      .single()

    const settings = mergeSettings(profile?.settings)
    if (profile) {
      const tokenValid = profile.kroger_access_token &&
        (!profile.kroger_token_expires_at || new Date(profile.kroger_token_expires_at) > new Date())
      setKrogerConnected(!!tokenValid)
      const status = profile.subscription_status
      const familyUntil = profile.family_until ? new Date(profile.family_until) > new Date() : false
      setIsFamily(status === 'active' || status === 'trialing' || status === 'past_due' || !!profile.is_beta_member || familyUntil || !!profile.kroger_access_token)
      setHouseholdId(profile.household_id ?? null)
      setBudget(Number(String(profile.weekly_budget ?? '').replace(/[^0-9.]/g, '')) || 0)
    }

    const { data: plan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!plan) { setNoPlan(true); setLoading(false); return }
    setTotalCost(plan.total_estimated_cost || 0)
    const ws: string = plan.week_start
    setWeekStart(ws)

    // 1. Make sure the plan has a deduplicated list (generated once per plan).
    let planList: GroceryListData | null = plan.grocery_list && Object.keys(plan.grocery_list).length > 0 ? plan.grocery_list : null
    if (!planList) {
      try {
        const res = await fetch('/api/generate-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meals: plan.meals as Meal[], userId: uid }),
        })
        if (!res.ok) throw new Error(`status ${res.status}`)
        planList = await res.json()
        await supabase.from('meal_plans').update({ grocery_list: planList }).eq('id', plan.id)
      } catch (error) {
        console.error('Error generating grocery list:', error)
        setGenerateError(true)
        setLoading(false)
        return
      }
    }

    // 2. Materialize rows for this week if the plan is newer than the rows we have.
    const [{ data: existing }, { data: pantryItems }, { data: stapleRows }] = await Promise.all([
      supabase.from('list_items').select('id, source, created_at').eq('user_id', uid).eq('week_start', ws),
      supabase.from('pantry_items').select('name').eq('user_id', uid),
      supabase.from('staples').select('*').eq('user_id', uid).order('created_at'),
    ])
    setStaples((stapleRows as Staple[]) ?? [])
    const planRows = (existing ?? []).filter((r) => r.source === 'plan')
    const newestPlanRow = planRows.reduce((m, r) => (r.created_at > m ? r.created_at : m), '')
    const planIsNewer = !planRows.length || plan.created_at > newestPlanRow

    if (planIsNewer && planList) {
      if (planRows.length) await supabase.from('list_items').delete().in('id', planRows.map((r) => r.id))
      const pantryNames = new Set((pantryItems ?? []).map((p: { name: string }) => normalizeItemName(p.name)))
      const rows = rowsFromPlanList(planList, { userId: uid, householdId: profile?.household_id ?? null, weekStart: ws, pantryNames })

      // Staples due this week + lunch/breakfast basics (only on first materialization for the week).
      const firstTime = !(existing ?? []).length
      if (firstTime) {
        const due = dueStaples((stapleRows as Staple[]) ?? [], ws)
        for (const s of due) {
          rows.push({ user_id: uid, household_id: profile?.household_id ?? null, week_start: ws, name: s.name, quantity: s.quantity, unit: s.unit, category: s.category, search_term: s.name, source: 'staples', added_by: null, have: false, checked: false })
        }
        if (due.length) await supabase.from('staples').update({ last_added_week: ws }).in('id', due.map((s) => s.id))
        const extras: GroceryItem[] = [
          ...(settings.plan.includeLunches ? basicsFor('lunch', profile?.family_size || 4) : []),
          ...(settings.plan.includeBreakfasts ? basicsFor('breakfast', profile?.family_size || 4) : []),
        ]
        const have = new Set(rows.map((r) => normalizeItemName(r.name)))
        for (const e of extras) {
          if (have.has(normalizeItemName(e.name))) continue
          rows.push({ user_id: uid, household_id: profile?.household_id ?? null, week_start: ws, name: e.name, quantity: e.quantity, unit: e.unit, category: e.category, search_term: e.searchTerm, source: 'extra', added_by: null, have: false, checked: false })
        }
      }
      if (rows.length) await supabase.from('list_items').insert(rows)
    }

    await loadItems(uid, ws)
    setLoading(false)
  }, [supabase, loadItems])

  useEffect(() => { load() }, [load])

  /* ---------- item actions ---------- */
  async function toggleChecked(item: ListItem) {
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, checked: !x.checked } : x)))
    await supabase.from('list_items').update({ checked: !item.checked }).eq('id', item.id)
  }
  async function toggleHave(item: ListItem) {
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, have: !x.have } : x)))
    await supabase.from('list_items').update({ have: !item.have }).eq('id', item.id)
  }
  async function removeItem(item: ListItem) {
    setItems((xs) => xs.filter((x) => x.id !== item.id))
    await supabase.from('list_items').delete().eq('id', item.id)
  }
  async function addItem(raw: string, category?: GroceryCategory, searchTerm?: string, source: ListItem['source'] = 'manual') {
    if (!userId || !weekStart) return
    const { name, quantity, unit } = source === 'manual' ? parseTypedItem(raw) : { name: raw, quantity: '1', unit: '' }
    const exists = items.find((i) => normalizeItemName(i.name) === normalizeItemName(name))
    if (exists) {
      if (exists.have) await toggleHave(exists)
      return
    }
    const { data } = await supabase.from('list_items').insert({
      user_id: userId, household_id: householdId, week_start: weekStart, name, quantity, unit: unit || null, category: category ?? guessCategory(name),
      search_term: searchTerm ?? name, source, added_by: null,
    }).select('*').single()
    if (data) setItems((xs) => [...xs, data as ListItem])
  }

  /* ---------- staples ---------- */
  async function addStaple(e: React.FormEvent) {
    e.preventDefault()
    const name = stapleDraft.trim()
    if (!name || !userId) return
    const { data } = await supabase.from('staples').insert({ user_id: userId, name, category: guessCategory(name), every_weeks: 1 }).select('*').single()
    if (data) setStaples((s) => [...s, data as Staple])
    setStapleDraft('')
    await addItem(name, guessCategory(name), name, 'staples')
  }
  async function setStapleCadence(s: Staple, every: number) {
    setStaples((xs) => xs.map((x) => (x.id === s.id ? { ...x, every_weeks: every } : x)))
    await supabase.from('staples').update({ every_weeks: every }).eq('id', s.id)
  }
  async function removeStaple(s: Staple) {
    setStaples((xs) => xs.filter((x) => x.id !== s.id))
    await supabase.from('staples').delete().eq('id', s.id)
  }

  /* ---------- share / copy / print ---------- */
  const text = useMemo(() => listToText(items, formatQuantity), [items])
  async function copyList() {
    try { await navigator.clipboard.writeText(`DinnerDrop grocery list\n\n${text}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }
  async function shareList() {
    const payload = { title: 'This week\'s grocery list', text: `DinnerDrop grocery list\n\n${text}` }
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share(payload); return } catch { /* cancelled */ }
    }
    await copyList()
  }

  /* ---------- Kroger ---------- */
  const shoppable = useMemo(() => shoppableItems(items), [items])
  const shoppableCount = Object.values(shoppable).reduce((n, arr) => n + arr.length, 0)
  const haveCount = items.filter((i) => i.have).length

  async function handleKrogerCart() {
    if (!krogerConnected) { window.location.href = '/api/kroger/auth'; return }
    setKrogerLoading(true)
    setKrogerResult(null)
    try {
      const res = await fetch('/api/kroger/add-to-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groceryList: shoppable }),
      })
      const data = await res.json()
      if (res.status === 403) {
        setKrogerConnected(false)
        setKrogerResult({ type: 'error', message: 'Kroger session expired. Please reconnect.' })
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to add to cart')
      setKrogerResult({ type: 'success', message: `Added ${data.added} of ${data.total} items to your Kroger cart.` })
    } catch (error) {
      setKrogerResult({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add items to Kroger cart.' })
    } finally {
      setKrogerLoading(false)
    }
  }

  /* ---------- states ---------- */
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
          <Link href="/dashboard" className="inline-block px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">Back to dashboard</Link>
        </div>
      </div>
    )
  }
  if (noPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-foreground font-medium">No meal plan found</p>
          <p className="text-muted-foreground">Generate a meal plan first from your dashboard.</p>
          <Link href="/dashboard" className="inline-block mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">Go to dashboard</Link>
        </div>
      </div>
    )
  }

  const over = budget > 0 && totalCost > budget
  const restChips = REST_OF_WEEK.filter((c) => !items.some((i) => normalizeItemName(i.name) === normalizeItemName(c.name)))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Grocery list</p>
            <h1 className="text-4xl font-heading font-bold text-foreground">Your grocery list</h1>
            <p className="text-muted-foreground mt-2">
              {isPartner ? 'Shared with your household — anything either of you adds shows up for both. ' : ''}This week&apos;s dinners plus anything else your house needs. Tap <em>have?</em> on what&apos;s already in the kitchen — it stays off the cart.
            </p>
          </div>
          <div className="flex gap-1 print:hidden">
            <button onClick={copyList} title="Copy" className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted">{copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}</button>
            <button onClick={shareList} title="Share" className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Share2 className="w-4 h-4" /></button>
            <button onClick={() => window.print()} title="Print" className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Printer className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Budget bar */}
        {budget > 0 && (
          <div className="mb-6 rounded-xl border border-border p-4 print:hidden">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dinners this week (estimate)</span>
              <span className={`font-semibold ${over ? 'text-destructive' : 'text-primary'}`}>${totalCost.toFixed(0)} of ${budget} budget</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${over ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(100, (totalCost / budget) * 100)}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {over ? 'A little over — swap one dinner for a budget pick on your dashboard, or mark pantry items you already have.' : `About $${Math.max(0, budget - totalCost).toFixed(0)} of room for the rest of the week.`}
            </p>
          </div>
        )}

        <GroceryList
          items={items}
          onToggleChecked={toggleChecked}
          onToggleHave={toggleHave}
          onRemove={removeItem}
          onAdd={(name, category) => addItem(name, category)}
        />

        {/* Rest of your week */}
        {restChips.length > 0 && (
          <div className="mt-10 rounded-2xl border border-accent/30 bg-accent/5 p-5 print:hidden">
            <h2 className="font-heading font-semibold text-foreground">Add the rest of your week</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-3">One cart, one delivery. Tap what you&apos;re running low on and it rides along with the dinner ingredients.</p>
            <div className="flex flex-wrap gap-2">
              {restChips.slice(0, 14).map((c) => (
                <button key={c.name} onClick={() => addItem(c.name, c.category, c.searchTerm, 'extra')} className="px-3 py-1.5 rounded-full border border-border bg-white text-sm text-foreground hover:border-primary/50 hover:text-primary">
                  + {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Staples */}
        <div className="mt-6 rounded-2xl border border-border p-5 print:hidden">
          <button onClick={() => setShowStaples((s) => !s)} className="w-full flex items-center justify-between text-left">
            <div>
              <h2 className="font-heading font-semibold text-foreground">Staples</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Things you buy every week (or every other). They land on the list automatically.</p>
            </div>
            <span className="text-sm text-primary font-semibold">{showStaples ? 'Hide' : staples.length ? `${staples.length} saved` : 'Set up'}</span>
          </button>
          {showStaples && (
            <div className="mt-4 space-y-3">
              <form onSubmit={addStaple} className="flex gap-2">
                <input value={stapleDraft} onChange={(e) => setStapleDraft(e.target.value)} placeholder="Milk, eggs, coffee, bananas…" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <button type="submit" disabled={!stapleDraft.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Save</button>
              </form>
              {staples.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{s.name}</span>
                  <div className="flex items-center gap-2">
                    <select value={s.every_weeks} onChange={(e) => setStapleCadence(s, Number(e.target.value))} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                      <option value={1}>every week</option>
                      <option value={2}>every 2 weeks</option>
                      <option value={3}>every 3 weeks</option>
                      <option value={4}>monthly</option>
                    </select>
                    <button onClick={() => removeStaple(s)} className="text-xs text-muted-foreground hover:text-destructive">remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 p-5 rounded-xl bg-foreground print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-foreground/60">Dinner ingredients, estimated</span>
            <span className="text-2xl font-heading font-bold text-primary-foreground">${totalCost.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-primary-foreground/50 mt-1">{shoppableCount} items go to the cart{haveCount ? ` · ${haveCount} you already have stay off it` : ''}.</p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border sm:static sm:mt-6 sm:p-0 sm:bg-transparent sm:border-0 print:hidden">
          <p className="hidden sm:block text-xs font-semibold tracking-widest text-primary uppercase mb-3">Send to your cart</p>
          <div className="space-y-4">
            <InstacartButton groceryList={shoppable} />
            <div className="space-y-2">
              {krogerConnected ? (
                <button onClick={handleKrogerCart} disabled={krogerLoading || shoppableCount === 0} className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#0067A0] text-white font-semibold text-base hover:bg-[#005a8c] disabled:opacity-50 transition-colors shadow-lg">
                  {krogerLoading ? 'Adding to cart...' : 'Send to Kroger cart'}
                </button>
              ) : !isFamily ? (
                <Link href="/subscribe" className="inline-block w-full sm:w-auto text-center px-8 py-3 rounded-lg border-2 border-[#0067A0] text-[#0067A0] font-semibold text-base hover:bg-[#0067A0]/5 transition-colors">
                  Kroger cart push &mdash; included with Family
                </Link>
              ) : (
                <button onClick={() => { window.location.href = '/api/kroger/auth' }} className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#0067A0] text-white font-semibold text-base hover:bg-[#005a8c] transition-colors shadow-lg">
                  Connect Kroger to send to cart
                </button>
              )}
              {krogerResult && (
                <p className={`text-sm ${krogerResult.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{krogerResult.message}</p>
              )}
              {!krogerResult && (
                <p className="text-[11px] text-muted-foreground">
                  {isFamily || krogerConnected
                    ? 'Pushes ingredients directly into your Kroger.com cart. You review and check out there.'
                    : 'Family is $4.99/month or $39/year after a 14-day free trial.'}
                </p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Your cart fills in your own Instacart or Kroger account; you review every item and check out there at the store&apos;s normal prices. DinnerDrop may earn a commission when you shop through these links, at no extra cost to you.{' '}
            <a href="/disclosure" className="underline hover:text-foreground">Learn more</a>.
          </p>
        </div>

        <div className="h-32 sm:hidden" />
      </div>
    </div>
  )
}
