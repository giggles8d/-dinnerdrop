'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { repeatPlan } from '@/lib/repeat-plan'
import { createClient } from '@/lib/supabase'
import { Clock, UtensilsCrossed, ChevronDown, ChevronUp, Receipt } from 'lucide-react'
import type { Meal } from '@/types'

interface ReceiptLine { name: string; qty: number | null; price: number | null; status: 'bought' | 'replaced' | 'refunded'; replacedWith?: string | null }
interface ReceiptRec { id: string; created_at: string; store: string | null; ordered_on: string | null; total: number | null; item_count: number; items: ReceiptLine[]; summary: { bought?: number; replaced?: number; refunded?: number; missing?: number; restored?: number } }
interface ItemHistory { name: string; times: number; last: { store: string | null; on: string | null; price: number | null }; cheapest: { store: string | null; price: number } | null; stores: Record<string, number> }

interface MealPlanRecord {
  id: string
  week_start: string
  meals: Meal[]
  total_estimated_cost: number
}

function formatWeekOf(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown week'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function SkeletonWeek() {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-3 w-full bg-muted rounded" />
        ))}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [plans, setPlans] = useState<MealPlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<ReceiptRec[]>([])
  const [itemHistory, setItemHistory] = useState<ItemHistory[]>([])
  const [openReceipt, setOpenReceipt] = useState<string | null>(null)
  const [showItems, setShowItems] = useState(false)
  const [itemQ, setItemQ] = useState('')
  const [repeating, setRepeating] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .select('id, week_start, meals, total_estimated_cost')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(12)

      if (!error && data) {
        setPlans(data as MealPlanRecord[])
      }
      setLoading(false)
      fetch('/api/receipts/history', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) { setReceipts(j.receipts ?? []); setItemHistory(j.items ?? []) } }).catch(() => {})
    }
    loadHistory()
  }, [])

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold text-foreground">History</h1>
      </div>

      {receipts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading font-bold text-foreground">Past orders</h2>
          </div>
          {receipts.map((r) => {
            const isOpen = openReceipt === r.id
            const sm = r.summary ?? {}
            const when = r.ordered_on ? new Date(r.ordered_on + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const groups: Array<[string, ReceiptLine[]]> = [['Didn\u2019t come (refunded)', r.items.filter((i) => i.status === 'refunded')], ['Replaced', r.items.filter((i) => i.status === 'replaced')], ['Bought', r.items.filter((i) => i.status === 'bought')]]
            return (
              <div key={r.id} className="border border-border rounded-xl overflow-hidden">
                <button onClick={() => setOpenReceipt(isOpen ? null : r.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="text-left">
                    <p className="font-medium text-foreground text-sm">{r.store ?? 'Order'} &middot; {when}{r.total != null ? ` · $${Number(r.total).toFixed(2)}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{r.item_count} items{sm.replaced ? ` · ${sm.replaced} replaced` : ''}{sm.refunded ? ` · ${sm.refunded} refunded` : ''}{sm.missing ? ` · ${sm.missing} from your list not on the receipt` : ''}{sm.restored ? ` · ${sm.restored} put back on your list` : ''}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
                    {groups.filter(([, arr]) => arr.length).map(([label, arr]) => (
                      <div key={label}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label} ({arr.length})</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                          {arr.map((i, n) => (
                            <li key={n} className="text-sm flex justify-between gap-2">
                              <span className="text-foreground">{i.name}{i.status === 'replaced' && i.replacedWith ? <span className="text-muted-foreground"> → {i.replacedWith}</span> : ''}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{i.qty && i.qty !== 1 ? `${i.qty} × ` : ''}{i.price != null ? `$${Number(i.price).toFixed(2)}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {itemHistory.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => setShowItems((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="text-left">
                  <p className="font-medium text-foreground text-sm">What you buy, and where</p>
                  <p className="text-xs text-muted-foreground">{itemHistory.length} items across your receipts &middot; last store, last price, cheapest seen</p>
                </div>
                {showItems ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>
              {showItems && (
                <div className="border-t border-border px-4 py-3 bg-muted/20">
                  <input value={itemQ} onChange={(e) => setItemQ(e.target.value)} placeholder="Search items…" className="mb-3 w-full sm:w-72 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                  <ul className="divide-y divide-border">
                    {itemHistory.filter((it) => !itemQ || it.name.toLowerCase().includes(itemQ.toLowerCase())).slice(0, 120).map((it) => (
                      <li key={it.name} className="py-1.5 text-sm flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                        <span className="text-foreground">{it.name} <span className="text-xs text-muted-foreground">×{it.times}</span></span>
                        <span className="text-xs text-muted-foreground">
                          {it.last.store ? `last: ${it.last.store}` : ''}{it.last.on ? ` ${new Date(it.last.on + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}{it.last.price != null ? ` $${Number(it.last.price).toFixed(2)}` : ''}
                          {it.cheapest && it.cheapest.store && it.cheapest.store !== it.last.store ? ` · cheapest: ${it.cheapest.store} $${it.cheapest.price.toFixed(2)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <SkeletonWeek key={i} />)}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">No meal history yet</p>
          <p className="text-sm text-muted-foreground">
            Generate your first meal plan and it will appear here.
          </p>
        </div>
      )}

      {!loading && plans.length > 0 && (
        <div className="space-y-3">
          {receipts.length > 0 && <h2 className="text-lg font-heading font-bold text-foreground pt-2">Meal history</h2>}
          {plans.map((plan) => {
            const isOpen = expanded === plan.id
            const meals: Meal[] = Array.isArray(plan.meals) ? plan.meals : []
            return (
              <div key={plan.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : plan.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium text-foreground text-sm">
                      Week of {formatWeekOf(plan.week_start)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meals.length} meal{meals.length !== 1 ? 's' : ''}{plan.total_estimated_cost ? ` · est. $${plan.total_estimated_cost.toFixed(2)}` : ''}
                    </p>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  }
                </button>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          setRepeating(plan.id)
                          const { data: { user } } = await supabase.auth.getUser()
                          if (user && (await repeatPlan(supabase, user.id, meals))) router.push('/dashboard')
                          else setRepeating(null)
                        }}
                        disabled={repeating !== null || meals.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 disabled:opacity-50"
                      >
                        {repeating === plan.id ? 'Planning…' : 'Plan this week again'}
                      </button>
                    </div>
                    {meals.map((meal, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{meal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {meal.day}{meal.cookTime ? ` · ${meal.cookTime} min` : ''}
                          </p>
                        </div>
                        {meal.estimatedCost != null && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ~${meal.estimatedCost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
