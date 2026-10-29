'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatQuantity } from '@/components/GroceryList'
import { timeLabel } from '@/lib/plan'
import type { Meal } from '@/types'

/** Printable week: a one-page fridge sheet of the dinners, then each recipe on its own page. */
export default function PrintWeekPage() {
  const [meals, setMeals] = useState<Meal[] | null>(null)
  const [week, setWeek] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      let list: Meal[] = []
      try { list = JSON.parse(localStorage.getItem('current-meals') || '[]') } catch { /* ignore */ }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: plan } = await supabase.from('meal_plans').select('meals, week_start').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (plan?.week_start) setWeek(new Date(plan.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))
        if (!list.length && Array.isArray(plan?.meals)) list = plan!.meals as Meal[]
      }
      setMeals(list.filter((m) => m && m.name))
    }
    load()
  }, [])

  if (!meals) return <div className="min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  if (!meals.length) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-3">
        <p className="font-medium text-foreground">No dinners planned yet this week.</p>
        <Link href="/dashboard" className="text-primary text-sm hover:underline">Plan this week →</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl print:max-w-none print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to this week</Link>
        <button onClick={() => window.print()} className="web-only inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {/* Fridge sheet */}
      <section>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">DinnerDrop{week ? ` · week of ${week}` : ''}</p>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-6">This week&apos;s dinners</h1>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b-2 border-foreground/70">
              <th className="py-2 pr-3 w-28">Night</th>
              <th className="py-2 pr-3">Dinner</th>
              <th className="py-2 pr-3 w-40">Time</th>
              <th className="py-2 w-10 text-center">✓</th>
            </tr>
          </thead>
          <tbody>
            {meals.map((m, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="py-3 pr-3 font-semibold text-foreground">{/^day \d+$/i.test(m.day) ? `Dinner ${i + 1}` : m.day}</td>
                <td className="py-3 pr-3">
                  <p className="font-medium text-foreground">{m.name}</p>
                  {m.safeBite && <p className="text-xs text-muted-foreground">Picky-eater safe bet: {m.safeBite}</p>}
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{timeLabel(m)}</td>
                <td className="py-3 text-center"><span className="inline-block w-4 h-4 border border-foreground/60 rounded-sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-4">Full recipes follow, one per page.</p>
      </section>

      {/* One recipe per page */}
      {meals.map((m, i) => (
        <section key={i} className="mt-12 pt-8 border-t-2 border-border print:mt-0 print:pt-0 print:border-0 break-before-page break-inside-avoid-page">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">{/^day \d+$/i.test(m.day) ? `Dinner ${i + 1}` : m.day}</p>
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">{m.name}</h2>
          <p className="text-sm text-muted-foreground mb-5">{timeLabel(m)} · {m.servings} servings{m.nutrition ? ` · ${m.nutrition.calories} cal, ${m.nutrition.protein}g protein per serving` : ''}</p>
          <div className="grid sm:grid-cols-[2fr_3fr] print:grid-cols-[2fr_3fr] gap-6">
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Ingredients</h3>
              <ul className="space-y-1 text-sm">
                {(m.ingredients ?? []).map((ing, n) => (
                  <li key={n} className="flex gap-2"><span className="text-muted-foreground">☐</span><span><span className="font-medium">{formatQuantity(ing.quantity, ing.unit)}</span> {ing.name}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Instructions</h3>
              <ol className="space-y-2.5 text-sm">
                {(m.steps ?? []).map((s, n) => (
                  <li key={n} className="flex gap-3"><span className="font-bold text-primary w-5 shrink-0">{n + 1}.</span><span className="leading-relaxed">{s}</span></li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ))}
      <p className="hidden print:block text-[10px] text-muted-foreground mt-6">Planned with DinnerDrop · dinnerdrop.app</p>
    </div>
  )
}
