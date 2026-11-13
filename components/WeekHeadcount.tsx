'use client'

/**
 * "Eating this week: 4" on the dashboard. Changing it resizes every dinner in this week's plan and rebuilds the
 * grocery list (lib/servings). For families whose numbers change week to week (shared custody, kids away).
 */
import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { withServings, MIN_SERVINGS, MAX_SERVINGS } from '@/lib/servings'
import { plannedHeadcount } from '@/lib/headcount'
import type { Meal } from '@/types'

export default function WeekHeadcount({ meals, onChange }: { meals: Meal[]; onChange: (next: Meal[]) => void }) {
  const current = plannedHeadcount(meals)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  if (!current || !meals.length) return null

  async function set(n: number) {
    if (saving || n === current || n < MIN_SERVINGS || n > MAX_SERVINGS / 2) return
    setSaving(true); setNote('')
    const next = meals.map((m) => withServings(m, m.leftoverFriendly ? n * 2 : n))
    onChange(next)
    try { localStorage.setItem('current-meals', JSON.stringify(next)) } catch { /* ignore */ }
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: plan } = await supabase.from('meal_plans').select('id').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (plan) {
          const total = Math.round(next.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0) * 100) / 100
          await supabase.from('meal_plans').update({ meals: next, total_estimated_cost: total, grocery_list: {} }).eq('id', plan.id)
          setNote('Dinners and your grocery list are resized.')
        }
      }
    } catch { setNote('Could not save. Try again.') }
    setSaving(false)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Users className="h-4 w-4 text-primary" aria-hidden />Eating this week</span>
      <span className="flex items-center gap-2">
        <button type="button" onClick={() => set(current - 1)} disabled={saving || current <= MIN_SERVINGS} aria-label="One fewer person" className="h-8 w-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:border-primary/50"><Minus className="h-3.5 w-3.5" /></button>
        <span className="min-w-[4.5rem] text-center text-sm font-semibold">{current} {current === 1 ? 'person' : 'people'}</span>
        <button type="button" onClick={() => set(current + 1)} disabled={saving || current >= MAX_SERVINGS / 2} aria-label="One more person" className="h-8 w-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:border-primary/50"><Plus className="h-3.5 w-3.5" /></button>
      </span>
      <span className="text-xs text-muted-foreground">{note || <>Changes week to week? <Link href="/settings" className="text-primary hover:underline">Set an every-other-week schedule</Link></>}</span>
    </div>
  )
}
