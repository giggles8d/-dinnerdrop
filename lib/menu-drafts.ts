/**
 * Menus going out (Sarah, Nov 9 2026): next week's menus are built Friday as drafts so she can review them on the
 * Command Center before they go out Saturday morning. Saturday's auto plan (lib/autoplan) sends the reviewed draft.
 * Edits made on the review page are stored as requests on the draft (edits / status) and applied here.
 */
import { headcountFor } from '@/lib/headcount'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeSettings, tripsConfig, type Settings } from '@/lib/settings'
import { isClassic } from '@/lib/trips'
import { localNow, mondayOf } from '@/lib/plan'
import { allergyConflicts } from '@/lib/allergens'
import { proteinGroup } from '@/lib/protein-mix'
import { recipeToMeal, type RecipeRow } from '@/lib/recipe-library'
import type { Meal } from '@/types'
import type { AutoPlanProfile } from '@/lib/autoplan'

const ACTIVE_DAYS = 45
const UNUSUAL = /\b(curry|thai|harissa|jerk|gochujang|korean|tikka|masala|risotto|polenta|scallops?|tofu|tempeh|miso|kimchi|ramen|pho|tagine|shakshuka)\b/i
const SPICY = /\b(spicy|chipotle|jalape(n|ñ)o|sriracha|buffalo|cajun|blackened|habanero|chili crisp|hot honey)\b/i

export type DraftProfile = AutoPlanProfile & { settings: unknown; timezone: string | null; household_id: string | null; email: string | null }

/** The week this weekend's menus are for, seen from today (ET): the next Monday after today. */
export function nextWeekStart(now = new Date()): string {
  const { dateStr } = localNow('America/New_York', now)
  const thisMonday = mondayOf(new Date(`${dateStr}T12:00:00Z`))
  return new Date(new Date(`${thisMonday}T12:00:00Z`).getTime() + 7 * 86400000).toISOString().slice(0, 10)
}

/** Families whose menu goes out this weekend: classic weekly plan, auto plan on, Saturday/Sunday plan day, active. */
export async function weekendFamilies(admin: SupabaseClient): Promise<DraftProfile[]> {
  const { data } = await admin.from('profiles')
    .select('id, email, timezone, settings, household_id, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs')
    .neq('email', 'setzl1979@gmail.com')
  const out: DraftProfile[] = []
  for (const p of (data ?? []) as DraftProfile[]) {
    const s = mergeSettings(p.settings)
    if (!s.schedule.autoPlan || !isClassic(tripsConfig(s))) continue
    if (s.schedule.planDay !== 'sat' && s.schedule.planDay !== 'sun') continue
    out.push(p)
  }
  return out
}

async function isActive(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from('meal_plans').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
  const at = data?.[0]?.created_at
  return !!at && Date.now() - new Date(at).getTime() <= ACTIVE_DAYS * 86400000
}

/** Warnings a reviewer should see: diet/allergy/no-list conflicts, too long, over budget, seafood, unusual, repeats. */
export async function draftChecks(admin: SupabaseClient, p: DraftProfile, settings: Settings, meals: Meal[]): Promise<Array<{ level: 'bad' | 'warn'; text: string }>> {
  const out: Array<{ level: 'bad' | 'warn'; text: string }> = []
  const { data: mem } = p.household_id ? await admin.from('household_members').select('name, allergies, dislikes').eq('household_id', p.household_id) : { data: [] }
  const people = ((mem ?? []) as Array<{ name: string; allergies: string[] | null; dislikes: string[] | null }>)
  const never = [...settings.food.neverIngredients, ...settings.food.avoidProteins].map((w) => w.toLowerCase()).filter(Boolean)
  const { data: last } = await admin.from('meal_plans').select('meals').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1)
  const lastNames = new Set(((last?.[0]?.meals ?? []) as Meal[]).map((m) => m.name.toLowerCase()))
  const maxCook = p.max_cook_time || 30
  for (const m of meals) {
    const hay = `${m.name} ${(m.ingredients ?? []).map((i) => i.name).join(' ')}`.toLowerCase()
    const ac = allergyConflicts(m.ingredients ?? [], people.map((x) => ({ name: x.name, allergies: x.allergies ?? [] })), m.name)
    if (ac.length) out.push({ level: 'bad', text: `${m.name}: allergy (${ac.map((c) => `${c.who.join(", ")} – ${c.allergy}`).join(', ')})` })
    const no = never.filter((w) => hay.includes(w))
    if (no.length) out.push({ level: 'bad', text: `${m.name}: on their no-list (${no.join(', ')})` })
    for (const x of people) {
      const d = (x.dislikes ?? []).filter((w) => w && hay.includes(w.toLowerCase()))
      if (d.length) out.push({ level: 'warn', text: `${m.name}: ${x.name} doesn't like ${d.join(', ')}` })
    }
    if ((Number(m.cookTime) || 0) > maxCook + 10 && !(m.tags ?? []).includes('slow-cooker')) out.push({ level: 'warn', text: `${m.name}: ${m.cookTime} min (their limit ${maxCook})` })
    if (lastNames.has(m.name.toLowerCase())) out.push({ level: 'warn', text: `${m.name}: same as last week` })
  }
  const budget = Number(String(p.weekly_budget ?? '').replace(/[^0-9.]/g, '')) || 0
  const total = meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  if (budget && total > budget) out.push({ level: 'warn', text: `Week is about $${Math.round(total)}, over their ${p.weekly_budget}` })
  const fish = meals.filter((m) => proteinGroup(m.protein, m.name) === 'fish').length
  if (fish >= 2) out.push({ level: 'warn', text: `${fish} seafood dinners` })
  const odd = meals.filter((m) => UNUSUAL.test(m.name) || SPICY.test(m.name)).length
  if (odd >= 2) out.push({ level: 'warn', text: `${odd} spicy or unusual dinners` })
  return out
}

