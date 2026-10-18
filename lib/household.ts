'use client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Who "owns" the plan this user sees. Partners who joined via invite read the
 * household owner's plan and share the owner's grocery list.
 */
export async function resolvePlanOwner(supabase: SupabaseClient, userId: string): Promise<{ ownerId: string; householdId: string | null; isPartner: boolean }> {
  const { data: p } = await supabase.from('profiles').select('household_id').eq('id', userId).single()
  const householdId: string | null = p?.household_id ?? null
  if (!householdId) return { ownerId: userId, householdId: null, isPartner: false }
  const { data: h } = await supabase.from('households').select('owner_id').eq('id', householdId).single()
  const ownerId: string = h?.owner_id ?? userId
  return { ownerId, householdId, isPartner: ownerId !== userId }
}
