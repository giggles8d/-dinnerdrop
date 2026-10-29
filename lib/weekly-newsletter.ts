/**
 * "The Sunday Drop" — weekly, Allrecipes-style dinner email (Sarah, Oct 28 2026).
 * Built from the real recipe library each week: one featured dinner with "complete your meal" sides,
 * the dinners families kept most, a grocery tip, and a reply-to-be-featured invite.
 * No made-up quotes or stats — "families kept it" counts are real (recipes.kept_count).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWithClaude, parseClaudeJSON } from '@/lib/claude'
import { getIssueForDate } from '@/lib/newsletter-content'

export interface NlRecipe { name: string; slug: string; image: string; minutes: number; cost: number | null; kept: number; cuisine: string | null }
export interface WeeklyIssue {
  subject: string
  preview: string
  featured: NlRecipe & { blurb: string; sides: Array<{ name: string; note: string }> }
  trending: NlRecipe[]
  tip: { title: string; body: string }
  weekKey: string
}

const HISTORY_KEY = 'newsletter_history'
const site = 'https://www.dinnerdrop.app'
export const nlLink = (path: string, campaign: string) => `${site}${path}${path.includes('?') ? '&' : '?'}utm_source=newsletter&utm_medium=email&utm_campaign=${campaign}`

type Row = { name: string; slug: string; image_url: string; prep_time: number | null; cook_time: number | null; estimated_cost: string | number | null; kept_count: number | null; times_planned: number | null; cuisine: string | null; tags: string[] | null }
const toNl = (r: Row): NlRecipe => ({
  name: r.name, slug: r.slug, image: r.image_url, minutes: (r.prep_time ?? 0) + (r.cook_time ?? 0),
  cost: r.estimated_cost != null && Number(r.estimated_cost) > 0 ? Number(r.estimated_cost) : null, kept: r.kept_count ?? 0, cuisine: r.cuisine,
})

export async function buildWeeklyIssue(db: SupabaseClient, now = new Date()): Promise<WeeklyIssue> {
  const weekKey = now.toISOString().slice(0, 10)
  const { data: kv } = await db.from('app_kv').select('value').eq('key', HISTORY_KEY).maybeSingle()
  const used = new Set<string>(((kv?.value as { slugs?: string[] } | null)?.slugs ?? []).slice(-200))
  const { data } = await db.from('recipes')
    .select('name, slug, image_url, prep_time, cook_time, estimated_cost, kept_count, times_planned, cuisine, tags')
    .eq('is_public', true).not('image_url', 'is', null)
    .order('kept_count', { ascending: false, nullsFirst: false }).order('times_planned', { ascending: false, nullsFirst: false })
    .limit(120)
  const rows = ((data ?? []) as Row[]).filter((r) => r.slug && r.image_url && (r.prep_time ?? 0) + (r.cook_time ?? 0) <= 45)
  const fresh = rows.filter((r) => !used.has(r.slug))
  const pool = fresh.length >= 4 ? fresh : rows
  const featuredRow = pool[0]
  const trending = pool.slice(1, 5).map(toNl)
  const featured = toNl(featuredRow)

  let blurb = `${featured.minutes ? `${featured.minutes} minutes` : 'Weeknight-easy'}${featured.cost ? `, about $${featured.cost.toFixed(0)} for the family` : ''}${featured.kept ? ` — kept by ${featured.kept} DinnerDrop families` : ''}.`
  let sides: Array<{ name: string; note: string }> = [
    { name: 'Simple green salad', note: 'Bagged greens, lemon, olive oil, salt — 3 minutes.' },
    { name: 'Roasted broccoli', note: '425°F for 15 minutes while dinner cooks.' },
  ]
  try {
    const text = await generateWithClaude(
      `You write a family dinner newsletter. For the dinner "${featured.name}", return ONLY JSON: {"blurb": "one warm, specific sentence on why families like it (no invented facts, no quotes, no numbers)", "sides": [{"name": "easy side dish", "note": "how to make it in under 10 words"}, {"name": "...", "note": "..."}, {"name": "a simple dessert or drink", "note": "under 10 words"}]}`,
      300,
    )
    const j = parseClaudeJSON<{ blurb?: string; sides?: Array<{ name: string; note: string }> }>(text)
    if (j?.blurb) blurb = `${j.blurb} ${blurb}`
    if (Array.isArray(j?.sides) && j!.sides!.length >= 2) sides = j!.sides!.slice(0, 3).map((s) => ({ name: String(s.name).slice(0, 50), note: String(s.note).slice(0, 80) }))
  } catch { /* defaults */ }

  const tip = getIssueForDate(now).tip
  return {
    subject: `This week's dinner: ${featured.name} (+ what to serve with it)`,
    preview: `${featured.minutes ? `${featured.minutes}-minute ` : ''}${featured.name}, the dinners families kept most, and one grocery tip.`,
    featured: { ...featured, blurb, sides },
    trending,
    tip,
    weekKey,
  }
}

/** Remember what was featured so next week's issue picks different dinners. */
export async function recordIssue(db: SupabaseClient, issue: WeeklyIssue) {
  const { data: kv } = await db.from('app_kv').select('value').eq('key', HISTORY_KEY).maybeSingle()
  const prev = (kv?.value as { slugs?: string[]; weeks?: string[] } | null) ?? {}
  const slugs = [...(prev.slugs ?? []), issue.featured.slug, ...issue.trending.map((t) => t.slug)].slice(-300)
  const weeks = [...(prev.weeks ?? []), issue.weekKey].slice(-60)
  await db.from('app_kv').upsert({ key: HISTORY_KEY, value: { slugs, weeks } })
}
