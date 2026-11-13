'use client'

/**
 * "Already done for you" note on a recipe when the family buys pre-cut items (settings.food.prepped, lib/prepped).
 * Loads the plan owner's settings itself so any recipe view can drop it in.
 */
import { useEffect, useState } from 'react'
import { Scissors } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { resolvePlanOwner } from '@/lib/household'
import { mergeSettings } from '@/lib/settings'
import { preppedIngredients, preppedNote } from '@/lib/prepped'
import type { Meal } from '@/types'

export default function PreppedNote({ meal }: { meal: Meal }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { ownerId } = await resolvePlanOwner(supabase, user.id)
        const { data } = await supabase.from('profiles').select('settings').eq('id', ownerId).maybeSingle()
        if (active) setOn(!!mergeSettings(data?.settings).food.prepped)
      } catch { /* note stays hidden */ }
    })()
    return () => { active = false }
  }, [])
  if (!on) return null
  const note = preppedNote(preppedIngredients(meal).swaps)
  if (!note) return null
  return (
    <div className="mb-6 flex gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground print:hidden">
      <Scissors className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" aria-hidden />
      <p><span className="font-medium">Pre-cut shortcuts: </span>{note}</p>
    </div>
  )
}
