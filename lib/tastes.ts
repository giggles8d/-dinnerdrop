/**
 * What each person in the house tends to pick (Sarah, Oct 31 2026: "track the types of foods each
 * person picks per week and pick more meals like it in the future" — learn and adjust automatically).
 *
 * Learned straight from their texted votes (meal_votes): every keep / again is +1 and every skip is −1
 * for each feature of that dinner — main protein, cuisine, dish type, carb level — with recent weeks
 * counting more (×0.85 per week back). Nothing is stored; anything the family removes in Settings
 * (settings.tastes.hidden[memberId]) is ignored from then on.
 *
 * featuresOf / tasteLabel / boost are client-safe; computeTastes needs a server client.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { proteinGroup } from '@/lib/protein-mix'

const DISHES: Array<[string, RegExp]> = [
  ['tacos', /\b(tacos?|burritos?|quesadillas?|enchiladas?|fajitas?|nachos|tostadas?|chalupas?)\b/i],
  ['pasta', /\b(pasta|spaghetti|penne|lasagna|mac(aroni)?|ziti|rigatoni|fettuccine|linguine|orzo|gnocchi|tortellini|ravioli|noodles?|lo mein|ramen)\b/i],
  ['soup & chili', /\b(soup|chili|stew|chowder|bisque|gumbo)\b/i],
  ['salads', /\bsalads?\b/i],
  ['bowls', /\bbowls?\b/i],
  ['stir-fry & fried rice', /\b(stir[- ]?fry|fried rice|teriyaki|lo mein)\b/i],
  ['curry', /\b(curry|tikka|masala|korma)\b/i],
  ['burgers & sandwiches', /\b(burgers?|sliders?|sandwich(es)?|melts?|subs?|wraps?|sloppy joes?|paninis?)\b/i],
  ['pizza & flatbread', /\b(pizza|flatbread)\b/i],
  ['casseroles & bakes', /\b(casserole|bake|baked ziti|pot pie|shepherd)\b/i],
  ['sheet-pan dinners', /\bsheet[- ]?pan\b/i],
  ['slow cooker', /\b(slow[- ]?cooker|crock[- ]?pot)\b/i],
]

const CUISINE_LABEL: Record<string, string> = { american: 'American', mexican: 'Mexican', italian: 'Italian', asian: 'Asian', chinese: 'Chinese', japanese: 'Japanese', korean: 'Korean', thai: 'Thai', indian: 'Indian', mediterranean: 'Mediterranean', greek: 'Greek', 'middle eastern': 'Middle Eastern', southern: 'Southern', 'tex-mex': 'Tex-Mex', cajun: 'Cajun', french: 'French', vietnamese: 'Vietnamese' }

export interface DinnerLite { name: string; protein?: string | null; cuisine?: string | null; nutrition?: { carbs?: number } | null; tags?: string[] | null }

/** The features a dinner is scored on: "protein:chicken", "cuisine:mexican", "dish:tacos", "carb:low". */
export function featuresOf(d: DinnerLite): string[] {
  const f: string[] = []
  const g = proteinGroup(d.protein ?? null, d.name)
  if (g !== 'other') f.push(`protein:${g}`)
  const c = (d.cuisine ?? '').toLowerCase().trim()
  if (c && c !== 'mixed') f.push(`cuisine:${c}`)
  const hay = `${d.name} ${(d.tags ?? []).join(' ')}`
  for (const [key, re] of DISHES) if (re.test(hay)) f.push(`dish:${key}`)
  const carbs = d.nutrition?.carbs
  if (typeof carbs === 'number') f.push(carbs <= 20 ? 'carb:low' : carbs <= 45 ? 'carb:medium' : 'carb:high')
  return f
}

