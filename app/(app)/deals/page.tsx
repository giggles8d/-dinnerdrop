'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, Minus, Plus, Tag } from 'lucide-react'
import { openExternal } from '@/lib/native'
import { isStockUpDeal, isUpcoming, namesMatch, stockUpScore, type SaleItem, type WeeklySales } from '@/lib/sales-shared'
import { normalizeItemName } from '@/lib/list'
import SwapToSave from '@/components/SwapToSave'

/**
 * /deals — this week's (and next week's) sale items at the family's stores: what's already
 * on the list, and the rest of the ad to add with one tap. Deals come from DinnerDrop's
 * shared weekly-ad reads plus any flyer the family snapped (Settings → Stores).
 */
type Week = 'current' | 'next'
const CATS = ['For my dinners', 'All deals', 'Meat & Seafood', 'Produce', 'Pantry & Dry Goods', 'Dairy & Eggs', 'Frozen', 'Beverages', 'Bakery'] as const

function fmtRange(s: WeeklySales): string {
  const f = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')
  if (s.valid_from && s.valid_to) return `${f(s.valid_from)} – ${f(s.valid_to)}`
  if (s.valid_to) return `through ${f(s.valid_to)}`
  return 'this week'
}

/** Rough multi-buy quantity: "buy 2 get 2" → 4, "2 for $5" → 2, "10 for $10" → 10 (capped 6), else 1. */
function stockQty(i: SaleItem): number {
  const t = `${i.price} ${i.note ?? ''}`.toLowerCase()
  const bxgy = t.match(/buy\s*(\d+)\s*,?\s*get\s*(\d+)/) ?? t.match(/\bb(\d)g(\d)\b/)
  if (bxgy) return Number(bxgy[1]) + Number(bxgy[2])
  const nfor = t.match(/(\d+)\s*for\s*\$/)
  if (nfor) return Math.min(6, Number(nfor[1]))
  return 1
}

