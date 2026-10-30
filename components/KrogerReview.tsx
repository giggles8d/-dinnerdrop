'use client'
import { useEffect, useState } from 'react'
import { X, Search, RefreshCw } from 'lucide-react'
import type { GroceryCategory, GroceryItem } from '@/types'
import type { KrogerProduct } from '@/lib/kroger'

type Match = { name: string; want: string; quantity: number; product: KrogerProduct | null; alternatives: KrogerProduct[] }
type Loc = { locationId: string; name: string; address: string }

/**
 * "Here's what goes in your Kroger cart" — the family sees Kroger's match for every line (brand, size, price),
 * can change any of them or drop a line, set counts, pick their store, then push. Nothing is added until they confirm.
 */
export default function KrogerReview({ groceryList, locationId: initialLoc, locationName: initialLocName, onClose, onPushed }: {
  groceryList: Record<GroceryCategory, GroceryItem[]>; locationId?: string; locationName?: string; onClose: () => void; onPushed: (added: number, total: number) => void
}) {
  const [loc, setLoc] = useState<{ id?: string; name?: string }>({ id: initialLoc, name: initialLocName })
  const [zip, setZip] = useState('')
  const [locs, setLocs] = useState<Loc[] | null>(null)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [skip, setSkip] = useState<Set<number>>(new Set())
  const [changing, setChanging] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [alts, setAlts] = useState<KrogerProduct[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function load(locationId?: string) {
    setMatches(null); setErr('')
    try {
      const r = await fetch('/api/kroger/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groceryList, locationId }) })
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not match')
      setMatches(j.matches)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not match products') ; setMatches([]) }
  }
  useEffect(() => { load(initialLoc) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function findStores() {
    const r = await fetch(`/api/kroger/locations?zip=${encodeURIComponent(zip)}`); const j = await r.json(); setLocs(j.locations ?? [])
  }
  async function pickStore(l: Loc) {
    setLoc({ id: l.locationId, name: l.name }); setLocs(null)
    fetch('/api/kroger/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId: l.locationId, name: l.name }) }).catch(() => {})
    load(l.locationId)
  }
  async function searchAlts(term: string) {
    setAlts(null)
    const r = await fetch(`/api/kroger/match?q=${encodeURIComponent(term)}${loc.id ? `&locationId=${loc.id}` : ''}`); const j = await r.json(); setAlts(j.products ?? [])
  }
  function choose(n: number, p: KrogerProduct) { setMatches((ms) => ms!.map((m, i) => (i === n ? { ...m, product: p } : m))); setChanging(null); setAlts(null) }
  async function push() {
    if (!matches) return
    setBusy(true); setErr('')
    const chosen = matches.map((m, i) => ({ i, m })).filter(({ i, m }) => !skip.has(i) && m.product).map(({ m }) => ({ name: m.name, productId: m.product!.productId, quantity: m.quantity }))
    try {
      const r = await fetch('/api/kroger/add-to-cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groceryList, chosen, locationId: loc.id }) })
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Failed to add to cart')
      onPushed(j.added, chosen.length)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to add to cart'); setBusy(false) }
  }

  const going = matches ? matches.filter((m, i) => !skip.has(i) && m.product) : []
  const unmatched = matches ? matches.filter((m) => !m.product) : []
  const est = going.reduce((t, m) => t + (m.product?.price ? m.product.price * m.quantity : 0), 0)
  const priced = going.filter((m) => m.product?.price).length
  const money = (n: number) => `$${n.toFixed(2)}`

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-label="Review your Kroger cart">
      <div className="bg-background w-full sm:max-w-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <p className="text-[11px] font-bold text-[#0067A0] uppercase tracking-widest">Kroger cart</p>
            <h2 className="font-heading font-bold text-lg">Here&apos;s what goes in your cart</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loc.name ? <>Prices and stock at <b>{loc.name}</b> · <button className="underline" onClick={() => setLocs([])}>change store</button></> : <>No store set — <button className="underline" onClick={() => setLocs([])}>pick your store</button> for real prices and stock.</>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        {locs !== null && (
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex gap-2">
              <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP code" inputMode="numeric" className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <button onClick={findStores} className="px-3 py-2 rounded-md bg-[#0067A0] text-white text-sm font-semibold">Find stores</button>
              <button onClick={() => setLocs(null)} className="px-3 py-2 text-sm text-muted-foreground">Cancel</button>
            </div>
            {locs.length > 0 && <ul className="mt-2 space-y-1">{locs.map((l) => <li key={l.locationId}><button onClick={() => pickStore(l)} className="w-full text-left rounded-md px-3 py-2 hover:bg-background text-sm"><span className="font-medium">{l.name}</span> <span className="text-muted-foreground">· {l.address}</span></button></li>)}</ul>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {!matches && <div className="py-10 text-center text-sm text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Matching your list to Kroger products…</div>}
          {matches && (
            <ul className="divide-y divide-border">
              {matches.map((m, i) => {
                const off = skip.has(i)
                return (
                  <li key={i} className={`py-3 ${off ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      {m.product?.image ? <img src={m.product.image} alt="" className="w-12 h-12 rounded-md object-contain bg-white border border-border shrink-0" /> : <div className="w-12 h-12 rounded-md bg-muted shrink-0" />} {/* eslint-disable-line @next/next/no-img-element */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{m.want} {m.name}</p>
                        {m.product ? (
                          <p className="text-sm font-medium text-foreground leading-snug">{m.product.name}{m.product.size ? <span className="text-muted-foreground font-normal"> · {m.product.size}</span> : ''}{m.product.price ? <span className="text-muted-foreground font-normal"> · {money(m.product.price)}</span> : ''}{m.product.inStock === false ? <span className="ml-1 text-[11px] text-destructive">out of stock</span> : ''}</p>
                        ) : <p className="text-sm text-destructive">No match — add it in the Kroger app.</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {m.product && !off && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1 py-0.5">
                              <button aria-label="Fewer" onClick={() => setMatches((ms) => ms!.map((x, k) => (k === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))} className="px-1.5">−</button>
                              <span className="tabular-nums">{m.quantity}</span>
                              <button aria-label="More" onClick={() => setMatches((ms) => ms!.map((x, k) => (k === i ? { ...x, quantity: Math.min(20, x.quantity + 1) } : x)))} className="px-1.5">+</button>
                            </span>
                          )}
                          <button onClick={() => { setChanging(changing === i ? null : i); setQ(m.name); setAlts(m.alternatives) }} className="text-[#0067A0] font-semibold">{changing === i ? 'Keep' : 'Change'}</button>
                          <button onClick={() => setSkip((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })} className="text-muted-foreground">{off ? 'Put back' : 'Skip'}</button>
                        </div>
                        {changing === i && (
                          <div className="mt-2 rounded-lg border border-border p-2 bg-muted/30">
                            <form onSubmit={(e) => { e.preventDefault(); searchAlts(q) }} className="flex gap-2 mb-2">
                              <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
                              <button className="px-2.5 rounded-md bg-background border border-border"><Search className="w-4 h-4" /></button>
                            </form>
                            {alts === null ? <p className="text-xs text-muted-foreground">Searching…</p> : alts.length === 0 ? <p className="text-xs text-muted-foreground">Nothing found — try a simpler word.</p> : (
                              <ul className="space-y-1">{alts.map((p) => (
                                <li key={p.productId}><button onClick={() => choose(i, p)} className="w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background">
                                  {p.image ? <img src={p.image} alt="" className="w-8 h-8 rounded object-contain bg-white border border-border" /> : <span className="w-8 h-8 rounded bg-muted" />} {/* eslint-disable-line @next/next/no-img-element */}
                                  <span className="text-sm flex-1 min-w-0 truncate">{p.name}</span><span className="text-xs text-muted-foreground whitespace-nowrap">{p.size ?? ''}{p.price ? ` · ${money(p.price)}` : ''}</span>
                                </button></li>
                              ))}</ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border bg-background">
          {err && <p className="text-sm text-destructive mb-2">{err}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{going.length} items{unmatched.length ? ` · ${unmatched.length} unmatched` : ''}{priced ? ` · about ${money(est)}${priced < going.length ? ' (some unpriced)' : ''}` : ''}</p>
            <button onClick={push} disabled={busy || !matches || going.length === 0} className="px-6 py-2.5 rounded-lg bg-[#0067A0] text-white font-semibold text-sm hover:bg-[#005a8c] disabled:opacity-50">{busy ? 'Adding…' : `Add ${going.length} to Kroger cart`}</button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">You review and check out on Kroger.com at their prices. DinnerDrop adds nothing.</p>
        </div>
      </div>
    </div>
  )
}
