// lib/taste-profile.ts
import { createClient } from '@/lib/supabase'

export type InteractionEventType =
  | 'favorited'
  | 'unfavorited'
  | 'swapped_away'
  | 'regenerated_week'
  | 'kept_plan'

export interface MealSignal {
  event_type: InteractionEventType
  meal_name?: string
  cuisine?: string
  protein?: string
  cook_time?: number
  swapped_to_cuisine?: string
}

const SCORE_WEIGHTS: Record<InteractionEventType, number> = {
  favorited: 3,
  kept_plan: 1,
  unfavorited: -2,
  swapped_away: -2,
  regenerated_week: -1,
}

export async function recordMealSignal(signal: MealSignal) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('meal_interaction_events').insert({
    user_id: user.id,
    ...signal,
  })

  const { data: profile } = await supabase
    .from('taste_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const cuisineScores: Record<string, number> = profile?.cuisine_scores ?? {}
  const avoidedProteins: string[] = profile?.avoided_proteins ?? []
  const totalSignals: number = (profile?.total_signals ?? 0) + 1

  if (signal.cuisine) {
    const weight = SCORE_WEIGHTS[signal.event_type]
    cuisineScores[signal.cuisine] = (cuisineScores[signal.cuisine] ?? 0) + weight
  }

  if (signal.protein && signal.event_type === 'swapped_away') {
    if (!avoidedProteins.includes(signal.protein)) {
      const { count } = await supabase
        .from('meal_interaction_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_type', 'swapped_away')
        .eq('protein', signal.protein)
      if ((count ?? 0) >= 2) avoidedProteins.push(signal.protein)
    }
  }

  await supabase.from('taste_profiles').upsert({
    user_id: user.id,
    cuisine_scores: cuisineScores,
    avoided_proteins: avoidedProteins,
    avg_preferred_cook_time: signal.cook_time
      ? Math.round(((profile?.avg_preferred_cook_time ?? 30) + signal.cook_time) / 2)
      : profile?.avg_preferred_cook_time ?? 30,
    total_signals: totalSignals,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

export async function getTasteProfileForPrompt(userId: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase
    .from('taste_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data || data.total_signals < 3) return ''

  const cuisineScores: Record<string, number> = data.cuisine_scores ?? {}
  const sorted = Object.entries(cuisineScores).sort((a, b) => b[1] - a[1])
  const preferred = sorted.filter(([, s]) => s > 0).map(([c]) => c)
  const avoided = sorted.filter(([, s]) => s < -1).map(([c]) => c)
  const avoidedProteins: string[] = data.avoided_proteins ?? []

  const lines: string[] = []
  if (preferred.length) lines.push(`Preferred cuisines: ${preferred.join(', ')}`)
  if (avoided.length) lines.push(`Cuisines to avoid: ${avoided.join(', ')}`)
  if (avoidedProteins.length) lines.push(`Avoided proteins: ${avoidedProteins.join(', ')}`)
  if (data.avg_preferred_cook_time) lines.push(`Target cook time: under ${data.avg_preferred_cook_time} minutes`)

  return lines.length ? `User taste profile:\n${lines.join('\n')}` : ''
}