export default function DealsPage() {
  const [sets, setSets] = useState<WeeklySales[]>([])
  const [stores, setStores] = useState<string[]>([])
  const [listNames, setListNames] = useState<string[]>([])
  const [planNames, setPlanNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState<Week>('current')
  const [store, setStore] = useState<string>('all')
  const [cat, setCat] = useState<string>('For my dinners')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [added, setAdded] = useState<Record<string, 'done'>>({})
  const [busy, setBusy] = useState<'list' | 'instacart' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/deals', { cache: 'no-store' })
      const j = await r.json()
      setSets(j.sets ?? []); setStores(j.stores ?? []); setListNames(j.listNames ?? []); setPlanNames(j.planNames ?? [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const weekSets = useMemo(() => sets.filter((s) => (week === 'next') === isUpcoming(s)), [sets, week])
  const hasNext = useMemo(() => sets.some((x) => isUpcoming(x)), [sets])
  const storeNames = useMemo(() => Array.from(new Set(weekSets.map((s) => s.store).filter(Boolean))), [weekSets])
  const listSet = useMemo(() => new Set(listNames), [listNames])

  const items = useMemo(() => {
    const out: Array<SaleItem & { store: string; key: string; onList: boolean; inPlan: boolean }> = []
    for (const s of weekSets) {
      if (store !== 'all' && s.store !== store) continue
      for (const i of s.items) {
        const k = normalizeItemName(i.name)
        const onList = listSet.has(k) || Array.from(listSet).some((n) => namesMatch(n, k))
        const inPlan = planNames.some((n) => namesMatch(n, k))
        out.push({ ...i, store: s.store, key: `${s.id}:${k}`, onList, inPlan })
      }
    }
    return out
  }, [weekSets, store, listSet, planNames])

  const onList = items.filter((i) => i.onList)
  const stockUp = items.filter((i) => !i.onList && isStockUpDeal(i)).sort((a, b) => stockUpScore(b) - stockUpScore(a))
  const DINNER_ORDER = ['Meat & Seafood', 'Produce', 'Dairy & Eggs']
  const rest = items.filter((i) => !i.onList && (cat === 'For my dinners' ? i.inPlan : cat === 'All deals' ? true : (i.category ?? 'Pantry & Dry Goods') === cat))
    .sort((a, b) => (cat === 'For my dinners' || cat === 'All deals' ? DINNER_ORDER.indexOf(a.category ?? '') - DINNER_ORDER.indexOf(b.category ?? '') : 0))

  type Deal = SaleItem & { store: string; key: string; onList: boolean; inPlan: boolean }
  const byKey = useMemo(() => new Map<string, Deal>(items.map((i) => [i.key, i])), [items])
  const picks: Deal[] = Object.keys(picked).filter((k) => picked[k]).map((k) => byKey.get(k)).filter((x): x is Deal => x !== undefined)
  const toggle = (i: Deal) => setPicked((p) => ({ ...p, [i.key]: !p[i.key] }))
  const qtyOf = (i: Deal) => qty[i.key] ?? stockQty(i)

  /** Put every picked deal on this week's grocery list (so it goes with the weekly Instacart send). */
  async function addPicksToList() {
    if (!picks.length) return
    setBusy('list'); setMsg(null)
    let n = 0
    for (const i of picks) {
      try {
        const r = await fetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: i.name, price: i.price, unit: i.unit, category: i.category, store: i.store, quantity: qtyOf(i) }) })
        if (r.ok) { n++; setAdded((a) => ({ ...a, [i.key]: 'done' })); setListNames((xs) => [...xs, normalizeItemName(i.name)]) }
      } catch { /* keep going */ }
    }
    setPicked({}); setBusy(null)
    setMsg(`${n} added to your grocery list.`)
  }

  /** A separate Instacart list of just the picked specials — buy them now, nothing else changes. */
  async function buyPicksOnInstacart() {
    if (!picks.length) return
    setBusy('instacart'); setMsg(null)
    try {
      const r = await fetch('/api/deals/instacart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: picks.map((i) => ({ name: i.name, quantity: qtyOf(i), unit: i.unit, category: i.category, store: i.store, price: i.price })) }) })
      const j = await r.json()
      if (!r.ok || !j.link) throw new Error(j.error || 'Could not build the Instacart list')
      await openExternal(j.link)
      setMsg(`Your ${picks.length} specials are in an Instacart list — pick ${picks.map((p) => p.store).filter((v, i, a) => a.indexOf(v) === i).join(' or ')} there to get the sale price.`)
      setPicked({})
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not build the Instacart list')
    } finally { setBusy(null) }
  }

  const range = weekSets[0] ? fmtRange(weekSets[0]) : ''

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/grocery-list" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to grocery list
        </Link>

        <div className="mb-5">
          <h1 className="text-3xl font-heading font-bold text-foreground">{week === 'next' ? 'Next week’s deals' : 'This week’s deals'}</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? 'Loading your stores’ ads…' : items.length ? `${range} · ${items.length} deals at ${storeNames.join(', ')}` : stores.length ? 'No ad loaded for your stores yet.' : 'Add your stores in Settings and we’ll read their weekly ads for you.'}
          </p>
        </div>

        {hasNext && (
          <div className="inline-flex rounded-full border border-border p-0.5 mb-4">
            {(['current', 'next'] as Week[]).map((w) => (
              <button key={w} type="button" onClick={() => setWeek(w)} aria-pressed={week === w} className={`px-4 py-1.5 rounded-full text-sm font-medium ${week === w ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>{w === 'current' ? 'This week' : 'Next week'}</button>
            ))}
          </div>
        )}

        {storeNames.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {['all', ...storeNames].map((s) => (
              <button key={s} type="button" onClick={() => setStore(s)} aria-pressed={store === s} className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium border ${store === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-foreground'}`}>{s === 'all' ? 'All stores' : s}</button>
            ))}
          </div>
        )}

        {!loading && !items.length && (
          <div className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
            {stores.length ? (
              <>We read {stores.join(', ')} ads on their preview days. Can’t wait? <Link href="/settings?section=stores" className="text-primary underline">Snap this week’s flyer</Link> and the planner uses it right away.</>
            ) : (
              <><Link href="/settings?section=stores" className="text-primary underline">Add the stores you shop at</Link> — Tops, Aldi, Wegmans, Walmart, Kroger and more — and their sale prices show up here and on your list.</>
            )}
          </div>
        )}

        {week === 'current' && cat === 'For my dinners' && <SwapToSave compact />}

        {onList.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Already on your list · {onList.length}</h2>
            <div className="rounded-2xl border border-border bg-white divide-y divide-border">
              {onList.map((i) => (
                <div key={i.key} className="flex items-center gap-3 px-4 py-3">
                  <Tag className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground capitalize truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.store} · <span className="font-semibold text-primary">{i.price}</span>{i.note ? ` · ${i.note}` : ''}</div>
                  </div>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">On list</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {stockUp.length > 0 && (
          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock up while it’s cheap</h2>
              <span className="text-[11px] text-muted-foreground">Multi-buys and pantry deals</span>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 divide-y divide-amber-100">
              {stockUp.slice(0, 8).map((i) => {
                const n = qtyOf(i)
                const on = !!picked[i.key]
                return (
                  <div key={i.key} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground capitalize truncate">{i.name}</div>
                      <div className="text-xs text-amber-900 font-semibold">{i.store} · {i.price}{i.note ? ` · ${i.note}` : ''}</div>
                    </div>
                    {added[i.key] ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><Check className="w-3.5 h-3.5" /> On list</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button type="button" aria-label="Fewer" onClick={() => setQty((q) => ({ ...q, [i.key]: Math.max(1, n - 1) }))} className="w-9 h-9 rounded-full border border-border bg-white flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                        <span className="w-5 text-center text-sm font-bold">{n}</span>
                        <button type="button" aria-label="More" onClick={() => setQty((q) => ({ ...q, [i.key]: Math.min(12, n + 1) }))} className="w-9 h-9 rounded-full border border-border bg-white flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                        <button type="button" onClick={() => toggle(i)} aria-pressed={on} className={`ml-1 h-9 px-3 rounded-full text-xs font-semibold border ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-primary border-primary/40'}`}>{on ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Picked</span> : 'Pick'}</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section className="mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shop the ad</h2>
              <span className="text-[11px] text-muted-foreground">Pick what you want, then choose below</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {CATS.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${cat === c ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'}`}>{c === 'Pantry & Dry Goods' ? 'Pantry' : c === 'Dairy & Eggs' ? 'Dairy' : c === 'Meat & Seafood' ? 'Meat' : c}</button>
              ))}
            </div>
            {rest.length === 0 ? (
              <p className="text-sm text-muted-foreground">{cat === 'For my dinners' ? (planNames.length ? 'Nothing else in this week’s dinners is on sale — the matches are already on your list above.' : 'Build this week’s dinners first and we’ll match the ad to them.') : 'Nothing in this aisle this week.'}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {rest.slice(0, 60).map((i) => {
                  const on = !!picked[i.key]
                  const done = !!added[i.key]
                  return (
                    <div key={i.key} className="rounded-2xl border border-border bg-white p-3 flex flex-col gap-1.5">
                      <div className="text-sm font-semibold text-foreground capitalize leading-tight">{i.name}</div>
                      <div className="text-sm font-bold text-primary">{i.price}</div>
                      <div className="text-[11px] text-muted-foreground">{i.store}{i.note ? ` · ${i.note}` : ''}{i.unit && !/^(oz|each|pack|lb)$/i.test(i.unit) ? ` · ${i.unit}` : ''}</div>
                      <button type="button" onClick={() => toggle(i)} disabled={done} aria-pressed={on} className={`mt-auto h-10 rounded-full text-sm font-semibold border ${done ? 'border-primary/30 text-primary bg-primary/5' : on ? 'bg-primary text-primary-foreground border-primary' : 'border-primary/40 text-primary bg-white'} disabled:opacity-80`}>
                        {done ? <span className="inline-flex items-center gap-1"><Check className="w-4 h-4" /> On list</span> : on ? <span className="inline-flex items-center gap-1"><Check className="w-4 h-4" /> Picked</span> : 'Pick'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {items.length > 0 && (
          <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-4 bg-background/95 backdrop-blur border-t border-border">
            {msg && <p className="text-xs text-foreground text-center mb-2">{msg}</p>}
            {picks.length > 0 ? (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={buyPicksOnInstacart} disabled={!!busy} className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-3.5 shadow-lg disabled:opacity-60">
                  {busy === 'instacart' ? <Loader2 className="w-5 h-5 animate-spin inline" /> : `Buy ${picks.length} special${picks.length === 1 ? '' : 's'} on Instacart now`}
                </button>
                <button type="button" onClick={addPicksToList} disabled={!!busy} className="w-full rounded-2xl border border-primary/40 bg-white text-primary font-semibold py-3 disabled:opacity-60">
                  {busy === 'list' ? <Loader2 className="w-5 h-5 animate-spin inline" /> : `Add ${picks.length} to my grocery list`}
                </button>
                <p className="text-[11px] text-muted-foreground text-center leading-snug">“Buy now” opens a separate Instacart list with just these specials — pick the store there to get its sale price. “Add to my list” puts them in this week’s send.</p>
              </div>
            ) : (
              <>
                <Link href="/grocery-list" className="block w-full text-center rounded-2xl bg-primary text-primary-foreground font-bold py-3.5 shadow-lg">Back to my list → send to Instacart</Link>
                <p className="text-[11px] text-muted-foreground text-center mt-2 leading-snug">Deals are the stores’ shelf prices; Instacart shows its own price at checkout. Pick the store in Instacart to get its sale.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
