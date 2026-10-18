'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Copy, Printer, Share2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import GroceryList, { formatQuantity } from '@/components/GroceryList'
import { matchSale, type WeeklySales } from '@/lib/sales-shared'
import RestOfShop from '@/components/RestOfShop'
import StoreCompare from '@/components/StoreCompare'
import type { StorePref } from '@/lib/compare'
import { familyUsuals, type UsualItem } from '@/lib/aisle'
import InstacartButton from '@/components/InstacartButton'
import { mergeSettings } from '@/lib/settings'
import { resolvePlanOwner } from '@/lib/household'
import {
  type ListItem, type Staple, rowsFromPlanList, dueStaples, basicsFor, shoppableItems,
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
  const [sales, setSales] = useState<WeeklySales[]>([])
  const [priceFactor, setPriceFactor] = useState(1)
  const [usuals, setUsuals] = useState<UsualItem[]>([])
  const [myStores, setMyStores] = useState<StorePref[]>([])
  const [split, setSplit] = useState<Record<string, string> | null>(null)
  const [splitStores, setSplitStores] = useState<[string, string] | null>(null)
  const [actualStore, setActualStore] = useState('')
  const [lastWeekExtras, setLastWeekExtras] = useState<UsualItem[]>([])
  const [askActual, setAskActual] = useState<{ id: string; est: number | null } | null>(null)
  const [actualDraft, setActualDraft] = useState('')
  const [actualSaved, setActualSaved] = useState<string | null>(null)
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
    const rows = (data as ListItem[]) ?? []
    setItems(rows)
    // Typical-price estimates for lines that don't come from the plan (texted, added, basics).
    const missing = rows.filter((r) => r.est_price == null).map((r) => r.id)
    if (missing.length) {
      fetch('/api/list/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: missing }) })
        .then((r) => r.json())
        .then((j: { prices?: Record<string, number> }) => { if (j.prices) setItems((xs) => xs.map((x) => (j.prices![x.id] != null ? { ...x, est_price: j.prices![x.id] } : x))) })
        .catch(() => {})
    }
  }, [supabase])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const owner = await resolvePlanOwner(supabase, user.id)
    const uid = owner.ownerId   // partners share the household owner's plan and list
    setUserId(uid)
    setIsPartner(owner.isPartner)
    fetch('/api/sales', { cache: 'no-store' }).then((r) => r.json()).then((j) => setSales(j.sets ?? [])).catch(() => {})
    supabase.from('grocery_handoffs').select('id, est_total, actual_total, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1)
      .then(({ data: hs }) => {
        const h = hs?.[0]
        if (h && h.actual_total == null && Date.now() - new Date(h.created_at).getTime() < 5 * 86400000) setAskActual({ id: h.id, est: h.est_total == null ? null : Number(h.est_total) })
      })

    const { data: profile } = await supabase
      .from('profiles')
      .select('kroger_access_token, kroger_token_expires_at, subscription_status, is_beta_member, family_until, household_id, settings, weekly_budget, family_size')
      .eq('id', uid)
      .single()

    const settings = mergeSettings(profile?.settings)

    setPriceFactor(Number(settings.stores.priceFactor) || 1)
    setMyStores(Array.isArray(settings.stores.myStores) ? settings.stores.myStores : [])
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
    // The family's usuals: non-dinner lines from earlier weeks.
    supabase.from('list_items').select('name, category, search_term, quantity, unit, week_start, source')
      .eq('user_id', uid).neq('week_start', ws).in('source', ['manual', 'sms', 'extra', 'staples']).order('created_at', { ascending: false }).limit(400)
      .then(({ data: hist }) => {
        const rows = (hist ?? []) as Parameters<typeof familyUsuals>[0]
        setUsuals(familyUsuals(rows))
        const weeks = rows.map((r) => r.week_start ?? '').filter(Boolean).sort().reverse()
        const prev = weeks[0]
        setLastWeekExtras(prev ? familyUsuals(rows.filter((r) => r.week_start === prev)) : [])
      })
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
  async function addItem(raw: string, category?: GroceryCategory, searchTerm?: string, source: ListItem['source'] = 'manual', qty?: { quantity?: string; unit?: string }) {
    if (!userId || !weekStart) return
    const { name, quantity, unit } = source === 'manual' ? parseTypedItem(raw) : { name: raw, quantity: qty?.quantity ?? '1', unit: qty?.unit ?? '' }
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
  const planCount = items.filter((i) => i.source === 'plan' && !i.have).length || 1
  const baseline = useCallback((i: ListItem): number => (Number(i.est_price) > 0 ? Number(i.est_price) : i.source === 'plan' ? totalCost / planCount : 0), [totalCost, planCount])
  const splitLists = useMemo(() => {
    if (!split || !splitStores) return null
    const [a, b] = splitStores
    const pick = (store: string) => shoppableItems(items.filter((i) => (split[i.id] ?? a) === store))
    return { [a]: pick(a), [b]: pick(b) } as Record<string, ReturnType<typeof shoppableItems>>
  }, [split, splitStores, items])
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

  // Honest total: plan dinners (still to buy) + every other unchecked line with an estimate, at typical prices,
  // then at this family's store (learned from real orders).
  const openRows = items.filter((i) => !i.have && !i.checked)
  const dinnersEst = openRows.filter((i) => i.source === 'plan').reduce((n, i) => n + baseline(i), 0)
  const extrasEst = openRows.filter((i) => i.source !== 'plan').reduce((n, i) => n + baseline(i), 0)
  const unpricedExtras = openRows.filter((i) => i.source !== 'plan' && !(baseline(i) > 0)).length
  const listEst = dinnersEst + extrasEst
  const storeEst = listEst * (priceFactor || 1)
  const over = budget > 0 && storeEst > budget

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
              <span className="text-muted-foreground">Everything on the list{priceFactor !== 1 ? ' (at your store)' : ' (estimate)'}</span>
              <span className={`font-semibold ${over ? 'text-destructive' : 'text-primary'}`}>${storeEst.toFixed(0)} of ${budget} budget</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${over ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(100, (storeEst / budget) * 100)}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {over ? 'Over — swap one dinner for a budget pick on your dashboard, or mark pantry items you already have.' : `About $${Math.max(0, budget - storeEst).toFixed(0)} of room for the rest of the week.`}
            </p>
          </div>
        )}

        <GroceryList
          items={items}
          saleFor={sales.length ? (name) => matchSale(name, sales) : undefined}
          storeFor={split && splitStores ? (i) => split[i.id] ?? splitStores[0] : undefined}
          onMoveStore={split && splitStores ? (i) => setSplit((m) => ({ ...(m ?? {}), [i.id]: (m?.[i.id] ?? splitStores[0]) === splitStores[0] ? splitStores[1] : splitStores[0] })) : undefined}
          onToggleChecked={toggleChecked}
          onToggleHave={toggleHave}
          onRemove={removeItem}
          onAdd={(name, category) => addItem(name, category)}
        />

        {/* The rest of the shop */}
        <RestOfShop
          onList={(name) => items.some((i) => normalizeItemName(i.name) === normalizeItemName(name) && !i.have)}
          usuals={usuals}
          lastWeekExtras={lastWeekExtras}
          saleFor={sales.length ? (name) => matchSale(name, sales) : undefined}
          onAdd={(p) => addItem(p.name, p.category, p.searchTerm, 'extra', { quantity: p.quantity, unit: p.unit })}
          onAddMany={async (ps) => { for (const p of ps) await addItem(p.name, p.category, p.searchTerm, 'extra', { quantity: p.quantity, unit: p.unit }) }}
        />

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

        <StoreCompare
          items={items}
          baseline={baseline}
          stores={myStores}
          sets={sales}
          globalFactor={priceFactor}
          split={split}
          onSplit={(assign, stores) => { setSplit(assign); setSplitStores(stores) }}
        />

        <div className="mt-8 p-5 rounded-xl bg-foreground print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-foreground/60">{priceFactor !== 1 ? 'Expected at your store' : 'Whole list, estimated'}</span>
            <span className="text-2xl font-heading font-bold text-primary-foreground">${storeEst.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-primary-foreground/50 mt-1">
            Dinners ${dinnersEst.toFixed(0)}{extrasEst > 0 ? ` + other items $${extrasEst.toFixed(0)}` : ''}{unpricedExtras ? ` (+${unpricedExtras} unpriced)` : ''} at typical prices
            {priceFactor !== 1 ? ` × ${priceFactor.toFixed(2)} for your store and fees, learned from your orders` : ' — Instacart prices and fees usually run 20–30% higher'}.
            {' '}{shoppableCount} items go to the cart{haveCount ? ` · ${haveCount} you already have stay off it` : ''}.
          </p>
          {askActual && !actualSaved && (
            <form onSubmit={async (e) => { e.preventDefault(); const t = Number(actualDraft.replace(/[^0-9.]/g, '')); if (!t) return; const r = await fetch('/api/handoff/actual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total: t, store: actualStore || undefined }) }); const j = await r.json(); if (r.ok) { setActualSaved(j.factor ? `Thanks — your store runs about ${j.factor.toFixed(2)}× our estimates. Future lists use that.` : 'Thanks — saved.'); if (j.factor) setPriceFactor(j.factor); setAskActual(null) } }} className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-primary-foreground/70">What did your last order come to{askActual.est ? ` (we estimated $${askActual.est.toFixed(0)})` : ''}?</span>
              <input value={actualDraft} onChange={(e) => setActualDraft(e.target.value)} inputMode="decimal" placeholder="$0.00" className="w-28 rounded-md px-2 py-1 text-sm text-foreground" />
              {myStores.length > 0 && (
                <select value={actualStore} onChange={(e) => setActualStore(e.target.value)} className="rounded-md px-2 py-1 text-sm text-foreground">
                  <option value="">which store?</option>
                  {myStores.map((st) => <option key={st.name} value={st.name}>{st.name}</option>)}
                </select>
              )}
              <button type="submit" className="px-3 py-1 rounded-md bg-primary-foreground text-foreground text-xs font-semibold">Save</button>
            </form>
          )}
          {actualSaved && <p className="text-xs text-primary-foreground/80 mt-2">{actualSaved}</p>}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border sm:static sm:mt-6 sm:p-0 sm:bg-transparent sm:border-0 print:hidden">
          <p className="hidden sm:block text-xs font-semibold tracking-widest text-primary uppercase mb-3">Send to your cart</p>
          <div className="space-y-4">
            {splitLists && splitStores ? (
              <div className="space-y-3">
                {splitStores.map((st) => {
                  const n = Object.values(splitLists[st]).reduce((k, arr) => k + arr.length, 0)
                  return (
                    <div key={st} className="flex flex-wrap items-center gap-3">
                      <InstacartButton groceryList={splitLists[st]} estTotal={undefined} weekStart={weekStart ?? undefined} store={st} />
                      <span className="text-xs text-muted-foreground">{n} items · pick {st} when the list opens</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <InstacartButton groceryList={shoppable} estTotal={storeEst} weekStart={weekStart ?? undefined} />
            )}
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
