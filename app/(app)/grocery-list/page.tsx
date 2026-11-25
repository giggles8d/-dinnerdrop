'use client'

import { WEEKEND_OFFER, weekendOfferOpen } from '@/lib/weekend-offer-config'
import ReceiptRewardBanner from '@/components/ReceiptRewardBanner'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Copy, Printer, Share2, Check, Eraser } from 'lucide-react'
import { isNativeApp, nativePrefGet, nativePrefRemove, nativePrefSet, nativeShare, tapHaptic } from '@/lib/native'
import { trackOnce, track } from '@/lib/activation'
import EngagementTracker from '@/components/EngagementTracker'
import { createClient } from '@/lib/supabase'
import GroceryList, { formatQuantity } from '@/components/GroceryList'
import { mealsUsing } from '@/lib/overlap'
import { toPackages } from '@/lib/package-match'
import { matchSale, isUpcoming, type WeeklySales } from '@/lib/sales-shared'
import DealsBanner from '@/components/DealsBanner'
import PantryCheck from '@/components/PantryCheck'
import StockUpDeals from '@/components/StockUpDeals'
import SwapToSave from '@/components/SwapToSave'
import RestOfShop from '@/components/RestOfShop'
import StoreCompare from '@/components/StoreCompare'
import ReceiptUpload from '@/components/ReceiptUpload'
import CartTextOffer from '@/components/CartTextOffer'
import LastCallCard from '@/components/LastCallCard'
import type { StorePref } from '@/lib/compare'
import { familyUsuals, type UsualItem } from '@/lib/aisle'
import InstacartButton from '@/components/InstacartButton'
import InStoreSend from '@/components/InStoreSend'
import WalmartButton from '@/components/WalmartButton'
import WalmartPicks from '@/components/WalmartPicks'
import InAppBrowserNotice from '@/components/InAppBrowserNotice'
import KrogerReview from '@/components/KrogerReview'
import SidesCard from '@/components/SidesCard'
import { mergeSettings, tripsConfig, WEEKDAY_LABEL } from '@/lib/settings'
import { applyPrefsToRows, cleanPrefs } from '@/lib/product-prefs'
import { isClassic, tripInstances, weekStartOf } from '@/lib/trips'
import { resolvePlanOwner } from '@/lib/household'
import {
  type ListItem, type Staple, rowsFromPlanList, dueStaples, basicsFor, shoppableItems, sameListItem, lineCovers,
  listToText, guessCategory, normalizeItemName, parseTypedItem,
} from '@/lib/list'
import type { GroceryCategory, GroceryItem, Meal } from '@/types'
import { DEFAULT_FACTOR, familyFactor, fallbackPrice } from '@/lib/price-factor'

type GroceryListData = Record<GroceryCategory, GroceryItem[]>

/** Pantry items a family buys once a week; later trips mark them "have it" (Settings → Plan shape). */
const PANTRY_FIRST_TRIP = /\b(garlic|(?<!green |spring )(yellow |white |red )?onions?|shallots?|salt|black pepper|spices?|seasoning|cumin|paprika|oregano|dried thyme|cinnamon|chili powder|(olive |vegetable |canola )?oil|vinegar|soy sauce|butter|flour|sugar|rice|(shredded |grated )?(parmesan|cheddar|mozzarella)( cheese)?|broth|stock|ketchup|mustard|mayonnaise|honey)\b/i
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
function weekdayOfKey(date: string): (typeof WEEKDAY_KEYS)[number] {
  return WEEKDAY_KEYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7]
}

