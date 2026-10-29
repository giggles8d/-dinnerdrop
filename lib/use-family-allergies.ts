'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type FamilyAllergies = Array<{ name: string; allergies: string[] }>

let cached: Promise<FamilyAllergies> | null = null

/** The signed-in family's allergies: each person's from Settings, plus household "-free" diets (Gluten-free → gluten). Cached per page load. */
async function loadFamilyAllergies(): Promise<FamilyAllergies> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: p } = await supabase.from('profiles').select('household_id, dietary_needs').eq('id', user.id).maybeSingle()
  const out: FamilyAllergies = []
  const diets = ((p?.dietary_needs as string[] | null) ?? []).filter((d) => /-free$/i.test(d.trim())).map((d) => d.replace(/-free$/i, '').trim())
  if (diets.length) out.push({ name: '', allergies: diets })
  if (p?.household_id) {
    const { data: m } = await supabase.from('household_members').select('name, allergies').eq('household_id', p.household_id)
    for (const row of (m ?? []) as Array<{ name: string | null; allergies: string[] | null }>) {
      if (row.allergies?.length) out.push({ name: row.name ?? '', allergies: row.allergies })
    }
  }
  return out
}

export function useFamilyAllergies(): FamilyAllergies {
  const [list, setList] = useState<FamilyAllergies>([])
  useEffect(() => {
    let live = true
    if (!cached) cached = loadFamilyAllergies().catch(() => [])
    cached.then((l) => { if (live) setList(l) })
    return () => { live = false }
  }, [])
  return list
}
