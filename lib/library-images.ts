'use client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

function norm(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() }

/**
 * Give plan meals the library's photo (DinnerDrop-generated, stored once) so
 * every family sees the same picture for the same dinner, regardless of what
 * the plan JSON captured at generation time.
 */
export async function attachLibraryImages(supabase: SupabaseClient, meals: Meal[]): Promise<Meal[]> {
  if (!meals.length) return meals
  const names = Array.from(new Set(meals.map((m) => norm(m.name))))
  const { data } = await supabase.from('recipes').select('id, normalized_name, image_url').in('normalized_name', names)
  const byName = new Map((data ?? []).map((r) => [r.normalized_name, r]))
  return meals.map((m) => {
    const r = byName.get(norm(m.name))
    return r?.image_url ? { ...m, imageUrl: r.image_url, recipeId: m.recipeId ?? r.id } : m
  })
}
