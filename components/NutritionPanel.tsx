'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { mergeSettings } from '@/lib/settings'
import { macroSplit, type Nutrition } from '@/lib/nutrition-shared'

/**
 * "Nutrition per serving" card: calories, a protein/carbs/fat bar, and the detail rows.
 * Estimated from the ingredients. Hidden for signed-in families who turned nutrition off in Settings.
 */
export default function NutritionPanel({ nutrition }: { nutrition?: Nutrition | null }) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let live = true
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('settings').eq('id', user.id).maybeSingle()
      if (live && !mergeSettings(data?.settings).food.nutritionInfo) setHidden(true)
    }).catch(() => {})
    return () => { live = false }
  }, [])
  if (!nutrition || hidden) return null
  const n = nutrition
  const split = macroSplit(n)
  const rows: Array<[string, string | null, boolean?]> = [
    ['Protein', `${n.protein} g`],
    ['Carbohydrates', n.carbs != null ? `${n.carbs} g` : null],
    ['Fiber', n.fiber != null ? `${n.fiber} g` : null, true],
    ['Sugar', n.sugar != null ? `${n.sugar} g` : null, true],
    ['Fat', n.fat != null ? `${n.fat} g` : null],
    ['Saturated fat', n.satFat != null ? `${n.satFat} g` : null, true],
    ['Sodium', n.sodium != null ? `${n.sodium.toLocaleString()} mg` : null],
  ]
  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Nutrition per serving</h2>
      <div className="rounded-xl border border-border p-4 max-w-md">
        <div className="flex items-baseline justify-between border-b-4 border-foreground/80 pb-2 mb-3">
          <span className="font-heading font-bold text-lg text-foreground">Calories</span>
          <span className="font-heading font-bold text-2xl text-foreground tabular-nums">{n.calories}</span>
        </div>
        {split && (
          <div className="mb-3">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full" role="img" aria-label={`Calories from protein ${split.protein}%, carbs ${split.carbs}%, fat ${split.fat}%`}>
              <span className="bg-[#1a5c38]" style={{ width: `${split.protein}%` }} />
              <span className="bg-[#e8a33d]" style={{ width: `${split.carbs}%` }} />
              <span className="bg-[#c8553d]" style={{ width: `${split.fat}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#1a5c38] mr-1" />Protein {split.protein}%</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#e8a33d] mr-1" />Carbs {split.carbs}%</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#c8553d] mr-1" />Fat {split.fat}%</span>
            </div>
          </div>
        )}
        <dl className="text-sm divide-y divide-border">
          {rows.filter(([, v]) => v != null).map(([label, v, sub]) => (
            <div key={label} className={`flex justify-between py-1.5 ${sub ? 'pl-4 text-muted-foreground' : 'text-foreground'}`}>
              <dt className={sub ? '' : 'font-medium'}>{label}</dt>
              <dd className="tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">Estimated from the ingredients and amounts in this recipe; brands and portions vary. Not medical or dietary advice.</p>
      </div>
    </section>
  )
}
