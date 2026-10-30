'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { trackOnce } from '@/lib/activation'
import { FOOD_STYLES } from '@/lib/styles'
import { applyStyle } from '@/lib/apply-style'

// Three tap-only questions shown on a brand-new family's first dashboard visit,
// before their first week is built. Everything is preselected to a typical
// family, so "Build my dinners" works with one tap. Skip keeps the instant path.
const SIZES = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5+', value: 5 },
]
const BUDGETS = ['$75', '$100', '$150', '$200', '$250+']
const AVOID = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Low-carb', 'Keto', 'Paleo', 'Halal']
export const DEFAULT_FAMILY_SIZE = 4
export const DEFAULT_BUDGET = '$150'

export interface QuickSetupAnswers {
  familySize: number
  weeklyBudget: string
  dietaryNeeds: string[]
  style?: string | null
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-w-[3.25rem] px-4 py-2.5 rounded-full border text-sm font-medium transition-colors ${
        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-input hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  )
}

export default function QuickSetup({ onDone }: { onDone: (a: QuickSetupAnswers) => void }) {
  const supabase = createClient()
  const [familySize, setFamilySize] = useState(DEFAULT_FAMILY_SIZE)
  const [weeklyBudget, setWeeklyBudget] = useState(DEFAULT_BUDGET)
  const [avoid, setAvoid] = useState<string[]>([])
  const [style, setStyle] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const perDinner = Math.round((Number(weeklyBudget.replace(/[^0-9.]/g, '')) || 0) / 5)

  async function save(skipped: boolean) {
    setSaving(true)
    const answers: QuickSetupAnswers = skipped
      ? { familySize: DEFAULT_FAMILY_SIZE, weeklyBudget: DEFAULT_BUDGET, dietaryNeeds: [] }
      : { familySize, weeklyBudget, dietaryNeeds: avoid, style }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          family_size: answers.familySize,
          weekly_budget: answers.weeklyBudget,
          dietary_needs: answers.dietaryNeeds,
          ...(skipped ? {} : { onboarding_complete: true }),
        }).eq('id', user.id)
        if (!skipped && style) await applyStyle(supabase, user.id, style)
      }
    } catch {
      // Never block the first plan on a profile write; defaults still work.
    }
    trackOnce(skipped ? 'quick_setup_skipped' : 'quick_setup_done')
    onDone(answers)
  }

  return (
    <div className="mb-8 p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5">
      <h2 className="text-xl font-heading font-bold text-foreground">Let&apos;s plan your week</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">A few quick taps and we&apos;ll build 5 dinners around your family.</p>

      <p className="text-sm font-semibold text-foreground mb-2">How many people are eating?</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {SIZES.map((s) => <Chip key={s.label} on={familySize === s.value} onClick={() => setFamilySize(s.value)}>{s.label}</Chip>)}
      </div>

      <p className="text-sm font-semibold text-foreground mb-2">What do you want to spend on 5 dinners?</p>
      <div className="flex flex-wrap gap-2 mb-1">
        {BUDGETS.map((b) => <Chip key={b} on={weeklyBudget === b} onClick={() => setWeeklyBudget(b)}>{b}</Chip>)}
      </div>
      <p className="text-xs text-muted-foreground mb-5">About ${perDinner}{weeklyBudget.endsWith('+') ? '+' : ''} per dinner, for the whole table.</p>

      <p className="text-sm font-semibold text-foreground mb-2">What kind of week? <span className="font-normal text-muted-foreground">(optional — you can change it any time)</span></p>
      <div className="flex flex-wrap gap-2 mb-5">
        {FOOD_STYLES.map((s) => (
          <Chip key={s.key} on={style === s.key} onClick={() => setStyle(style === s.key ? null : s.key)}>{s.emoji} {s.name}</Chip>
        ))}
      </div>

      <p className="text-sm font-semibold text-foreground mb-2">Anything to avoid? <span className="font-normal text-muted-foreground">(optional)</span></p>
      <div className="flex flex-wrap gap-2 mb-6">
        {AVOID.map((d) => (
          <Chip key={d} on={avoid.includes(d)} onClick={() => setAvoid((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]))}>{d}</Chip>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? 'Building your dinners…' : 'Build my dinners →'}
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={saving}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-30"
        >
          Skip, plan for a family of 4
        </button>
      </div>
    </div>
  )
}
