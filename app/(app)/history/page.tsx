'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Clock, UtensilsCrossed, ChevronDown, ChevronUp } from 'lucide-react'
import type { Meal } from '@/types'

interface MealPlanRecord {
  id: string
  week_start: string
  meals: Meal[]
  total_estimated_cost: number
}

function formatWeekOf(dateStr: string): string {
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
    }
    loadHistory()
  }, [])

  return (
    <div className="container mx-auto px-4 max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold text-foreground">Meal History</h1>
      </div>

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