/** Build (or rebuild) one family's draft for the week. */
export async function buildDraft(admin: SupabaseClient, p: DraftProfile, weekStart: string): Promise<boolean> {
  const settings = mergeSettings(p.settings)
  const { buildWeekMeals } = await import('@/lib/autoplan')
  const built = await buildWeekMeals(admin, p, settings, weekStart)
  if (!built?.meals.length) return false
  const checks = await draftChecks(admin, p, settings, built.meals)
  await admin.from('menu_drafts').upsert({ user_id: p.id, week_start: weekStart, meals: built.meals, checks, source: built.source, status: 'draft', edits: [], built_at: new Date().toISOString() }, { onConflict: 'user_id,week_start' })
  return true
}

/** Apply edit requests from the review page (remove / swap a dinner) and rebuild requests. */
export async function applyDraftEdits(admin: SupabaseClient, draft: { id: string; user_id: string; week_start: string; meals: Meal[]; edits: Array<{ op: string; index: number; recipe_id?: string }>; status: string }, p?: DraftProfile): Promise<Meal[] | null> {
  const prof = p ?? (await admin.from('profiles').select('id, email, timezone, settings, household_id, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs').eq('id', draft.user_id).single()).data as DraftProfile | null
  if (!prof) return null
  if (draft.status === 'rebuild') { await buildDraft(admin, prof, draft.week_start); const { data } = await admin.from('menu_drafts').select('meals').eq('id', draft.id).single(); return (data?.meals ?? null) as Meal[] | null }
  if (!draft.edits?.length) return draft.meals
  let meals = [...draft.meals]
  const removeIdx = new Set<number>()
  for (const e of draft.edits) {
    if (e.op === 'remove') removeIdx.add(e.index)
    if (e.op === 'swap' && e.recipe_id && meals[e.index]) {
      const { data: r } = await admin.from('recipes').select('*').eq('id', e.recipe_id).single()
      if (r) meals[e.index] = { ...recipeToMeal(r as RecipeRow, meals[e.index].day, headcountFor(mergeSettings(prof.settings), draft.week_start, prof.family_size || 4)), day: meals[e.index].day }
    }
  }
  meals = meals.filter((_, i) => !removeIdx.has(i))
  const checks = await draftChecks(admin, prof, mergeSettings(prof.settings), meals)
  await admin.from('menu_drafts').update({ meals, checks, edits: [], status: 'draft', edited_at: new Date().toISOString() }).eq('id', draft.id)
  return meals
}

/**
 * Friday sweep (and catch-up early Saturday), called from the 2-minute poll: build missing drafts for this weekend's
 * families and apply pending edits, within a time budget. Library weeks (never ordered) take about a second;
 * AI weeks take longer, so at most one per call.
 */
export async function runMenuDraftSweep(admin: SupabaseClient, now = new Date(), budgetMs = 25000, maxAi = 1): Promise<{ built: number; edited: number; left: number }> {
  const started = Date.now()
  const week = nextWeekStart(now)
  const r = { built: 0, edited: 0, left: 0 }
  // Pending edits first (Sarah is waiting on them).
  const { data: drafts } = await admin.from('menu_drafts').select('id, user_id, week_start, meals, edits, status').eq('week_start', week).in('status', ['draft', 'rebuild'])
  const pending = (drafts ?? []).filter((d) => d.status === 'rebuild' || (Array.isArray(d.edits) && d.edits.length))
  for (const d of pending) {
    if (Date.now() - started > budgetMs) break
    try { await applyDraftEdits(admin, d as never); r.edited++ } catch (e) { console.error('[menu-drafts] edit', d.id, e) }
  }
  const { data: have } = await admin.from('menu_drafts').select('user_id').eq('week_start', week)
  const done = new Set((have ?? []).map((x) => x.user_id))
  const fams = (await weekendFamilies(admin)).filter((p) => !done.has(p.id))
  let aiUsed = 0
  for (const p of fams) {
    if (Date.now() - started > budgetMs) { r.left++; continue }
    if (!(await isActive(admin, p.id))) continue
    const { count } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id)
    const ordered = (count ?? 0) > 0
    if (ordered && aiUsed >= maxAi) { r.left++; continue }
    try { if (await buildDraft(admin, p, week)) { r.built++; if (ordered) aiUsed++ } } catch (e) { console.error('[menu-drafts] build', p.id, e) }
  }
  return r
}

/** Friday (ET) and Saturday before 8 AM ET: the window the sweep runs in. */
export function inDraftWindow(now = new Date()): boolean {
  const { weekday, hour } = localNow('America/New_York', now)
  return weekday === 'fri' || (weekday === 'sat' && hour < 8)
}
