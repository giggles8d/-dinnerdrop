'use client'

import { X } from 'lucide-react'
import type { QuickSetupAnswers } from '@/components/QuickSetup'
import { GOALS } from '@/lib/onboarding'
import type { Meal } from '@/types'

/**
 * The moment the first week appears: say what was built and why, in their words.
 * "5 dinners for 4, about $118 of your $150, nothing with dairy — and a text is on its way."
 */
export default function FirstWeekReveal({ answers, meals, totalCost, onClose }: { answers: QuickSetupAnswers; meals: Meal[]; totalCost: number; onClose: () => void }) {
  const goal = GOALS.find((g) => g.key === answers.goal)
  const budgetNum = Number(answers.weeklyBudget.replace(/[^0-9.]/g, '')) || 0
  const cost = Math.round(totalCost || meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0))
  const under = budgetNum && cost ? budgetNum - cost : 0
  const bits: string[] = []
  bits.push(`${meals.length} dinners for ${answers.familySize === 5 ? '5+' : answers.familySize}`)
  if (cost) bits.push(under >= 0 ? `about $${cost} — $${under} under your ${answers.weeklyBudget}` : `about $${cost} against your ${answers.weeklyBudget}`)
  if (answers.dietaryNeeds.length) bits.push(`all ${answers.dietaryNeeds.map((d) => d.toLowerCase()).join(', ')}`)
  if (answers.picky) bits.push(`nothing ${answers.picky} has said no to yet`)
  return (
    <div className="mb-5 relative rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
      <button onClick={onClose} aria-label="Dismiss" className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
      <p className="font-heading font-bold text-foreground text-lg pr-8">
        {goal ? `${goal.emoji} Your first week, built to “${goal.label.toLowerCase()}”` : '🍽️ Your first week is ready'}
      </p>
      <p className="text-sm text-foreground mt-1">{bits.join(' · ')}.</p>
      <p className="text-sm text-muted-foreground mt-2">
        {answers.phone
          ? 'A text with these dinners is on its way to your phone. Swap any dinner below, then tap Shop my list — every item lands in your Instacart cart.'
          : 'Swap any dinner you don’t love, then tap Shop my list — every item lands in your Instacart cart, you pick the store and check out there.'}
      </p>
    </div>
  )
}