export default function GroceryListPage() {
  const [justPicked, setJustPicked] = useState(false)
  const [listSentHere, setListSentHere] = useState(false)
  useEffect(() => { try { setJustPicked(new URLSearchParams(window.location.search).get('picked') === '1') } catch { /* ignore */ } }, [])
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [isPartner, setIsPartner] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [planMeals, setPlanMeals] = useState<Meal[]>([])
  const [sales, setSales] = useState<WeeklySales[]>([])
  const [stockUpOn, setStockUpOn] = useState(true)
  const [storeQuotes, setStoreQuotes] = useState<Array<{ store: string; total: number; item_count: number | null; missing: string[]; created_at: string }>>([])
  const [priceFactor, setPriceFactor] = useState(1)
  const [storeBrand, setStoreBrand] = useState(false)
  const [inStore, setInStore] = useState(false)
  const [usuals, setUsuals] = useState<UsualItem[]>([])
  const [myStores, setMyStores] = useState<StorePref[]>([])
  const [krogerReview, setKrogerReview] = useState(false)
  const [krogerLoc, setKrogerLoc] = useState<{ id?: string; name?: string }>({})
  const [split, setSplit] = useState<Record<string, string> | null>(null)
  const [splitStores, setSplitStores] = useState<[string, string] | null>(null)
  const [actualStore, setActualStore] = useState('')
  const [lastWeekExtras, setLastWeekExtras] = useState<UsualItem[]>([])
  const [askActual, setAskActual] = useState<{ id: string; est: number | null } | null>(null)
  // The last send to a store whose lines are still on the list: ask whether the order went through.
  // Thanksgiving first-list offer (lib/weekend-offer): shown on the send hero to families who haven't sent a list yet.
  const [neverSent, setNeverSent] = useState(false)
  const [offerStatus, setOfferStatus] = useState<string | null>(null)
  const [pendingSend, setPendingSend] = useState<{ id: string; at: string; store: string | null } | null>(null)
  // The store of the family's most recent send (any age), to put Walmart on top for Walmart families (Nov 25 2026).
  const [lastStore, setLastStore] = useState<string | null>(null)
  // Always-there "Clear list" with an in-page confirm + Undo (Sarah, Nov 25 2026: the sent-order banner
  // only showed for 3 days on the week that was sent, so she couldn't clear a list she'd already shopped).
  const [clearAsk, setClearAsk] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [lastCleared, setLastCleared] = useState<string[] | null>(null)
  const [actualDraft, setActualDraft] = useState('')
  const [actualSaved, setActualSaved] = useState<string | null>(null)
  const [staples, setStaples] = useState<Staple[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [budget, setBudget] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [generateError, setGenerateError] = useState(false)
  const [noPlan, setNoPlan] = useState(false)
  // Shopping trips (Nov 1 2026): one tab per trip this week; classic families never see tabs.
  const tripSel = useRef<string | null>(null)
  const [tripTabs, setTripTabs] = useState<Array<{ key: string; label: string; sub: string; planned: boolean; selected: boolean }>>([])
  const [krogerConnected, setKrogerConnected] = useState(false)
  // Kroger cart push is a Family feature (2026-10-18). Anyone already connected keeps it.
  const [isFamily, setIsFamily] = useState(true)
  const [krogerLoading] = useState(false)
  const [krogerResult, setKrogerResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [recipesMail, setRecipesMail] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  async function emailRecipes() {
    setRecipesMail('sending')
    try { const r = await fetch('/api/email/recipes', { method: 'POST' }); setRecipesMail(r.ok ? 'sent' : 'error') } catch { setRecipesMail('error') }
  }
  const [copied, setCopied] = useState(false)
  // Pin a slim "Shop ingredients" bar to the bottom while the send section is off screen (phones too, since Nov 1:
  // the whole send panel used to be pinned on phones and covered half the list).
  const sendRef = useRef<HTMLDivElement | null>(null)
  const [sendInView, setSendInView] = useState(true)
  useEffect(() => {
    const el = sendRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setSendInView(e.isIntersecting), { rootMargin: '0px 0px -40px 0px' })
    io.observe(el)
    return () => io.disconnect()
  })
  const heroRef = useRef<HTMLDivElement | null>(null)
  const [heroInView, setHeroInView] = useState(false)
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setHeroInView(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  })
  const [ordered, setOrdered] = useState<ListItem[]>([])
  const [showOrdered, setShowOrdered] = useState(false)
  const [stapleDraft, setStapleDraft] = useState('')
  const [showStaples, setShowStaples] = useState(false)

  const loadItems = useCallback(async (uid: string, ws: string) => {
    const { data } = await supabase.from('list_items').select('*').eq('user_id', uid).eq('week_start', ws).order('created_at')
    const all = (data as ListItem[]) ?? []
    // Lines already sent to a store leave the active list; new texts/adds start a fresh one.
    let rows = all.filter((r) => !r.ordered_at)
    // Native app: items checked off on the offline list (no signal in the store) sync now.
    if (isNativeApp()) {
      const pending = await nativePrefGet('dd.grocery.pending')
      if (pending) {
        try {
          const map = JSON.parse(pending) as Record<string, boolean>
          const changed = rows.filter((r) => map[r.id] != null && map[r.id] !== r.checked)
          await Promise.all(changed.map((r) => supabase.from('list_items').update({ checked: map[r.id] }).eq('id', r.id)))
          rows = rows.map((r) => (map[r.id] != null ? { ...r, checked: map[r.id] } : r))
        } catch { /* ignore a bad cache */ }
        await nativePrefRemove('dd.grocery.pending')
      }
    }
    setItems(rows)
    setOrdered(all.filter((r) => !!r.ordered_at).sort((a, b) => (b.ordered_at! > a.ordered_at! ? 1 : -1)))
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
    fetch('/api/sales', { cache: 'no-store' }).then((r) => r.json()).then((j) => { setSales(j.sets ?? []); setStoreQuotes(j.quotes ?? []) }).catch(() => {})
    supabase.from('grocery_handoffs').select('id, est_total, actual_total, created_at, store').eq('user_id', uid).order('created_at', { ascending: false }).limit(1)
      .then(({ data: hs }) => {
        const h = hs?.[0]
        setNeverSent(!h)
        setLastStore(h?.store ?? null)
        if (h && h.actual_total == null && Date.now() - new Date(h.created_at).getTime() < 5 * 86400000) setAskActual({ id: h.id, est: h.est_total == null ? null : Number(h.est_total) })
        let dismissed = false
        try { dismissed = !!h && localStorage.getItem(`dd.send.${h.id}`) === 'keep' } catch { /* ignore */ }
        if (h && h.actual_total == null && !dismissed && Date.now() - new Date(h.created_at).getTime() < 3 * 86400000) setPendingSend({ id: h.id, at: h.created_at, store: h.store ?? null })
        else setPendingSend(null)
      })

    // Profile and the newest plan together, not one after the other (first-list speed, Nov 25 2026).
    const [{ data: profile }, latest] = await Promise.all([
      supabase
        .from('profiles')
        .select('subscription_status, is_beta_member, family_until, household_id, settings, weekly_budget, family_size')
        .eq('id', uid)
        .single(),
      supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    const settings = mergeSettings(profile?.settings)

    setPriceFactor(Number(settings.stores.priceFactor) || 1)
    setStoreBrand(!!settings.stores.storeBrand)
    setInStore(settings.stores.mode === 'instore')
    setMyStores(Array.isArray(settings.stores.myStores) ? settings.stores.myStores : [])
    setStockUpOn(settings.deals.stockUp)
    setKrogerLoc({ id: settings.stores.krogerLocationId, name: settings.stores.krogerLocationName })
    if (profile) {
      const status = profile.subscription_status
      const familyUntil = profile.family_until ? new Date(profile.family_until) > new Date() : false
      setIsFamily(status === 'active' || status === 'trialing' || status === 'past_due' || !!profile.is_beta_member || familyUntil)
      // Kroger: ask the server (tokens never come to the page; an expired 30-min token still counts while it can be refreshed).
      // In the background now: the list no longer waits on it (Nov 25 2026). A connected Kroger account also counts as Family.
      fetch('/api/kroger/status', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ connected: false }))
        .then((k: { connected?: boolean }) => { setKrogerConnected(!!k.connected); if (k.connected) setIsFamily(true) })
      setOfferStatus(status ?? null)
      setHouseholdId(profile.household_id ?? null)
      setBudget(Number(String(profile.weekly_budget ?? '').replace(/[^0-9.]/g, '')) || 0)
    }

    let plan = latest.data

    // Shopping trips: pick this trip's plan (tab) instead of simply the newest plan.
    const tcfg = tripsConfig(settings)
    const tripMode = !isClassic(tcfg)
    let earlierKeys: string[] = []
    let pastTripKeys: string[] = []
    if (tripMode) {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      pastTripKeys = tripInstances(tcfg, today).filter((t) => t.shopDate < today).map((t) => t.key)
      const insts = tripInstances(tcfg, today).filter((t) => t.nights.length > 0 && (t.nights[t.nights.length - 1]?.date ?? t.shopDate) >= today).slice(0, 3)
      const { data: tripPlans } = await supabase.from('meal_plans').select('*').eq('user_id', uid).in('week_start', insts.map((t) => t.key)).order('created_at', { ascending: false })
      const byKey = new Map<string, typeof plan>()
      for (const p of tripPlans ?? []) if (!byKey.has(p.week_start)) byKey.set(p.week_start, p)
      const pick = (tripSel.current ? byKey.get(tripSel.current) : undefined) ?? insts.map((t) => byKey.get(t.key)).find(Boolean)
      if (pick) plan = pick
      const short = (d: string) => WEEKDAY_LABEL[d as keyof typeof WEEKDAY_LABEL].slice(0, 3)
      setTripTabs(insts.map((t) => {
        const first = t.nights[0]?.day, last = t.nights[t.nights.length - 1]?.day
        return {
          key: t.key,
          label: `Trip ${t.index + 1} · ${WEEKDAY_LABEL[weekdayOfKey(t.shopDate)].slice(0, 3)} ${Number(t.shopDate.slice(5, 7))}/${Number(t.shopDate.slice(8, 10))}`,
          sub: first ? `${short(first)}${last && last !== first ? `–${short(last)}` : ''} dinners` : 'no dinners',
          planned: byKey.has(t.key),
          selected: !!pick && pick.week_start === t.key,
        }
      }))
      if (pick) {
        const inst = insts.find((t) => t.key === pick.week_start)
        if (inst) earlierKeys = tripInstances(tcfg, inst.shopDate).filter((t) => weekStartOf(t.shopDate, tcfg.weekStart) === weekStartOf(inst.shopDate, tcfg.weekStart) && t.shopDate < inst.shopDate).map((t) => t.key)
      }
    } else {
      setTripTabs([])
    }

    if (!plan) { setNoPlan(true); setLoading(false); return }
    setTotalCost(plan.total_estimated_cost || 0)
    setPlanMeals((plan.meals as Meal[]) ?? [])
    const ws: string = plan.week_start
    setWeekStart(ws)

    // 1. Make sure the plan has a deduplicated list (generated once per plan).
    let planList: GroceryListData | null = plan.grocery_list && Object.keys(plan.grocery_list).length > 0 ? plan.grocery_list : null
    const rebuilt = !planList // the plan changed (swap, added dinner, servings) and its list was just rebuilt
    // This week's rows, pantry and staples load while the list is (re)built, not after it (Nov 25 2026). The list
    // itself is still built by /api/generate-list (AI, ~12 s) the first time; a no-AI builder waits on branch
    // perf/first-list-fast (Sarah chose to keep the AI list for now).
    const rowsQ = Promise.all([
      supabase.from('list_items').select('id, source, created_at, ordered_at, name, have, quantity, unit').eq('user_id', uid).eq('week_start', ws),
      supabase.from('pantry_items').select('name').eq('user_id', uid),
      supabase.from('staples').select('*').eq('user_id', uid).order('created_at'),
    ])
    if (!planList) {
      try {
        const res = await fetch('/api/generate-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meals: plan.meals as Meal[], userId: uid, prepped: settings.food.prepped, planId: plan.id }),
        })
        if (!res.ok) throw new Error(`status ${res.status}`)
        planList = await res.json()   // the route saves it on the plan (works for partners too)
      } catch (error) {
        console.error('Error generating grocery list:', error)
        setGenerateError(true)
        setLoading(false)
        return
      }
    }

    // 2. Materialize rows for this week if the plan is newer than the rows we have.
    const [{ data: existing }, { data: pantryItems }, { data: stapleRows }] = await rowsQ
    setStaples((stapleRows as Staple[]) ?? [])
    const planRows = (existing ?? []).filter((r) => r.source === 'plan')
    const newestPlanRow = planRows.reduce((m, r) => (r.created_at > m ? r.created_at : m), '')
    const planIsNewer = !planRows.length || plan.created_at > newestPlanRow
    // A changed plan refreshes its lines too — unless this week's dinner list was already sent to a store.
    const changedBeforeOrder = rebuilt && !planRows.some((r) => r.ordered_at)

    if ((planIsNewer || changedBeforeOrder) && planList) {
      // Only replace plan lines that are still on the list — ordered ones are history.
      const openPlanRows = planRows.filter((r) => !r.ordered_at)
      if (openPlanRows.length) await supabase.from('list_items').delete().in('id', openPlanRows.map((r) => r.id))
      const pantryNames = new Set((pantryItems ?? []).map((p: { name: string }) => normalizeItemName(p.name)))
      // The family's own products show on the list by name ("Great Value Gluten Free Cream of Chicken Soup").
      const rows = applyPrefsToRows(rowsFromPlanList(planList, { userId: uid, householdId: profile?.household_id ?? null, weekStart: ws, pantryNames }), cleanPrefs(settings.food.productPrefs))
      // Keep "have it" ticks the family already made on lines that are still needed.
      const hadIt = new Set(openPlanRows.filter((r) => r.have).map((r) => normalizeItemName(r.name)))
      for (const row of rows) if (hadIt.has(normalizeItemName(row.name))) row.have = true
      // One line per item: a recipe ingredient the family already put on the list (a dozen eggs, a gallon of milk)
      // merges into that line instead of showing twice. The line still shows which dinners use it.
      const openOther = (existing ?? []).filter((r) => r.source !== 'plan' && !r.ordered_at)
      for (let i = rows.length - 1; i >= 0; i--) {
        const other = openOther.find((o) => sameListItem(o.name, rows[i].name))
        if (other && lineCovers(other, rows[i])) rows.splice(i, 1)
      }
      // Shopping trips: pantry items already on an earlier trip this week are "have it" (bought on that trip).
      if (tripMode && settings.schedule.pantryFirstTrip && earlierKeys.length) {
        const { data: prev } = await supabase.from('list_items').select('name').eq('user_id', uid).in('week_start', earlierKeys).eq('have', false)
        const bought = new Set((prev ?? []).map((r: { name: string }) => normalizeItemName(r.name)))
        for (const row of rows) if (PANTRY_FIRST_TRIP.test(row.name) && bought.has(normalizeItemName(row.name))) row.have = true
      }

      // Staples due this week + lunch/breakfast basics (only on first materialization for the week).
      // First time the plan's lines go on this week's list. A texted "ADD milk" before opening used to count as "not
      // first", so staples, carried items and basics were never added that week (Nov 22 2026 fix, Sarah approved).
      const firstTime = !planRows.length && !(existing ?? []).some((r) => r.source === 'staples' || r.source === 'extra')
      if (firstTime) {
        // Carry over what the family added after the last order (texted or typed) into the new week.
        // Trip mode: only from earlier trips whose shop day has passed (never pull lines off a trip still to shop).
        const carry = supabase.from('list_items').update({ week_start: ws })
          .eq('user_id', uid).neq('week_start', ws).is('ordered_at', null).eq('have', false).eq('checked', false)
          .in('source', ['sms', 'manual']).gte('created_at', new Date(Date.now() - 21 * 86400000).toISOString())
        await (tripMode ? carry.in('week_start', pastTripKeys.length ? pastTripKeys : ['1900-01-01']) : carry)
        const due = dueStaples((stapleRows as Staple[]) ?? [], ws)
        for (const s of due) {
          rows.push({ user_id: uid, household_id: profile?.household_id ?? null, week_start: ws, name: s.name, quantity: s.quantity, unit: s.unit, category: s.category, search_term: s.name, source: 'staples', added_by: null, have: false, checked: false })
        }
        if (due.length) await supabase.from('staples').update({ last_added_week: ws }).in('id', due.map((s) => s.id))
        const extras: GroceryItem[] = [
          ...(settings.plan.includeLunches ? basicsFor('lunch', profile?.family_size || 4) : []),
          ...(settings.plan.includeBreakfasts ? basicsFor('breakfast', profile?.family_size || 4) : []),
        ]
        const onList = [...rows.map((r) => r.name), ...(existing ?? []).filter((r) => !r.ordered_at).map((r) => r.name)]
        for (const e of extras) {
          if (onList.some((n) => sameListItem(n, e.name))) continue
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
  useEffect(() => { trackOnce('grocery_list_view') }, [])
  // Native app: keep a copy of the list on the phone so it still opens with no signal (apps/mobile/www/offline.html).
  useEffect(() => {
    if (!isNativeApp() || !weekStart) return
    const cached = items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, category: i.category, checked: i.checked, have: i.have }))
    nativePrefSet('dd.grocery', JSON.stringify({ week_start: weekStart, savedAt: Date.now(), items: cached }))
  }, [items, weekStart])

  /* ---------- item actions ---------- */
  async function toggleChecked(item: ListItem) {
    tapHaptic()
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, checked: !x.checked } : x)))
    await supabase.from('list_items').update({ checked: !item.checked }).eq('id', item.id)
  }
  async function toggleHave(item: ListItem) {
    tapHaptic()
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, have: !x.have } : x)))
    await supabase.from('list_items').update({ have: !item.have }).eq('id', item.id)
  }
  /** Pantry check (components/PantryCheck): mark the staples they already have so they stay off the cart. */
  async function keepOff(ids: string[]) {
    if (!ids.length) return
    setItems((xs) => xs.map((x) => (ids.includes(x.id) ? { ...x, have: true } : x)))
    await supabase.from('list_items').update({ have: true }).in('id', ids)
    trackOnce('pantry_check_used')
  }
  async function changeQuantity(item: ListItem, quantity: string) {
    tapHaptic()
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, quantity } : x)))
    await supabase.from('list_items').update({ quantity }).eq('id', item.id)
  }
  async function removeItem(item: ListItem) {
    setItems((xs) => xs.filter((x) => x.id !== item.id))
    await supabase.from('list_items').delete().eq('id', item.id)
  }
  async function addItem(raw: string, category?: GroceryCategory, searchTerm?: string, source: ListItem['source'] = 'manual', qty?: { quantity?: string; unit?: string }) {
    if (!userId || !weekStart) return
    const { name, quantity, unit } = source === 'manual' ? parseTypedItem(raw) : { name: raw, quantity: qty?.quantity ?? '1', unit: qty?.unit ?? '' }
    const exists = items.find((i) => !i.ordered_at && (normalizeItemName(i.name) === normalizeItemName(name) || sameListItem(i.name, name)))
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

  /* ---------- ordered (sent to a store) ---------- */
  async function putBack(ids: string[]) {
    if (!ids.length) return
    await supabase.from('list_items').update({ ordered_at: null }).in('id', ids)
    if (userId && weekStart) await loadItems(userId, weekStart)
  }
  const afterSent = () => { if (userId && weekStart) setTimeout(() => { loadItems(userId, weekStart); load() }, 1500) }
  /** The order went through: the lines that were on the list when it was sent come off; later adds stay. */
  async function confirmOrdered() {
    if (!pendingSend || !userId) return
    const ids = items.filter((i) => !i.have && i.created_at <= pendingSend.at).map((i) => i.id)
    if (ids.length) await supabase.from('list_items').update({ ordered_at: new Date().toISOString() }).in('id', ids)
    try { localStorage.setItem(`dd.send.${pendingSend.id}`, 'done') } catch { /* ignore */ }
    setPendingSend(null)
    if (weekStart) await loadItems(userId, weekStart)
  }
  /** Clear every line on this week's list (they move to history as bought); Undo puts them back. */
  async function clearList() {
    if (!userId || !weekStart || clearing) return
    const ids = items.map((i) => i.id)
    if (!ids.length) { setClearAsk(false); return }
    setClearing(true)
    const { error } = await supabase.from('list_items').update({ ordered_at: new Date().toISOString() }).in('id', ids)
    setClearing(false)
    setClearAsk(false)
    if (error) return
    if (pendingSend) { try { localStorage.setItem(`dd.send.${pendingSend.id}`, 'done') } catch { /* ignore */ } setPendingSend(null) }
    setLastCleared(ids)
    track('cta_tap', { id: 'clear_list', page: 'grocery-list', n: ids.length })
    await loadItems(userId, weekStart)
  }
  async function undoClear() {
    if (!lastCleared) return
    const ids = lastCleared
    setLastCleared(null)
    await putBack(ids)
  }
  function keepShopping() {
    if (!pendingSend) return
    try { localStorage.setItem(`dd.send.${pendingSend.id}`, 'keep') } catch { /* ignore */ }
    setPendingSend(null)
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
    if (await nativeShare(payload)) return
    await copyList()
  }

  /* ---------- Kroger ---------- */
  const shoppable = useMemo(() => shoppableItems(items), [items])
  const planCount = items.filter((i) => i.source === 'plan' && !i.have).length || 1
  const baseline = useCallback((i: ListItem): number => (Number(i.est_price) > 0 ? Number(i.est_price) : i.source === 'plan' ? totalCost / planCount : fallbackPrice(i.name)), [totalCost, planCount])
  const splitLists = useMemo(() => {
    if (!split || !splitStores) return null
    const [a, b] = splitStores
    const pick = (store: string) => shoppableItems(items.filter((i) => (split[i.id] ?? a) === store))
    return { [a]: pick(a), [b]: pick(b) } as Record<string, ReturnType<typeof shoppableItems>>
  }, [split, splitStores, items])
  const shoppableCount = Object.values(shoppable).reduce((n, arr) => n + arr.length, 0)
  // Walmart families: last send went to Walmart, or Walmart is one of their stores (Settings → Stores). Setup's shop
  // screen only asks online vs in store, so it can't tell Walmart from Instacart. Kroger stays where it was.
  const walmartFirst = lastStore === 'Walmart' || myStores.some((s) => /walmart/i.test(s.name))
  const haveCount = items.filter((i) => i.have).length

  async function handleKrogerCart() {
    if (!krogerConnected) { window.location.href = '/api/kroger/auth'; return }
    // Review what Kroger matched (brand, size, price) before anything is pushed.
    setKrogerResult(null)
    setKrogerReview(true)
  }

  /* ---------- states ---------- */
  // Never a blank spinner (Nov 25 2026): the week's dinners show as soon as the plan loads, with the list's place
  // held by placeholder rows, so a family landing here from setup sees their week while the list fills in.
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl" aria-busy="true">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Grocery list</p>
          <h1 className="text-4xl font-heading font-bold text-foreground mt-1">Your groceries are on the way</h1>
          {planMeals.length > 0 && (
            <div className="mt-5 rounded-2xl border border-border bg-white p-4">
              <p className="text-sm font-semibold text-foreground">Your {planMeals.length} dinners</p>
              <ul className="mt-2 space-y-1">
                {planMeals.map((m, i) => <li key={`${m.day}-${i}`} className="text-sm text-muted-foreground">? {m.name}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
            <p className="font-semibold text-foreground" role="status">Building your list?</p>
            <div className="mt-3 space-y-2" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded bg-primary/10 animate-pulse" style={{ width: `${88 - i * 9}%` }} />)}
            </div>
          </div>
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
  const listEst = dinnersEst + extrasEst
  const learned = priceFactor !== 1
  const storeEst = listEst * familyFactor({ priceFactor, mode: inStore ? 'instore' : 'instacart', storeBrand })
  const over = budget > 0 && storeEst > budget

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Grocery list</p>
            <h1 className="text-4xl font-heading font-bold text-foreground">{shoppableCount > 0 ? 'Your groceries are ready' : 'Your grocery list'}</h1>
            {isPartner && <p className="text-muted-foreground mt-2">Shared with your household. Anything either of you adds shows up for both.</p>}
          </div>
          <div className="flex gap-1 print:hidden">
            <button onClick={copyList} title="Copy" className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted">{copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}</button>
            <button onClick={shareList} title="Share" className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Share2 className="w-4 h-4" /></button>
            <button onClick={() => window.print()} title="Print" className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Printer className="w-4 h-4" /></button>
            {items.length > 0 && (
              <button onClick={() => { setClearAsk(true); setLastCleared(null) }} title="Clear list" className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"><Eraser className="w-4 h-4" />Clear</button>
            )}
          </div>
        </div>

        {clearAsk && items.length > 0 && (
          <div role="dialog" aria-label="Clear the list" className="mb-6 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 print:hidden">
            <p className="text-sm font-semibold text-foreground">Clear all {items.length} items from this list?</p>
            <p className="text-sm text-muted-foreground mt-1">Use this after you&apos;ve shopped. Everything comes off this week&apos;s list. Your dinners stay planned, and you can undo right after.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={clearList} disabled={clearing} className="min-h-[44px] px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-60">{clearing ? 'Clearing…' : 'Yes, clear the list'}</button>
              <button onClick={() => setClearAsk(false)} className="min-h-[44px] px-4 py-2 rounded-md border border-border bg-background text-sm font-semibold">Cancel</button>
            </div>
          </div>
        )}
        {lastCleared && (
          <div role="status" className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-foreground"><span className="font-semibold">List cleared.</span> {lastCleared.length} items moved off.</p>
            <button onClick={undoClear} className="min-h-[44px] px-4 py-2 rounded-md border border-border bg-background text-sm font-semibold">Undo</button>
          </div>
        )}

        {/* Inside Facebook/Instagram's browser, Instacart sign-in can fail: offer Safari/Chrome first. */}
        <div className="print:hidden"><InAppBrowserNotice /></div>
        <EngagementTracker page="grocery-list" ready={!loading && items.length > 0} />

        {pendingSend && items.some((i) => !i.have && i.created_at <= pendingSend.at) && (
          <div className="mb-6 rounded-xl border border-accent/50 bg-accent/10 p-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-foreground">
                {pendingSend.store === 'In store' ? (
                  <>
                    <span className="font-semibold">List sent to your phone {new Date(pendingSend.at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.</span>
                    {' '}Done shopping? Clear what you bought. Your items stay on the list until you say so.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Sent to {pendingSend.store?.replace(/^Instacart · /, '') || 'the store'} {new Date(pendingSend.at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.</span>
                    {' '}Did the order go through? Your items stay on the list until you say so.
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <button onClick={confirmOrdered} className="min-h-[44px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold">{pendingSend.store === 'In store' ? 'Yes, clear them' : 'Yes — clear them'}</button>
                <button onClick={keepShopping} className="min-h-[44px] px-3 py-1.5 rounded-md border border-border bg-background text-xs font-semibold">{pendingSend.store === 'In store' ? 'Not yet' : 'Not yet, keep the list'}</button>
              </div>
            </div>
          </div>
        )}

        {ordered.length > 0 && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-foreground">
                <span className="font-semibold">✓ {ordered.length} item{ordered.length === 1 ? '' : 's'} sent to the store</span>
                {' '}{new Date(ordered[0].ordered_at!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — off the list.
                {items.length === 0 ? ' Anything your family texts or you add now starts the next list.' : ''}
              </p>
              <div className="flex gap-3 text-xs font-semibold">
                <button onClick={() => setShowOrdered((v) => !v)} className="text-primary hover:underline">{showOrdered ? 'Hide' : 'Show'}</button>
                <button onClick={() => { if (confirm('Put every sent item back on the list? Use this if the order didn\u2019t go through.')) putBack(ordered.map((o) => o.id)) }} className="text-muted-foreground hover:text-foreground">Didn&apos;t order? Put them back</button>
              </div>
            </div>
            {showOrdered && (
              <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                {ordered.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span className="truncate">{o.name}{o.quantity ? ` · ${formatQuantity(o.quantity, o.unit ?? '')}` : ''}</span>
                    <button onClick={() => putBack([o.id])} className="shrink-0 text-xs text-primary hover:underline">put back</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Send first: the whole point of this page is getting the list into a cart, or onto the phone of a family
            who shops in the store (Nov 22 2026 review, Sarah approved: a list sent for the store counts as a send). */}
        {shoppableCount > 0 && !listSentHere && inStore && (
          <div ref={heroRef} className="mb-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 print:hidden">
            {justPicked && <p className="text-xs font-semibold text-primary mb-1">✓ Your dinners are set. One step left.</p>}
            <p className="font-heading font-bold text-2xl text-foreground">{shoppableCount} items{storeEst > 0 ? ` · about $${Math.round(storeEst)}` : ''}</p>
            <p className="text-sm text-muted-foreground mt-1">Your list for the store, sorted by aisle.</p>
            <div className="mt-4">
              <InStoreSend estTotal={storeEst} weekStart={weekStart ?? undefined} variant="primary" />
            </div>
            <button onClick={() => sendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mt-2 min-h-[44px] text-sm text-muted-foreground underline">or order online: Instacart · Walmart · Kroger ↓</button>
          </div>
        )}
        {/* Send feel v1 (Sarah, Nov 25 2026): 93 of 149 families who saw the Instacart button sent nowhere. The item
            count stays big; the dollar estimate is body size and says it's typical prices; the button reads as saving a
            list (nothing is bought until checkout); "Text me this list" is a full option; families who shop at Walmart
            (last send was Walmart, or Walmart in their stores) get the Walmart button on top. lib/send-variant tags the events. */}
        {shoppableCount > 0 && !listSentHere && !inStore && (
          <div ref={heroRef} className="mb-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 print:hidden">
            {justPicked && <p className="text-xs font-semibold text-primary mb-1">✓ Your dinners are set. One step left.</p>}
            <p className="text-foreground">
              <span className="font-heading font-bold text-2xl">{shoppableCount} items</span>
              {storeEst > 0 && <span className="text-base text-muted-foreground"> · about ${Math.round(storeEst)} at typical prices</span>}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Amounts are matched to store package sizes, so your cart fills in ready to check out.</p>
            {neverSent && !isPartner && weekendOfferOpen() && offerStatus !== 'active' && offerStatus !== 'trialing' && (
              <p className="mt-2 text-sm font-semibold text-foreground">🦃 Send this list to Instacart by Sunday 11:59 PM and get {WEEKEND_OFFER.label}. No card.</p>
            )}
            <div className="mt-4">
              {splitLists && splitStores ? (
                <button onClick={() => sendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#003D29] text-[#FAF1E5] font-semibold">Send to your carts ↓</button>
              ) : walmartFirst ? (
                <WalmartButton groceryList={shoppable} weekStart={weekStart ?? undefined} onSent={() => { setListSentHere(true); afterSent() }} primary />
              ) : (
                <InstacartButton groceryList={shoppable} estTotal={storeEst} weekStart={weekStart ?? undefined} onSent={() => { setListSentHere(true); afterSent() }} familyStores={myStores.map((s) => s.name)} />
              )}
            </div>
            {!splitLists && <InStoreSend estTotal={storeEst} weekStart={weekStart ?? undefined} variant="secondary" />}
            <button onClick={() => sendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mt-1 min-h-[44px] text-sm text-muted-foreground underline">{walmartFirst && !splitLists ? 'or Instacart · Kroger ↓' : 'or Walmart · Kroger ↓'}</button>
          </div>
        )}

        {tripTabs.length > 1 && (
          <div role="tablist" aria-label="Shopping trips" className="flex gap-2 mb-4 overflow-x-auto">
            {tripTabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.selected} disabled={!t.planned}
                onClick={() => { tripSel.current = t.key; setLoading(true); load() }}
                className={`flex-1 min-w-[150px] text-left rounded-xl border px-4 py-2.5 ${t.selected ? 'border-primary bg-primary/5' : 'border-border bg-white'} disabled:opacity-60`}>
                <span className={`block text-sm font-semibold ${t.selected ? 'text-primary' : 'text-foreground'}`}>{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.planned ? t.sub : `${t.sub} · plan it on the dashboard`}</span>
              </button>
            ))}
          </div>
        )}

        {shoppableCount > 0 && <p className="mb-2 text-sm text-muted-foreground print:hidden">Already have something? Tap <em>have?</em> on it and it stays off the cart.</p>}

        <GroceryList
          items={items}
          saleFor={sales.length ? (name) => matchSale(name, sales) : undefined}
          storeFor={split && splitStores ? (i) => split[i.id] ?? splitStores[0] : undefined}
          onMoveStore={split && splitStores ? (i) => setSplit((m) => ({ ...(m ?? {}), [i.id]: (m?.[i.id] ?? splitStores[0]) === splitStores[0] ? splitStores[1] : splitStores[0] })) : undefined}
          onToggleChecked={toggleChecked}
          onToggleHave={toggleHave}
          onRemove={removeItem}
          onChangeQuantity={changeQuantity}
          onAdd={(name, category) => addItem(name, category)}
          detailFor={(i) => ({
            usedIn: i.source === 'plan' ? mealsUsing(i.name, planMeals) : planMeals.filter((m) => (m.ingredients ?? []).some((g) => sameListItem(g.name, i.name))).map((m) => m.name),
            buy: i.quantity ? toPackages({ name: i.name, quantity: i.quantity, unit: i.unit, searchTerm: i.search_term }).label.replace(/^1 × package$/, '') || null : null,
          })}
        />

        <div className="mt-6" />
        {/* Family vote, pantry check and sides sit under the list since Nov 15: send comes first. */}
        <LastCallCard onItems={load} />
        <PantryCheck rows={items} weekKey={weekStart ?? 'now'} onKeepOff={keepOff} />
        <SidesCard meals={planMeals} have={items.map((i) => i.name)} onAdd={(name, category, searchTerm, qty) => addItem(name, category, searchTerm, 'extra', qty)} />

        {/* Budget bar */}
        {budget > 0 && (
          <div className="mb-6 rounded-xl border border-border p-4 print:hidden">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Everything on the list{learned ? ' (at your store)' : ' (estimate)'}</span>
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

        {sales.length > 0 && items.length > 0 && <SwapToSave compact onSwapped={() => { setTimeout(() => window.location.reload(), 900) }} />}

        {sales.length > 0 && items.length > 0 && (
          <DealsBanner sets={sales.filter((x) => !isUpcoming(x))} nextSets={sales.filter((x) => isUpcoming(x))} names={items.filter((i) => !i.have).map((i) => i.name)} />
        )}

        {/* Stock up while it's cheap */}
        {stockUpOn && sales.length > 0 && (
          <StockUpDeals
            sets={sales.filter((x) => !isUpcoming(x))}
            onList={(name) => items.some((i) => normalizeItemName(i.name) === normalizeItemName(name) && !i.have)}
            onAdd={(p) => addItem(p.name, p.category, p.searchTerm, 'extra', { quantity: p.quantity, unit: p.unit })}
          />
        )}

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
          realQuotes={storeQuotes}
          split={split}
          onSplit={(assign, stores) => { setSplit(assign); setSplitStores(stores) }}
        />

        <div className="mt-8 p-5 rounded-xl bg-foreground print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-foreground/60">{learned ? 'Expected at your store' : 'Whole list, estimated'}</span>
            <span className="text-2xl font-heading font-bold text-primary-foreground">${storeEst.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-primary-foreground/50 mt-1">
            Dinners ${dinnersEst.toFixed(0)}{extrasEst > 0 ? ` + other items $${extrasEst.toFixed(0)}` : ''} at typical prices
            {learned ? ` × ${priceFactor.toFixed(2)} for your store and fees, learned from your orders` : inStore ? ' at the store' : ` + about ${Math.round((DEFAULT_FACTOR - 1) * 100)}% for Instacart prices and fees (we'll learn your store's real number from your first order)`}{storeBrand ? ', with store brands (about 15% less)' : ''}. Tip not included.
            {' '}{shoppableCount} items go to the cart{haveCount ? ` · ${haveCount} you already have stay off it` : ''}.
          </p>
          {askActual && !actualSaved && (
            <form onSubmit={async (e) => { e.preventDefault(); const t = Number(actualDraft.replace(/[^0-9.]/g, '')); if (!t) return; const r = await fetch('/api/handoff/actual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total: t, store: actualStore || undefined }) }); const j = await r.json(); if (r.ok) { setActualSaved(j.factor ? `Thanks — your store runs about ${j.factor.toFixed(2)}× our estimates. Future lists use that.` : 'Thanks — saved.'); if (j.factor) setPriceFactor(j.factor); setAskActual(null); setPendingSend(null); if (userId && weekStart) loadItems(userId, weekStart) } }} className="mt-3 flex flex-wrap items-center gap-2">
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

        <CartTextOffer />

        <div id="receipt-upload" className="scroll-mt-24">
          <ReceiptRewardBanner />
          <ReceiptUpload onDone={() => { setAskActual(null); load() }} />
        </div>

        {!sendInView && !heroInView && shoppableCount > 0 && (
          <div className="fixed bottom-2 sm:bottom-4 inset-x-0 z-40 px-3 sm:px-4 print:hidden native-raise">
            <div className="mx-auto max-w-2xl flex items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-border bg-background/95 backdrop-blur shadow-xl px-4 sm:px-5 py-2.5 sm:py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{shoppableCount} items<span className="hidden sm:inline"> ready</span>{storeEst > 0 ? ` · ~$${Math.round(storeEst)}` : ''}</p>
                <button onClick={() => sendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="text-xs text-muted-foreground hover:text-foreground underline">More ways to send ↓</button>
              </div>
              {inStore ? (
                <InStoreSend estTotal={storeEst} weekStart={weekStart ?? undefined} variant="compact" />
              ) : splitLists && splitStores ? (
                <button onClick={() => sendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="px-5 py-2.5 rounded-full bg-[#003D29] text-[#FAF1E5] font-semibold text-sm">Send to your cart ↓</button>
              ) : (
                <InstacartButton groceryList={shoppable} estTotal={storeEst} weekStart={weekStart ?? undefined} onSent={afterSent} compact />
              )}
            </div>
          </div>
        )}

        <div ref={sendRef} className="mt-6 print:hidden">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">{inStore ? 'Or order online' : 'Send to your cart'}</p>
          <div className="space-y-4">
            {splitLists && splitStores ? (
              <div className="space-y-3">
                {splitStores.map((st) => {
                  const n = Object.values(splitLists[st]).reduce((k, arr) => k + arr.length, 0)
                  return (
                    <div key={st} className="flex flex-wrap items-center gap-3">
                      <InstacartButton groceryList={splitLists[st]} estTotal={undefined} weekStart={weekStart ?? undefined} store={st} onSent={afterSent} />
                      <span className="text-xs text-muted-foreground">{n} items · pick {st} when the list opens</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <InstacartButton groceryList={shoppable} estTotal={storeEst} weekStart={weekStart ?? undefined} onSent={afterSent} familyStores={myStores.map((s) => s.name)} />
            )}
            <WalmartButton groceryList={shoppable} weekStart={weekStart ?? undefined} onSent={afterSent} />
            <WalmartPicks items={items} weekStart={weekStart ?? undefined} />
            <div className="space-y-2">
              {krogerConnected ? (
                <button onClick={handleKrogerCart} disabled={krogerLoading || shoppableCount === 0} className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#0067A0] text-white font-semibold text-base hover:bg-[#005a8c] disabled:opacity-50 transition-colors shadow-lg">
                  {krogerLoading ? 'Adding to cart...' : 'Send to Kroger cart'}
                </button>
              ) : !isFamily ? (
                <Link href="/subscribe" className="web-only inline-block w-full sm:w-auto text-center px-8 py-3 rounded-lg border-2 border-[#0067A0] text-[#0067A0] font-semibold text-base hover:bg-[#0067A0]/5 transition-colors">
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
                <p className={`text-[11px] text-muted-foreground ${isFamily || krogerConnected ? '' : 'web-only'}`}>
                  {isFamily || krogerConnected
                    ? 'Pushes ingredients directly into your Kroger.com cart. You review and check out there.'
                    : 'Family is $4.99/month or $39/year after a 14-day free trial.'}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <button type="button" onClick={emailRecipes} disabled={recipesMail === 'sending'} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-foreground text-xs font-semibold hover:border-primary/50 disabled:opacity-60">
              📄 {recipesMail === 'sending' ? 'Sending…' : recipesMail === 'sent' ? 'Sent — check your inbox' : recipesMail === 'error' ? 'Couldn\u2019t send — try again' : 'Email me this week\u2019s recipes (PDFs)'}
            </button>
            <span className="text-[11px] text-muted-foreground">One printable card per dinner. They&apos;re also sent automatically when your list goes to a store.</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Your cart fills in your own Instacart or Kroger account; you review every item and check out there at Instacart&apos;s or Kroger&apos;s prices for that store. DinnerDrop may earn a commission when you shop through these links, at no extra cost to you.{' '}
            <a href="/disclosure" className="underline hover:text-foreground">Learn more</a>.
          </p>
        </div>

        {krogerReview && (
          <KrogerReview groceryList={shoppable} locationId={krogerLoc.id} locationName={krogerLoc.name} weekStart={weekStart ?? undefined} onClose={() => setKrogerReview(false)}
            onPushed={(added, total) => { setKrogerReview(false); setKrogerResult({ type: 'success', message: `Added ${added} of ${total} items to your Kroger cart.` }); if (userId && weekStart) loadItems(userId, weekStart) }} />
        )}

        <div className="h-24 sm:hidden" />
      </div>
    </div>
  )
}
