'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import type { WeekCheck, IngredientStatus } from '@/lib/receipts'

const LABEL: Record<IngredientStatus, string> = { received: 'received', replaced: 'replaced', missing: 'missing', have: 'in the pantry', not_ordered: 'never ordered', pending: 'ordered' }

/**
 * "Your week, checked" — after a receipt comes in, every dinner shows whether its ingredients
 * actually arrived. Missing/refunded lines are already back on the active list (reconcile does
 * that), so the fix is one tap: open the list and send just those.
 */
export default function WeekCheckCard() {
  const [check, setCheck] = useState<WeekCheck | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/receipts/week-check', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => setCheck(j)).catch(() => setCheck(null))
  }, [])
  if (!check || !check.hasReceipt || !check.dinners.length) return null

  const bad = check.dinners.filter((d) => !d.ok)
  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5 print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Your week, checked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {bad.length === 0
              ? 'Everything for all five dinners came — you’re set.'
              : <>{check.dinners.length - bad.length} of {check.dinners.length} dinners have everything. <b className="text-foreground">{check.missingCount} ingredient{check.missingCount === 1 ? '' : 's'}</b> didn’t make it — they’re back on your list.</>}
          </p>
        </div>
        {bad.length > 0 && <Link href="/grocery-list" className="shrink-0 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Send the rest &rarr;</Link>}
      </div>
      <ul className="mt-4 divide-y divide-border">
        {check.dinners.map((d) => {
          const key = `${d.day}-${d.name}`
          const isOpen = open === key
          const problems = d.ingredients.filter((i) => i.status === 'missing' || i.status === 'not_ordered')
          const swaps = d.ingredients.filter((i) => i.status === 'replaced')
          return (
            <li key={key} className="py-2">
              <button type="button" onClick={() => setOpen(isOpen ? null : key)} className="w-full flex items-center gap-3 text-left">
                {d.ok ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{d.name}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {d.day}{d.ok
                      ? (swaps.length ? ` · ${swaps.map((s) => `${s.name}${s.note ? ` → ${s.note.replace(/^got /, '')}` : ''}`).join(', ')}` : ' · all ingredients in hand')
                      : ` · missing: ${problems.map((p) => p.name).join(', ')}`}
                  </span>
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {isOpen && (
                <ul className="mt-2 ml-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {d.ingredients.map((i, n) => (
                    <li key={n} className="text-xs flex justify-between gap-2">
                      <span className={i.status === 'missing' || i.status === 'not_ordered' ? 'text-amber-700 font-medium' : 'text-foreground'}>{i.name}</span>
                      <span className="text-muted-foreground shrink-0">{LABEL[i.status]}{i.note ? ` · ${i.note}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
