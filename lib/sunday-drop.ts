/**
 * The Sunday Drop v3 (Sarah approved Nov 8 2026; plan reviewed by ChatGPT 9/10 and Gemini 9.2/10 — project doc
 * "The Sunday Drop v3: newsletter redesign"). One short weekly email per family, different for each family:
 *
 *   1. Their week + ONE main button, chosen from the family's state at the moment the email is built:
 *        shop     — week planned, cart not sent        → "Send my list to <store>"
 *        vote     — family text vote still open        → "Review the dinner votes"
 *        picked   — active, no week yet                → we pick 5 dinners from the library (saved) → "Use this week's dinners"
 *        comeback — no visit in 3+ weeks, no week      → same, shorter, and no Amazon pick
 *        done     — this week's cart already sent      → no button up top; "Save it for next week" under the recipe
 *        list     — waitlist address, no account       → "Plan my week free"
 *   2. One easy dinner worth trying (fits their diet and cook time, not in their week, not skipped, keeps to the variety rules).
 *   3. One Amazon kitchen pick for that dinner (lib/kitchen-picks; newsletter tracking ID; text link; disclosure beside it).
 *   4. One tip for what they haven't tried yet + Sarah's sign-off. Footer: settings, unsubscribe, mailing address.
 *
 * It replaces the separate "your week is planned" email: on a family's planning day the daily reminders send this
 * instead (lib/reminders), and on Sunday the texting poll sweeps everyone else (runSundayDropSweep).
 * Live only when app_kv 'sunday_drop' = { live: true, address: "<mailing address>" } (CAN-SPAM needs the address).
 */
import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import SundayDrop, { type DropProps } from '@/emails/SundayDrop'
import { mergeSettings, type Settings } from '@/lib/settings'
import { pickLibraryRecipes } from '@/lib/recipe-library'
import { libraryWeek } from '@/lib/first-plan'
import { savePlan } from '@/lib/autoplan'
import { varietyLimits, varietyOk } from '@/lib/variety'
import { pickForDinner, pickUrl } from '@/lib/kitchen-picks'
import { shopUrl, textingUrl } from '@/lib/followup'
import { mondayOf, DEFAULT_SHAPE } from '@/lib/plan'
import type { Meal } from '@/types'

export type Segment = 'shop' | 'vote' | 'picked' | 'done' | 'comeback' | 'list'

const APP = 'https://www.dinnerdrop.app'
const FROM = 'Sarah at DinnerDrop <sarah@dinnerdrop.app>'
const SKIP = /@camcomfginc\.com$/i
const SARAH = 'setzl1979@gmail.com'
const DAY = 86400000

export interface DropConfig { live: boolean; address: string }
export async function dropConfig(admin: SupabaseClient): Promise<DropConfig> {
  const { data } = await admin.from('app_kv').select('value').eq('key', 'sunday_drop').maybeSingle()
  const v = (data?.value ?? {}) as Partial<DropConfig>
  return { live: !!v.live && !!String(v.address ?? '').trim(), address: String(v.address ?? '').trim() }
}

export interface DropProfile {
  id: string
  email: string | null
  full_name: string | null
  timezone: string | null
  settings: unknown
  household_id: string | null
  family_size: number | null
  max_cook_time: number | null
  dietary_needs: string[] | null
  subscription_status: string | null
  family_until: string | null
  email_unsubscribed: boolean | null
  created_at: string | null
}
export const DROP_PROFILE_COLS = 'id, email, full_name, timezone, settings, household_id, family_size, max_cook_time, dietary_needs, subscription_status, family_until, email_unsubscribed, created_at'