/** Words for Settings: "chicken", "Mexican food", "tacos", "low-carb dinners". */
export function tasteLabel(key: string): string {
  const [kind, val] = key.split(':')
  if (kind === 'protein') return val === 'fish' ? 'fish & seafood' : val === 'meatless' ? 'meatless dinners' : val
  if (kind === 'cuisine') return `${CUISINE_LABEL[val] ?? val.replace(/\b\w/g, (x) => x.toUpperCase())} food`
  if (kind === 'dish') return val
  if (kind === 'carb') return val === 'low' ? 'low-carb dinners' : val === 'high' ? 'carb-heavy dinners (pasta, rice, potatoes)' : 'medium-carb dinners'
  return val ?? key
}

export interface MemberTaste {
  memberId: string
  name: string
  votes: number
  scores: Record<string, number>
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')

/** Each voting member's learned scores, from the last ~6 months of votes. */
export async function computeTastes(admin: SupabaseClient, householdId: string, hidden: Record<string, string[]> = {}): Promise<MemberTaste[]> {
  const since = new Date(Date.now() - 180 * 86400000).toISOString()
  const [{ data: votes }, { data: members }] = await Promise.all([
    admin.from('meal_votes').select('member_id, meal_name, vote, created_at').eq('household_id', householdId).in('vote', ['keep', 'skip', 'again']).gte('created_at', since).limit(5000),
    admin.from('household_members').select('id, name').eq('household_id', householdId),
  ])
  const rows = (votes ?? []) as Array<{ member_id: string; meal_name: string; vote: string; created_at: string }>
  const names = Array.from(new Set(rows.map((v) => normalize(v.meal_name))))
  const byName = new Map<string, DinnerLite>()
  for (let i = 0; i < names.length; i += 200) {
    const { data } = await admin.from('recipes').select('normalized_name, name, protein, cuisine, nutrition, tags').in('normalized_name', names.slice(i, i + 200))
    for (const r of data ?? []) if (!byName.has(r.normalized_name)) byName.set(r.normalized_name, r as DinnerLite)
  }
  const out = new Map<string, MemberTaste>()
  for (const m of (members ?? []) as Array<{ id: string; name: string }>) out.set(m.id, { memberId: m.id, name: m.name, votes: 0, scores: {} })
  const now = Date.now()
  for (const v of rows) {
    const t = out.get(v.member_id)
    if (!t) continue
    const d = byName.get(normalize(v.meal_name)) ?? { name: v.meal_name }
    const weeks = Math.max(0, (now - new Date(v.created_at).getTime()) / (7 * 86400000))
    const w = (v.vote === 'skip' ? -1 : 1) * Math.pow(0.85, weeks)
    t.votes++
    const off = new Set(hidden[v.member_id] ?? [])
    for (const f of featuresOf(d)) if (!off.has(f)) t.scores[f] = (t.scores[f] ?? 0) + w
  }
  return Array.from(out.values())
}

/** How likely this person is to pick the dinner (sum of their feature scores). */
export function likeScore(t: MemberTaste, d: DinnerLite): number {
  return featuresOf(d).reduce((s, f) => s + (t.scores[f] ?? 0), 0)
}

/** "Leans toward" / "Usually skips" for Settings (only clear signals). */
export function summarize(t: MemberTaste): { likes: string[]; skips: string[] } {
  const e = Object.entries(t.scores)
  return {
    likes: e.filter(([, s]) => s >= 0.8).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
    skips: e.filter(([, s]) => s <= -0.8).sort((a, b) => a[1] - b[1]).slice(0, 4).map(([k]) => k),
  }
}

/** Members with enough votes for their tastes to steer the menu. */
export function learned(tastes: MemberTaste[]): MemberTaste[] {
  return tastes.filter((t) => t.votes >= 3)
}

/** The household's combined preference for a dinner, as a small score nudge (planner scoring). */
export function householdBoost(tastes: MemberTaste[]): ((d: DinnerLite) => number) | undefined {
  const ts = learned(tastes)
  if (!ts.length) return undefined
  return (d) => {
    const s = ts.reduce((sum, t) => sum + Math.max(-2, Math.min(2, likeScore(t, d))), 0) / ts.length
    return Math.max(-1, Math.min(1, s * 0.35))
  }
}