const link = (path: string, seg: string) => `${APP}${path}${path.includes('?') ? '&' : '?'}utm_source=newsletter&utm_medium=email&utm_campaign=drop_${seg}`
const short = (name: string) => name.split(/ with | over | on a | served /i)[0].trim()
function firstName(full: string | null | undefined): string {
  const f = String(full ?? '').trim().split(/\s+/)[0]
  return f && /^[a-z][a-z'-]{1,20}$/i.test(f) ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : ''
}
function storeLabel(s: Settings): string {
  if (s.stores.mode === 'kroger') return 'Kroger'
  const u = (s.stores.usualStore || '').trim()
  return u && u.length <= 18 ? u : 'Instacart'
}
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** "Monday" → "Mon"; a library placeholder ("L14") → the night by position. */
export const dayLabel = (d: string | undefined, i: number) => (/^(mon|tue|wed|thu|fri|sat|sun)/i.test(d ?? '') ? String(d).slice(0, 3) : DAYS[i % 7])
const hash = (s: string) => s.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

interface Hero { name: string; slug: string; image: string; minutes: number; cost: number | null; kept: number; ingredients: Array<{ name: string }> }

/** One easy library dinner for this family that isn't in their week, wasn't skipped, and keeps to the variety rules. */
async function pickHero(admin: SupabaseClient, p: DropProfile | null, settings: Settings, week: Meal[], avoidNames: string[]): Promise<Hero | null> {
  // Everyone in the household's allergies and dislikes (a texted "lemon pepper sends me to the ER" counts).
  let allergies: string[] = [], dislikes: string[] = []
  if (p?.household_id) {
    const { data: mem } = await admin.from('household_members').select('allergies, dislikes').eq('household_id', p.household_id)
    for (const m of (mem ?? []) as Array<{ allergies: string[] | null; dislikes: string[] | null }>) { allergies.push(...(m.allergies ?? [])); dislikes.push(...(m.dislikes ?? [])) }
    allergies = allergies.filter((a) => a && a.trim()); dislikes = dislikes.filter((d) => d && d.trim().length > 2)
  }
  const rows = await pickLibraryRecipes(admin, {
    limit: 40,
    maxCookTime: Math.max(20, Math.min(p?.max_cook_time || 45, 60)),
    dietary: p?.dietary_needs ?? [],
    allergies,
    excludeWords: [...settings.food.neverIngredients, ...settings.food.avoidProteins, ...allergies, ...dislikes],
    excludeNames: [...week.map((m) => m.name), ...avoidNames],
    cuisines: settings.food.cuisines,
  })
  const lim = varietyLimits(week.length + 1)
  const ok = rows.filter((r) => r.image_url && varietyOk(r, week, lim))
  if (!ok.length) return null
  // Rotate among the best few so families don't all get the same dinner the same week.
  const top = ok.slice(0, 6)
  const r = top[hash(p?.id ?? 'list') % top.length]
  const { data: full } = await admin.from('recipes').select('slug, prep_time, cook_time, estimated_cost, kept_count').eq('id', r.id).maybeSingle()
  if (!full?.slug) return null
  return {
    name: r.name, slug: full.slug, image: String(r.image_url),
    minutes: (full.prep_time ?? 0) + (full.cook_time ?? 0),
    cost: Number(full.estimated_cost) > 0 ? Number(full.estimated_cost) : null,
    kept: full.kept_count ?? 0,
    ingredients: (r.ingredients ?? []).map((i) => ({ name: i.name })),
  }
}

async function heroBlurb(hero: Hero): Promise<string> {
  // Plain, honest, no invented facts: built from what we know about the recipe.
  const parts: string[] = []
  if (hero.minutes && hero.minutes <= 30) parts.push(`On the table in about ${hero.minutes} minutes`)
  else if (hero.minutes) parts.push(`About ${hero.minutes} minutes, start to finish`)
  if (/sheet[- ]?pan|one[- ]pan|skillet|one[- ]pot/i.test(hero.name)) parts.push('one pan to wash')
  if (/slow[- ]?cooker|crock/i.test(hero.name)) parts.push('the slow cooker does the work')
  if (/chili|soup|stew|casserole|bake|lasagna/i.test(hero.name)) parts.push('and it makes good leftovers')
  const s = parts.join(', ')
  return s ? `${s}.` : 'An everyday dinner families come back to.'
}

interface FamilyState { segment: Segment; weekStart: string; meals: Meal[]; total: number; vote?: { voted: number; members: number; leaders: string[] }; saved: boolean }

/** What this family's week looks like right now (checked when the email is built, never from an old snapshot). */
async function familyState(admin: SupabaseClient, p: DropProfile, settings: Settings, now: Date, dryRun: boolean, given?: { weekStart: string; meals: Meal[] }): Promise<FamilyState> {
  const weekStart = given?.weekStart ?? mondayOf(new Date(now.getTime() + DAY))
  if (given) return { segment: 'shop', weekStart, meals: given.meals, total: given.meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0), saved: true }
  const today = now.toISOString().slice(0, 10)
  const { data: plan } = await admin.from('meal_plans').select('id, meals, created_at, week_start, total_estimated_cost').eq('user_id', p.id).gte('week_start', today).order('created_at', { ascending: false }).limit(1).maybeSingle()
  // Family vote still open?
  if (p.household_id) {
    const { data: round } = await admin.from('vote_rounds').select('week_start, created_at').eq('household_id', p.household_id).eq('status', 'open').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (round && !plan) {
      const [{ data: votes }, { count: members }] = await Promise.all([
        admin.from('meal_votes').select('member_id, meal_name, vote').eq('household_id', p.household_id).eq('week_start', round.week_start).gte('created_at', round.created_at),
        admin.from('household_members').select('id', { count: 'exact', head: true }).eq('household_id', p.household_id).not('phone_opt_in_at', 'is', null),
      ])
      const voted = new Set((votes ?? []).map((v) => v.member_id)).size
      const tally = new Map<string, number>()
      for (const v of votes ?? []) if (v.vote === 'keep') tally.set(v.meal_name, (tally.get(v.meal_name) ?? 0) + 1)
      const leaders = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => short(n))
      return { segment: 'vote', weekStart: round.week_start, meals: [], total: 0, vote: { voted, members: members ?? 0, leaders }, saved: false }
    }
  }
  if (plan) {
    const meals = (plan.meals as Meal[]) ?? []
    const { count: carts } = await admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id).gte('created_at', plan.created_at)
    return { segment: carts ? 'done' : 'shop', weekStart: plan.week_start, meals, total: Number(plan.total_estimated_cost) || meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0), saved: true }
  }
  // No week yet: pick one from the library so "Use this week's dinners" is one tap.
  const [{ data: lastPlan }, { data: lastEv }] = await Promise.all([
    admin.from('meal_plans').select('created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('activation_events').select('created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const last = Math.max(Date.parse(lastPlan?.created_at ?? '') || 0, Date.parse(lastEv?.created_at ?? '') || 0, Date.parse(p.created_at ?? '') || 0)
  const segment: Segment = now.getTime() - last > 21 * DAY ? 'comeback' : 'picked'
  const built = await libraryWeek(admin, p.id)
  if (!built.ok) return { segment, weekStart, meals: [], total: 0, saved: false }
  const meals = dryRun ? built.meals : await savePlan(admin, p.id, weekStart, built.meals, built.shape ?? DEFAULT_SHAPE)
  return { segment, weekStart, meals, total: meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0), saved: !dryRun }
}

export interface BuiltDrop { segment: Segment; weekStart: string; subject: string; preview: string; props: DropProps; hero: string | null; asin: string | null }

/** Everything for one family's email. dryRun = build only (no saved week); used by previews. */
export async function buildDrop(admin: SupabaseClient, p: DropProfile, opts: { now?: Date; dryRun?: boolean; address: string; given?: { weekStart: string; meals: Meal[] }; force?: Segment } = { address: '' }): Promise<BuiltDrop> {
  const now = opts.now ?? new Date()
  const settings = mergeSettings(p.settings)
  const st = await familyState(admin, p, settings, now, !!opts.dryRun, opts.given)
  if (opts.force) st.segment = opts.force
  const name = firstName(p.full_name)

  // History: what this family was already shown (hero dinners, products) so the email keeps changing.
  const { data: histRow } = await admin.from('app_kv').select('value').eq('key', `drop_hist:${p.id}`).maybeSingle()
  const hist = (histRow?.value ?? {}) as { heroes?: string[]; asins?: string[] }
  let skipped: string[] = []
  if (p.household_id) {
    const { data: sv } = await admin.from('meal_votes').select('meal_name, vote').eq('household_id', p.household_id).gte('created_at', new Date(now.getTime() - 120 * DAY).toISOString())
    const t = new Map<string, number>()
    for (const v of sv ?? []) t.set(v.meal_name, (t.get(v.meal_name) ?? 0) + (v.vote === 'skip' ? 1 : v.vote === 'keep' ? -1 : 0))
    skipped = Array.from(t.entries()).filter(([, n]) => n > 0).map(([k]) => k)
  }
  const hero = await pickHero(admin, p, settings, st.meals, [...skipped, ...(hist.heroes ?? []).slice(-12)])
  const pick = hero && st.segment !== 'comeback' ? pickForDinner(hero, (hist.asins ?? []).slice(-8), hash(p.id)) : null

  const store = storeLabel(settings)
  const n = st.meals.length
  const firstDinner = n ? short(st.meals[0].name) : ''
  const seg = st.segment
  const subject = {
    shop: `Your ${store} list is ready: ${firstDinner}${n > 1 ? ` + ${n - 1} more` : ''}`,
    vote: st.vote?.voted && st.vote.leaders[0] ? `${st.vote.voted} ${st.vote.voted === 1 ? 'vote' : 'votes'} in: ${st.vote.leaders[0]} is leading` : "Your family's dinner vote is open",
    picked: `Your ${n || 5} dinners are picked${name ? `, ${name}` : ''}. Want them?`,
    comeback: `I picked ${n || 5} dinners for you this week`,
    done: hero ? `For next week: ${short(hero.name)}${hero.minutes ? ` (${hero.minutes} min)` : ''}` : 'One easy dinner idea for next week',
    list: hero ? `This week's easy dinner: ${short(hero.name)}` : 'One easy dinner idea for this week',
  }[seg]
  const preview = {
    shop: 'One list. Your store. Your week.',
    vote: 'See the picks and finish your week.',
    picked: 'Built from your settings. Swap anything, then one tap builds your list.',
    comeback: 'Built from your settings. One tap and dinner is handled.',
    done: "You're set for this week. Plus one dinner to save for later.",
    list: 'One easy dinner, and a way to get your whole week planned free.',
  }[seg]

  // Block 4 tip: the one thing this family hasn't tried yet.
  let tip: DropProps['tip'] = null
  if (seg !== 'list') {
    const [{ count: phones }, { count: carts }] = await Promise.all([
      p.household_id ? admin.from('household_members').select('id', { count: 'exact', head: true }).eq('household_id', p.household_id).or(`profile_id.is.null,profile_id.neq.${p.id}`).not('phone', 'is', null) : Promise.resolve({ count: 0 }),
      admin.from('grocery_handoffs').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
    ])
    const familyEnds = p.family_until && p.subscription_status !== 'active' ? Date.parse(p.family_until) : 0
    if (!phones && seg !== 'vote') tip = { text: "Add your family's phone numbers and they vote on dinners by text. No app for them to download.", label: 'Add my family', href: textingUrl(p.id, 'drop') }
    else if (!carts) tip = { text: 'When your list is ready, one tap fills your Instacart, Walmart or Kroger cart. Nothing to type.', label: null, href: null }
    else if (familyEnds > now.getTime() && familyEnds - now.getTime() < 10 * DAY) tip = { text: `Your free Family days end ${new Date(familyEnds).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Family keeps the text votes, reminders and family profiles going.`, label: 'See Family', href: link('/settings', seg) }
    else tip = { text: "Don't love a dinner? Swap it, and your grocery list updates itself.", label: null, href: null }
  }

  const unsubscribeUrl = `${APP}/unsubscribe?uid=${p.id}`
  const props: DropProps = {
    segment: seg,
    greeting: seg === 'picked' || seg === 'comeback'
      ? `Hi ${name || 'there'}, I picked ${n || 5} dinners that fit your family${p.family_size ? ` of ${p.family_size}` : ''} and your weeknights.`
      : seg === 'done' ? `Hi ${name || 'there'}, you're set for this week.` : seg === 'vote' ? `Hi ${name || 'there'}, your family is voting on this week's dinners.` : seg === 'list' ? 'Hi there, here is one easy dinner for this week.' : `Hi ${name || 'there'}, here's your week.`,
    dinners: seg === 'done' || seg === 'list' || seg === 'vote' ? [] : st.meals.slice(0, seg === 'shop' ? 7 : 3).map((m, i) => ({ day: dayLabel(m.day, i), name: m.name.length > 44 ? short(m.name) : m.name })),
    moreCount: seg === 'picked' || seg === 'comeback' ? Math.max(0, n - 3) : 0,
    estimate: seg === 'shop' && st.total > 0 ? Math.round(st.total) : null,
    vote: st.vote ?? null,
    main: {
      shop: { label: `Send my list to ${store}`, href: shopUrl(p.id, 'plan_ready') },
      vote: { label: 'Review the dinner votes', href: link('/vote-review', seg) },
      picked: { label: "Use this week's dinners", href: link('/dashboard', seg) },
      comeback: { label: "Use this week's dinners", href: link('/dashboard', seg) },
      done: null,
      list: { label: 'Plan my week free', href: link('/start', seg) },
    }[seg],
    secondary: seg === 'shop' ? [{ label: 'Swap a dinner', href: link('/dashboard', seg) }, { label: 'See the full week', href: link('/dashboard', seg) }]
      : seg === 'picked' || seg === 'comeback' ? [{ label: 'Pick my own instead', href: link('/dashboard', seg) }] : [],
    hero: hero ? {
      name: hero.name, image: hero.image, minutes: hero.minutes, cost: hero.cost, kept: hero.kept,
      blurb: await heroBlurb(hero),
      href: link(`/recipes/${hero.slug}`, seg),
      cta: seg === 'done' ? 'Save it for next week' : seg === 'list' ? 'Get the recipe' : 'Add it to my week',
      ctaIsButton: seg === 'done',
    } : null,
    pick: pick ? { product: pick.product, why: pick.why, href: pickUrl(pick) } : null,
    tip,
    unsubscribeUrl,
    settingsUrl: link('/settings', seg),
    address: opts.address,
    weekLabel: new Date(`${st.weekStart}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
  return { segment: seg, weekStart: st.weekStart, subject, preview, props: { ...props, preview }, hero: hero?.slug ?? null, asin: pick?.asin ?? null }
}

async function sendBuilt(to: string, b: BuiltDrop, unsubUid: string | null, subjectPrefix = ''): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'no RESEND_API_KEY' }
  const html = await render(React.createElement(SundayDrop, b.props))
  const text = await render(React.createElement(SundayDrop, b.props), { plainText: true })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${subjectPrefix}${b.subject}`,
    html,
    text,
    reply_to: 'sarah@dinnerdrop.app',
    headers: unsubUid ? { 'List-Unsubscribe': `<${APP}/api/email/unsubscribe?uid=${unsubUid}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : {},
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Build + send one family's Sunday Drop once per week (claimed in app_kv drop:<uid>:<weekStart>). */
export async function sendDrop(admin: SupabaseClient, p: DropProfile, cfg: DropConfig, opts: { now?: Date; given?: { weekStart: string; meals: Meal[] } } = {}): Promise<{ sent: boolean; segment?: Segment; error?: string; recent?: boolean }> {
  if (!p.email || p.email_unsubscribed || SKIP.test(p.email)) return { sent: false }
  // At most one Drop in 5 days (families with two shopping trips a week get the plain plan email for the second).
  const { data: lately } = await admin.from('app_kv').select('key').like('key', `drop:${p.id}:%`).gte('updated_at', new Date((opts.now ?? new Date()).getTime() - 5 * DAY).toISOString()).limit(1)
  if (lately?.length) return { sent: false, recent: true }
  const b = await buildDrop(admin, p, { now: opts.now, address: cfg.address, given: opts.given })
  const key = `drop:${p.id}:${b.weekStart}`
  const { error: claimErr } = await admin.from('app_kv').insert({ key, value: { at: new Date().toISOString(), segment: b.segment, hero: b.hero, asin: b.asin }, updated_at: new Date().toISOString() })
  if (claimErr) return { sent: false }   // already sent this week
  const r = await sendBuilt(p.email, b, p.id)
  if (!r.ok) { await admin.from('app_kv').update({ key: `${key}:failed:${Date.now()}` }).eq('key', key); return { sent: false, error: r.error } }
  const { data: histRow } = await admin.from('app_kv').select('value').eq('key', `drop_hist:${p.id}`).maybeSingle()
  const hist = (histRow?.value ?? {}) as { heroes?: string[]; asins?: string[] }
  const heroName = b.props.hero?.name
  await admin.from('app_kv').upsert({ key: `drop_hist:${p.id}`, value: { heroes: [...(hist.heroes ?? []), ...(heroName ? [heroName] : [])].slice(-20), asins: [...(hist.asins ?? []), ...(b.asin ? [b.asin] : [])].slice(-12) }, updated_at: new Date().toISOString() })
  return { sent: true, segment: b.segment }
}

function localParts(tz: string, now: Date): { weekday: string; hour: number } {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(now)
    return { weekday: f.find((x) => x.type === 'weekday')?.value.toLowerCase() ?? '', hour: Number(f.find((x) => x.type === 'hour')?.value ?? 0) % 24 }
  } catch { return localParts('America/New_York', now) }
}

/**
 * Sunday sweep (run from the 2–5 minute texting poll): every family that hasn't had this week's Drop gets it once
 * it's 8 AM–8 PM Sunday where they live. Families whose planning day is Sunday wait until 10 AM so the daily
 * reminders (which plan their week and send their Drop) go first. Time-boxed; the next poll carries on.
 */
export async function runSundayDropSweep(admin: SupabaseClient, now = new Date(), budgetMs = 30000): Promise<{ sent: number; skipped?: string; errors: number }> {
  const started = Date.now()
  const cfg = await dropConfig(admin)
  if (!cfg.live) return { sent: 0, skipped: 'not live (app_kv sunday_drop)', errors: 0 }
  const { data: profs } = await admin.from('profiles').select(DROP_PROFILE_COLS).not('email', 'is', null).neq('email_unsubscribed', true).order('created_at').limit(3000)
  const weekKey = mondayOf(new Date(now.getTime() + DAY))
  const { data: done } = await admin.from('app_kv').select('key').like('key', `drop:%:${weekKey}`)
  const doneIds = new Set((done ?? []).map((d) => String(d.key).split(':')[1]))
  let sent = 0, errors = 0
  for (const p of (profs ?? []) as DropProfile[]) {
    if (Date.now() - started > budgetMs) break
    if (doneIds.has(p.id) || !p.email || SKIP.test(p.email)) continue
    const { weekday, hour } = localParts(p.timezone || 'America/New_York', now)
    if (weekday !== 'sun' || hour < 8 || hour >= 20) continue
    const s = mergeSettings(p.settings)
    if (s.schedule.autoPlan && s.schedule.planDay === 'sun' && hour < 10) continue
    try {
      const r = await sendDrop(admin, p, cfg, { now })
      if (r.sent) sent++
      else if (r.error) errors++
    } catch (e) { errors++; console.error('[sunday-drop]', p.id, e) }
    await new Promise((res) => setTimeout(res, 150))   // Resend: 10 requests a second
  }
  // Waitlist addresses (no account): after 8 AM Eastern.
  const et = localParts('America/New_York', now)
  if (et.weekday === 'sun' && et.hour >= 8 && et.hour < 20 && Date.now() - started < budgetMs) {
    const { data: wl } = await admin.from('waitlist').select('email')
    const accountEmails = new Set((profs ?? []).map((p) => String(p.email).toLowerCase()))
    for (const w of wl ?? []) {
      if (Date.now() - started > budgetMs) break
      const email = String(w.email ?? '').toLowerCase()
      if (!email || accountEmails.has(email) || SKIP.test(email)) continue
      const key = `drop:wl:${email}:${weekKey}`
      const { error: claimErr } = await admin.from('app_kv').insert({ key, value: { at: new Date().toISOString(), segment: 'list' }, updated_at: new Date().toISOString() })
      if (claimErr) continue
      const b = await buildDrop(admin, { id: `wl-${hash(email)}`, email, full_name: null, timezone: null, settings: null, household_id: null, family_size: null, max_cook_time: 45, dietary_needs: [], subscription_status: null, family_until: null, email_unsubscribed: false, created_at: null }, { now, address: cfg.address, force: 'list', dryRun: true })
      b.props.unsubscribeUrl = `${APP}/unsubscribe?email=${encodeURIComponent(email)}`
      const r = await sendBuilt(email, b, null)
      if (r.ok) sent++; else errors++
    }
  }
  return { sent, errors }
}

/** Preview: one test email per version to Sarah, built from her own account (nothing saved). */
export async function sendDropPreviews(admin: SupabaseClient, segments: Segment[]): Promise<Array<{ segment: Segment; ok: boolean; subject: string; error?: string }>> {
  const cfg = await dropConfig(admin)
  const { data: p } = await admin.from('profiles').select(DROP_PROFILE_COLS).eq('email', SARAH).maybeSingle()
  if (!p) return []
  const out: Array<{ segment: Segment; ok: boolean; subject: string; error?: string }> = []
  for (const seg of segments) {
    // For the "no week yet" versions, show what a family without a plan would see (a library week, not saved).
    const given = seg === 'picked' || seg === 'comeback' ? undefined : undefined
    const b = await buildDrop(admin, p as DropProfile, { address: cfg.address || '[mailing address goes here]', dryRun: true, force: seg, given })
    if ((seg === 'picked' || seg === 'comeback') && b.props.dinners.length === 0) {
      const built = await libraryWeek(admin, (p as DropProfile).id)
      if (built.ok) { b.props.dinners = built.meals.slice(0, 3).map((m, i) => ({ day: dayLabel(m.day, i), name: m.name })); b.props.moreCount = Math.max(0, built.meals.length - 3) }
    }
    if (seg === 'vote' && !b.props.vote) b.props.vote = { voted: 3, members: 5, leaders: ['Meatloaf', 'Chicken Alfredo'] }
    const r = await sendBuilt(SARAH, b, (p as DropProfile).id, `[TEST ${seg}] `)
    out.push({ segment: seg, ok: r.ok, subject: b.subject, error: r.error })
    await new Promise((res) => setTimeout(res, 300))
  }
  return out
}
