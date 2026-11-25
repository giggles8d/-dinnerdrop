'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { trackOnce } from '@/lib/activation'
import { FOOD_STYLES } from '@/lib/styles'
import { takePickedStyle, clearPickedStyle } from '@/lib/picked-style'
import { GOALS, type Goal } from '@/lib/onboarding'
import { MIX_GROUPS, MIX_EVERY, type MixKey } from '@/lib/protein-mix'
import { WEEKDAY_LABEL, type Weekday } from '@/lib/settings'
import type { QuickSetupAnswers } from '@/components/QuickSetup'
import { budgetOptions, defaultBudget } from '@/lib/budget-math'

/**
 * First-time walkthrough (Sarah, Nov 7 2026): eight short screens after sign-up so a new family's first week fits
 * them and they find the settings that make DinnerDrop theirs. Replaces the 4-step QuickSetup (kept for rollback).
 *   1 goal · 2 who's at the table · 3 styles + diets · 4 likes / no-thanks per person · 5 weekly mix + how often
 *   6 cook nights + Sunday family dinner · 7 budget + store brands · 8 how and when you shop · 9 family texting
 *   · then a summary.
 * Every screen has "Skip the rest · plan my week now", which saves what's set so far. One POST to
 * /api/onboarding/walkthrough. `demo` renders without saving (/preview/onboarding).
 *
 * Screen 8 (Nov 22 2026 review, Sarah approved): setup never asked how or when a family shops, so the only send was
 * "fill an online cart right now". The answer picks the main action on the grocery list (cart vs "Text me this
 * list") and the shop-day morning nudge (lib/shop-day). Both answers start filled in; nothing is required.
 *
 * Shop screen first (Sarah, Nov 25 2026: competitor review action 2). eMeals asks how and where you shop before
 * anything else; here it was screen 8 of 9, and families who tapped "Show me my dinners now" earlier never answered,
 * so they got no shop day and the default store. The screens keep their numbers (`screen`, also the
 * walkthrough_step event id, so old and new data compare); ORDER only changes the order they're shown in (`step` is
 * the position). The shop answer is saved once the family taps a choice or presses Next on it, not on a skip.
 */

type Role = 'adult' | 'kid'
interface Person { name: string; role: Role; likes: string[]; dislikes: string[]; allergies: string[]; phone: string }
type ShopHow = 'online' | 'store'
type ShopDay = Weekday | 'varies'

const STEPS = 9
const SHOP_SCREEN = 7
// Screen shown at each position: shop first, then goal, table, styles, likes, mix, week, budget, texting, summary.
const ORDER = [SHOP_SCREEN, 0, 1, 2, 3, 4, 5, 6, 8, STEPS] as const
const DRAFT_VERSION = 2 // drafts saved before the reorder stored a position in the old order; don't restore those
// Sunday first: the order families think about the week in.
const SHOP_DAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const SHOP_HOW: Array<{ key: ShopHow; label: string; blurb: string }> = [
  { key: 'online', label: 'I order online', blurb: 'Instacart or Walmart, delivery or pickup. One tap fills your cart.' },
  { key: 'store', label: 'I go to the store', blurb: 'We text or email you the list. Check items off on your phone as you shop.' },
]
const DRAFT_KEY = 'dd_walkthrough'
const DIETS = ['Gluten-free', 'Dairy-free', 'Nut-free', 'Vegetarian', 'Pescatarian', 'Halal']
const LIKES = ['Pasta', 'Tacos', 'Pizza', 'Chicken', 'Burgers', 'Steak', 'Soup', 'Rice bowls', 'Mac and cheese', 'Stir-fry', 'Potatoes', 'Broccoli']
const DISLIKES = ['Mushrooms', 'Onions', 'Beans', 'Seafood', 'Spicy food', 'Olives', 'Cilantro', 'Tomatoes', 'Bell peppers', 'Avocado', 'Eggplant', 'Anything mixed together']
const ALLERGIES = ['Peanuts', 'Tree nuts', 'Dairy', 'Eggs', 'Gluten', 'Soy', 'Shellfish', 'Fish', 'Sesame']
const NIGHTS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const BUSY = [20, 30, 45, 60]
const SUNDAY = [{ m: 60, l: '1 hour' }, { m: 120, l: '2 hours' }, { m: 240, l: 'All afternoon' }]
const IMG = 'https://znxuxkqmmulnhkuwlshr.supabase.co/storage/v1/object/public/recipe-images/'
// Real library dinners shown on the first screen so a new family sees what they're setting up (Nov 21 2026).
const PREVIEW = [
  { name: 'Sheet-Pan Crispy Chicken and Roasted Potatoes', img: `${IMG}f94d71aa-4a78-4c61-befb-10736780c5a9.webp` },
  { name: 'Turkey Meatball Marinara with Pasta', img: `${IMG}f2851b34-0365-4bfe-8949-34d6d6579334.webp` },
  { name: 'Slow-Cooker Pulled Chicken Sandwiches', img: `${IMG}c7eaac90-2130-4e27-84a0-add7658d3823.webp` },
]
const VOTE_DAYS: Weekday[] = ['fri', 'sat', 'sun']

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-full touch-manipulation border-2 text-sm transition-colors ${on ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/60 hover:text-foreground'}`}>
      <span aria-hidden="true" className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[11px] leading-none ${on ? 'bg-white text-primary font-bold' : 'border border-gray-300 text-gray-400'}`}>{on ? '✓' : '+'}</span>
      {children}
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-foreground mt-4 mb-2">{children}</p>
}

const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

export default function Walkthrough({ onDone, demo = false, initialStep = 0 }: { onDone: (a: QuickSetupAnswers) => void; demo?: boolean; initialStep?: number }) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), STEPS))
  const [goal, setGoal] = useState<Goal | null>(null)
  const [people, setPeople] = useState<Person[]>([
    { name: '', role: 'adult', likes: [], dislikes: [], allergies: [], phone: '' },
    { name: '', role: 'adult', likes: [], dislikes: [], allergies: [], phone: '' },
  ])
  const [who, setWho] = useState(0)
  const [styles, setStyles] = useState<string[]>([])
  // A style picked on a landing page before sign-up (lib/picked-style) starts out selected.
  // Which screen each family reaches, so we can see where the first visit loses people (Nov 21 2026).
  useEffect(() => { if (!demo) trackOnce('walkthrough_step', { id: String(ORDER[step]), pos: step }) }, [demo, step])
  useEffect(() => { if (demo) return; const k = takePickedStyle(); if (k) setStyles((xs) => (xs.length ? xs : [k])) }, [demo])
  const [diets, setDiets] = useState<string[]>([])
  const [mix, setMix] = useState<Partial<Record<MixKey, number>> | null>(null)
  const [every, setEvery] = useState<Partial<Record<MixKey, 1 | 2 | 4>>>({})
  const [nights, setNights] = useState<Weekday[]>(['mon', 'tue', 'wed', 'thu', 'fri'])
  const [busy, setBusy] = useState(30)
  const [sunday, setSunday] = useState(false)
  const [sundayTimes, setSundayTimes] = useState<number[]>([120])
  const [extraMonday, setExtraMonday] = useState(true)
  const [sundayIdeas, setSundayIdeas] = useState(3)
  // Budget choices follow the table size and nights (screen 2 and 6 come first): a family of 5 never sees $75.
  const [pickedBudget, setPickedBudget] = useState<string | null>(null)
  const [storeBrands, setStoreBrands] = useState(false)
  const [voteDay, setVoteDay] = useState<Weekday>('sat')
  const [shopHow, setShopHow] = useState<ShopHow>('online')
  const [shopDay, setShopDay] = useState<ShopDay>('sun')
  // True once the family answered the shop screen (tapped a choice or pressed Next there). Only then is it saved.
  const [shopAnswered, setShopAnswered] = useState(false)
  const [saving, setSaving] = useState(false)
  const screen = ORDER[Math.min(Math.max(step, 0), STEPS)]

  const named = people.map((p, i) => ({ ...p, i })).filter((p) => p.name.trim())
  const familySize = Math.max(people.length, 1)
  const dinners = nights.length + (sunday ? 1 : 0)
  const budgets = budgetOptions(familySize, Math.max(dinners, 1))
  const budget = pickedBudget && budgets.includes(pickedBudget) ? pickedBudget : defaultBudget(familySize, Math.max(dinners, 1))
  const setBudget = (b: string) => setPickedBudget(b)
  const perDinner = Math.round((Number(budget.replace(/[^0-9.]/g, '')) || 0) / Math.max(dinners, 1))
  const mixTotal = mix ? Object.values(mix).reduce((s, n) => s + (Number(n) || 0), 0) : 0
  const styleNames = FOOD_STYLES.filter((s) => styles.includes(s.key)).map((s) => `${s.emoji} ${s.name}`)

  const setPerson = (i: number, p: Partial<Person>) => setPeople((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)))
  // Each screen starts at its top (a long screen used to leave the next one scrolled halfway down).
  const topRef = useRef<HTMLDivElement>(null)
  const toTop = () => setTimeout(() => topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0)
  const next = () => { if (screen === SHOP_SCREEN) setShopAnswered(true); setStep((s) => Math.min(s + 1, STEPS)); toTop() }
  const back = () => { setStep((s) => Math.max(s - 1, 0)); toTop() }
  const [allergyOpen, setAllergyOpen] = useState(false)

  // Keep answers on this phone as she goes, so an interruption (or Facebook's browser reloading) doesn't wipe
  // them; cleared when setup is saved (Nov 21 2026 review).
  const restored = useRef(false)
  useEffect(() => {
    if (demo || restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as Record<string, unknown>
      if (!d || Date.now() - Number(d.at || 0) > 14 * 86400000) return
      if (typeof d.step === 'number' && d.v === DRAFT_VERSION) setStep(Math.min(Math.max(d.step, 0), STEPS))
      if (d.shopAnswered === true) setShopAnswered(true)
      if (d.goal !== undefined) setGoal(d.goal as Goal | null)
      if (Array.isArray(d.people) && d.people.length) setPeople(d.people as Person[])
      if (Array.isArray(d.styles)) setStyles(d.styles as string[])
      if (Array.isArray(d.diets)) setDiets(d.diets as string[])
      if (d.mix !== undefined) setMix(d.mix as Partial<Record<MixKey, number>> | null)
      if (d.every && typeof d.every === 'object') setEvery(d.every as Partial<Record<MixKey, 1 | 2 | 4>>)
      if (Array.isArray(d.nights) && d.nights.length) setNights(d.nights as Weekday[])
      if (typeof d.busy === 'number') setBusy(d.busy)
      if (typeof d.sunday === 'boolean') setSunday(d.sunday)
      if (Array.isArray(d.sundayTimes) && d.sundayTimes.length) setSundayTimes(d.sundayTimes as number[])
      if (typeof d.extraMonday === 'boolean') setExtraMonday(d.extraMonday)
      if (typeof d.sundayIdeas === 'number') setSundayIdeas(d.sundayIdeas)
      if (typeof d.pickedBudget === 'string') setPickedBudget(d.pickedBudget)
      if (typeof d.storeBrands === 'boolean') setStoreBrands(d.storeBrands)
      if (typeof d.voteDay === 'string') setVoteDay(d.voteDay as Weekday)
      if (d.shopHow === 'online' || d.shopHow === 'store') setShopHow(d.shopHow)
      if (typeof d.shopDay === 'string' && (d.shopDay === 'varies' || (SHOP_DAYS as string[]).includes(d.shopDay))) setShopDay(d.shopDay as ShopDay)
    } catch { /* storage blocked or bad data: start fresh */ }
  }, [demo])
  useEffect(() => {
    if (demo || !restored.current) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: DRAFT_VERSION, at: Date.now(), step, goal, people, styles, diets, mix, every, nights, busy, sunday, sundayTimes, extraMonday, sundayIdeas, pickedBudget, storeBrands, voteDay, shopHow, shopDay, shopAnswered }))
    } catch { /* ignore */ }
  }, [demo, step, goal, people, styles, diets, mix, every, nights, busy, sunday, sundayTimes, extraMonday, sundayIdeas, pickedBudget, storeBrands, voteDay, shopHow, shopDay, shopAnswered])

  async function save() {
    setSaving(true)
    clearPickedStyle()
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    const answers: QuickSetupAnswers = { familySize, weeklyBudget: budget, dietaryNeeds: diets, style: styles[0] ?? null, goal, phone: people[0]?.phone || undefined }
    if (!demo) {
      try {
        await fetch('/api/onboarding/walkthrough', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal, familySize, weeklyBudget: budget, dietaryNeeds: diets, styles,
            people: people.map((p) => ({ ...p, name: p.name.trim() })),
            mix, mixEvery: every, cookDays: nights, busyMinutes: busy,
            sunday: { on: sunday, times: sundayTimes, options: sundayIdeas, extraForMonday: extraMonday },
            storeBrands, voteDay,
            // Only if they answered the shop screen: a family who skipped past it never told us.
            ...(shopAnswered ? { shop: { how: shopHow, day: shopDay } } : {}),
          }),
        })
      } catch {
        // Never block the first plan on a profile write; defaults still work.
      }
      trackOnce('quick_setup_done', { walkthrough: true, step: screen, pos: step, shopAnswered })
    }
    onDone(answers)
  }

  // Pinned to the bottom of the screen so Next is always reachable on long screens; the way out is a real button.
  const nextBtn = (label = 'Next →') => (
    <div className="sticky bottom-0 z-10 -mx-5 sm:-mx-7 mt-6 px-5 sm:px-7 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#f3f7f4]/95 backdrop-blur border-t border-primary/10 flex flex-col sm:flex-row sm:items-center gap-2">
      <button type="button" onClick={next} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm">{label}</button>
      <button type="button" onClick={save} disabled={saving} className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-primary/30 bg-white text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-40">{saving ? 'Building your week…' : 'Show me my dinners now'}</button>
    </div>
  )
  const head = (title: string, sub: string) => (
    <>
      <h2 className="text-2xl font-heading font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </>
  )

  return (
    <div ref={topRef} className="mb-8 p-5 sm:p-7 rounded-2xl border border-primary/20 bg-primary/5 scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={back} disabled={step === 0} aria-label="Back" className="w-11 h-11 -ml-3 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-0"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-1.5" aria-label={`Step ${Math.min(step + 1, STEPS)} of ${STEPS}`}>
          {Array.from({ length: STEPS }).map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary w-5' : 'bg-primary/20 w-2.5'}`} />)}
        </div>
        <span className="text-xs text-muted-foreground w-12 text-right">{step < STEPS ? `${step + 1} of ${STEPS}` : 'Done'}</span>
      </div>

      {screen === 0 && (
        <div>
          {head('What would make dinner easier?', 'Pick the one that sounds most like your house.')}
          <div className="grid gap-2 mt-5">
            {GOALS.map((g) => (
              <button key={g.key} type="button" aria-pressed={goal === g.key} onClick={() => { setGoal(g.key); setTimeout(next, 180) }}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-colors ${goal === g.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-gray-200 hover:border-primary/60'}`}>
                <span className="font-semibold">{goal === g.key ? '✓ ' : ''}{g.emoji} {g.label}</span>
                <span className={`block text-xs mt-0.5 ${goal === g.key ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{g.blurb}</span>
              </button>
            ))}
          </div>
          {nextBtn()}
        </div>
      )}

      {screen === 1 && (
        <div>
          {head('Who’s at the table?', 'Portions and the grocery list are sized to your table. Names let everyone vote by text and keep their own no-list.')}
          <div className="mt-5 space-y-2">
            {people.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 bg-white border rounded-xl px-3 py-2">
                <input value={p.name} onChange={(e) => setPerson(i, { name: e.target.value.slice(0, 40) })} placeholder={i === 0 ? 'Your first name' : `Person ${i + 1} (optional)`}
                  className="flex-1 min-w-[8rem] px-2.5 py-2.5 text-base rounded-md border border-input bg-background" />
                <Pick on={p.role === 'adult'} onClick={() => setPerson(i, { role: 'adult' })}>Adult</Pick>
                <Pick on={p.role === 'kid'} onClick={() => setPerson(i, { role: 'kid' })}>Kid</Pick>
                {i > 0 && <button type="button" aria-label="Remove" onClick={() => setPeople((xs) => xs.filter((_, j) => j !== i))} className="w-11 h-11 -mr-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 text-xl">×</button>}
              </div>
            ))}
          </div>
          {people.length < 10 && <button type="button" onClick={() => setPeople((xs) => [...xs, { name: '', role: 'kid', likes: [], dislikes: [], allergies: [], phone: '' }])} className="mt-2 text-sm font-semibold text-primary">+ Add someone</button>}
          <p className="text-xs mt-2 text-primary font-medium">✓ {familySize} {familySize === 1 ? 'person' : 'people'} at dinner</p>
          {/* Nov 9 2026: the number was only asked on screen 8, and 7 in 10 never gave one. Ask here, for the parent's own benefit. */}
          <div className="mt-5 bg-primary/5 border border-primary/20 rounded-xl px-3 py-3">
            <label htmlFor="wt-phone" className="block text-sm font-semibold text-foreground">📱 Text me my week and grocery list <span className="font-normal text-muted-foreground">(optional)</span></label>
            <p className="text-xs text-muted-foreground mt-0.5">Swap a dinner or add milk to the list just by texting back. No app to open.</p>
            <input id="wt-phone" value={people[0]?.phone ?? ''} onChange={(e) => setPerson(0, { phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="(555) 555-1234"
              className="mt-2 w-full sm:w-64 px-2 py-1.5 text-base rounded-md border border-input bg-background" />
            <p className="text-[11px] text-muted-foreground mt-1.5">Msg & data rates may apply. Reply STOP anytime.</p>
          </div>
          {nextBtn()}
        </div>
      )}

      {screen === 2 && (
        <div>
          {head('Your style', 'Pick up to 3. Your first pick counts most.')}
          <div className="flex flex-wrap gap-2 mt-5">
            {FOOD_STYLES.map((s) => {
              const rank = styles.indexOf(s.key)
              const full = rank < 0 && styles.length >= 3
              return <Pick key={s.key} on={rank >= 0} onClick={() => { if (!full) setStyles((xs) => toggle(xs, s.key)) }}>{rank >= 0 ? `${rank + 1} · ` : ''}{s.emoji} {s.name}</Pick>
            })}
          </div>
          {styleNames.length ? <p className="text-xs mt-2 text-primary font-medium">✓ In order: {styles.map((k) => { const st = FOOD_STYLES.find((x) => x.key === k); return st ? `${st.emoji} ${st.name}` : k }).join(' → ')}{styles.length >= 3 ? ' (that’s 3: tap one to swap it out)' : ''}</p> : <p className="text-xs mt-2 text-muted-foreground">Skip it and you’ll get family favorites.</p>}
          <Label>Any diet for the whole table? <span className="font-normal text-muted-foreground">(skip if not)</span></Label>
          <div className="flex flex-wrap gap-2">{DIETS.map((d) => <Pick key={d} on={diets.includes(d)} onClick={() => setDiets((xs) => toggle(xs, d))}>{d}</Pick>)}</div>
          {nextBtn()}
        </div>
      )}

      {screen === 3 && (
        <div>
          {head('Likes and no-thanks', 'Tap for each person. This keeps dinners they won’t eat off the plan.')}
          {(() => {
            const list = named.length ? named : [{ ...people[0], i: 0, name: 'Everyone' }]
            const cur = list.find((p) => p.i === who) ?? list[0]
            const p = people[cur.i]
            return (
              <>
                {list.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {list.map((x) => <button key={x.i} type="button" onClick={() => setWho(x.i)} className={`px-3 py-1 rounded-full text-xs ${x.i === cur.i ? 'bg-gray-900 text-white' : 'bg-white border text-gray-600'}`}>{x.name}</button>)}
                  </div>
                )}
                <Label>{cur.name} loves</Label>
                <div className="flex flex-wrap gap-2">{LIKES.map((x) => <Pick key={x} on={p.likes.includes(x)} onClick={() => setPerson(cur.i, { likes: toggle(p.likes, x), dislikes: p.dislikes.filter((y) => y !== x) })}>{x}</Pick>)}</div>
                <Label>{cur.name} won’t eat</Label>
                <div className="flex flex-wrap gap-2">{DISLIKES.map((x) => <Pick key={x} on={p.dislikes.includes(x)} onClick={() => setPerson(cur.i, { dislikes: toggle(p.dislikes, x), likes: p.likes.filter((y) => y !== x) })}>{x}</Pick>)}</div>
                <Label>Any allergies?</Label>
                {allergyOpen || p.allergies.length ? (
                  <div className="flex flex-wrap gap-2">{ALLERGIES.map((x) => <Pick key={x} on={p.allergies.includes(x)} onClick={() => setPerson(cur.i, { allergies: toggle(p.allergies, x) })}>{x}</Pick>)}</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Pick on onClick={() => undefined}>No</Pick>
                    <Pick on={false} onClick={() => setAllergyOpen(true)}>Yes</Pick>
                  </div>
                )}
              </>
            )
          })()}
          {nextBtn()}
        </div>
      )}

      {screen === 4 && (
        <div>
          {head('Your weekly mix', 'How many dinners of each kind, and how often. Or leave it to us.')}
          <div className="flex flex-wrap gap-2 mt-5">
            <Pick on={!mix} onClick={() => setMix(null)}>Any mix</Pick>
            <Pick on={!!mix} onClick={() => setMix((m) => m ?? { chicken: 2, beef: 1, pork: 1, fish: 1 })}>Set my mix</Pick>
          </div>
          {mix && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {MIX_GROUPS.map((g) => {
                  const n = Number(mix[g.key]) || 0
                  const set = (v: number) => setMix((m) => ({ ...(m ?? {}), [g.key]: Math.max(0, Math.min(7, v)) }))
                  return (
                    <div key={g.key} className={`rounded-xl border-2 px-3 py-2 ${n ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${n ? 'font-semibold text-foreground' : 'text-gray-500'}`}>{g.label}</span>
                        <span className="flex items-center gap-1.5">
                          <button type="button" aria-label={`Fewer ${g.label}`} onClick={() => set(n - 1)} disabled={!n} className="w-9 h-9 rounded-full border border-border disabled:opacity-30">−</button>
                          <span className="w-4 text-center text-sm font-semibold tabular-nums">{n}</span>
                          <button type="button" aria-label={`More ${g.label}`} onClick={() => set(n + 1)} className="w-9 h-9 rounded-full border border-border">+</button>
                        </span>
                      </div>
                      {n > 0 && (
                        <select aria-label={`How often ${g.label}`} value={every[g.key] ?? 1} onChange={(e) => setEvery((x) => ({ ...x, [g.key]: Number(e.target.value) as 1 | 2 | 4 }))} className="mt-1.5 w-full text-base rounded-md border border-border bg-white px-2 py-2">
                          {MIX_EVERY.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className={`text-xs mt-2 font-medium ${mixTotal === nights.length ? 'text-primary' : 'text-amber-700'}`}>
                {mixTotal === nights.length ? `✓ ${mixTotal} of ${nights.length} weeknight dinners set` : `${mixTotal} set for ${nights.length} weeknight dinners: we’ll keep these proportions.`}
              </p>
            </>
          )}
          {nextBtn()}
        </div>
      )}

      {screen === 5 && (
        <div>
          {head('Your week', 'Which nights you cook, how long you have, and Sunday dinner.')}
          <Label>Nights you cook</Label>
          <div className="flex flex-wrap gap-2">{NIGHTS.map((d) => <Pick key={d} on={nights.includes(d)} onClick={() => setNights((xs) => (xs.includes(d) ? (xs.length > 1 ? xs.filter((x) => x !== d) : xs) : NIGHTS.filter((n) => [...xs, d].includes(n))))}>{WEEKDAY_LABEL[d].slice(0, 3)}</Pick>)}</div>
          <Label>Time on a busy night</Label>
          <div className="flex flex-wrap gap-2">{BUSY.map((m) => <Pick key={m} on={busy === m} onClick={() => setBusy(m)}>{m === 60 ? '1 hour' : `${m} min`}</Pick>)}</div>
          <div className={`mt-5 rounded-2xl border-2 p-4 ${sunday ? 'border-[#e8a838] bg-[#fef6e6]' : 'border-gray-200 bg-white'}`}>
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <span>
                <span className="block text-sm font-bold text-foreground">🍗 Sunday family dinner</span>
                <span className="block text-xs text-muted-foreground mt-0.5">One bigger sit-down dinner: roasts, lasagna, pot roast, real sides. Sunday ideas are texted as their own group, and the top-voted one goes on Sunday.</span>
              </span>
              <input type="checkbox" checked={sunday} onChange={(e) => setSunday(e.target.checked)} className="mt-1 h-5 w-5 accent-[#1a5c38]" />
            </label>
            {sunday && (
              <>
                <Label>How much time on Sunday? <span className="font-normal text-muted-foreground">Pick more than one for a mix.</span></Label>
                <div className="flex flex-wrap gap-2">{SUNDAY.map((o) => <Pick key={o.m} on={sundayTimes.includes(o.m)} onClick={() => setSundayTimes((xs) => (xs.includes(o.m) ? (xs.length > 1 ? xs.filter((x) => x !== o.m) : xs) : [...xs, o.m]))}>{o.l}</Pick>)}</div>
                <Label>How many Sunday ideas to send the family?</Label>
                <div className="flex flex-wrap gap-2">{[2, 3, 4, 5].map((n) => <Pick key={n} on={sundayIdeas === n} onClick={() => setSundayIdeas(n)}>{n}</Pick>)}</div>
                <div className="mt-3"><Pick on={extraMonday} onClick={() => setExtraMonday((v) => !v)}>Make extra for Monday leftovers</Pick></div>
              </>
            )}
          </div>
          {nextBtn()}
        </div>
      )}

      {screen === 6 && (
        <div>
          {head('Budget', 'Every week is built to fit it.')}
          <Label>What is your weekly food budget?</Label>
          <div className="flex flex-wrap gap-2">{budgets.map((b) => <Pick key={b} on={budget === b} onClick={() => setBudget(b)}>{b}</Pick>)}</div>
          <p className="text-xs text-muted-foreground mt-2">About ${perDinner}{budget.endsWith('+') ? '+' : ''} per dinner for {familySize} {familySize === 1 ? 'person' : 'people'}. Choices start at what {dinners} dinner{dinners === 1 ? '' : 's'} for {familySize} really cost{dinners === 1 ? 's' : ''} through Instacart.</p>
          <Label>Prefer store brands when they match?</Label>
          <div className="flex flex-wrap gap-2">
            <Pick on={storeBrands} onClick={() => setStoreBrands(true)}>Yes</Pick>
            <Pick on={!storeBrands} onClick={() => setStoreBrands(false)}>No preference</Pick>
          </div>
          {nextBtn()}
        </div>
      )}

      {screen === SHOP_SCREEN && (
        <div>
          {/* First screen since Nov 25 2026, so it carries the "what you're setting up" photos the goal screen had. */}
          <div className="mb-5">
            <div className="grid grid-cols-3 gap-2">
              {PREVIEW.map((d) => (
                <div key={d.name} className="overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.img} alt={d.name} loading="eager" className="block w-full aspect-[4/3] object-cover" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Your week will look like this: 5 dinners and one grocery list, ready to send to your store. A few quick taps so it fits your family.</p>
          </div>
          {head('How do you shop?', 'So your list reaches you the right way, on the right day.')}
          <div role="radiogroup" aria-label="How you get groceries" className="grid gap-2 mt-5">
            {SHOP_HOW.map((o) => (
              <button key={o.key} type="button" role="radio" aria-checked={shopHow === o.key} onClick={() => { setShopHow(o.key); setShopAnswered(true) }}
                className={`w-full min-h-[44px] text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-colors touch-manipulation ${shopHow === o.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-gray-200 hover:border-primary/60'}`}>
                <span className="font-semibold">{shopHow === o.key ? '✓ ' : ''}{o.label}</span>
                <span className={`block text-xs mt-0.5 ${shopHow === o.key ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{o.blurb}</span>
              </button>
            ))}
          </div>
          <Label>Usually on</Label>
          <div role="group" aria-label="Day you usually shop" className="flex flex-wrap gap-2">
            {SHOP_DAYS.map((d) => <Pick key={d} on={shopDay === d} onClick={() => { setShopDay(d); setShopAnswered(true) }}>{WEEKDAY_LABEL[d].slice(0, 3)}</Pick>)}
            <Pick on={shopDay === 'varies'} onClick={() => { setShopDay('varies'); setShopAnswered(true) }}>It varies</Pick>
          </div>
          <p className="text-xs mt-2 text-primary font-medium">
            {shopDay === 'varies'
              ? '✓ No set day. Your list is on your phone whenever you need it.'
              : `✓ ${WEEKDAY_LABEL[shopDay]} morning, if your list hasn’t gone out yet, we send it${shopHow === 'store' ? ' for the store' : ' with a one-tap cart link'}.`}
          </p>
          {nextBtn()}
        </div>
      )}

      {screen === 8 && (
        <div>
          {head('Let the family vote', 'Everyone gets the dinner ideas by text, replies with numbers, and anyone can text ADD milk to put it on the list. All optional. After setup you can also send them a link to join themselves.')}
          <div className="mt-5 space-y-2">
            {people.map((p, i) => (p.name.trim() || i === 0) && (
              <div key={i} className="flex items-center gap-3 bg-white border rounded-xl px-3 py-2">
                <span className="text-sm font-semibold w-24 truncate">{p.name.trim() || 'You'}</span>
                <input value={p.phone} onChange={(e) => setPerson(i, { phone: e.target.value })} inputMode="tel" autoComplete={i === 0 ? 'tel' : 'off'} placeholder="(555) 555-1234" className="flex-1 min-w-0 px-2 py-1.5 text-base rounded-md border border-input bg-background" />
              </div>
            ))}
          </div>
          <Label>Vote day</Label>
          <div className="flex flex-wrap gap-2">{VOTE_DAYS.map((d) => <Pick key={d} on={voteDay === d} onClick={() => setVoteDay(d)}>{WEEKDAY_LABEL[d]}</Pick>)}</div>
          <p className="text-[11px] text-muted-foreground mt-3">Each family member gets one text asking to join. Msg & data rates may apply. Reply STOP anytime.</p>
          {nextBtn('Almost done →')}
        </div>
      )}

      {screen === STEPS && (
        <div>
          <div className="text-3xl">🎉</div>
          {head('Here’s what we’ll plan around', shopHow === 'store'
            ? 'Next: pick your dinners, then we text or email you the list for the store. Change any of this in Settings.'
            : 'Next: pick your dinners, then one tap sends the list to Instacart or Walmart. Change any of this in Settings.')}
          <ul className="mt-4 space-y-1.5 text-sm">
            {[
              `${familySize} at dinner${named.length ? ` · ${named.map((p) => p.name.trim()).join(', ')}` : ''}`,
              styleNames.length ? styleNames.join(' · ') : 'A mix of family-friendly dinners',
              diets.length ? `Diet: ${diets.join(', ')}` : '',
              mix ? MIX_GROUPS.filter((g) => Number(mix[g.key]) > 0).map((g) => `${g.label} ${mix[g.key]}${(every[g.key] ?? 1) > 1 ? ` (${MIX_EVERY.find((o) => o.v === every[g.key])?.label.toLowerCase()})` : ''}`).join(' · ') : 'Any mix of proteins',
              `${nights.map((d) => WEEKDAY_LABEL[d].slice(0, 3)).join(', ')} · ${busy} min a night${sunday ? ` · Sunday dinner, ${SUNDAY.filter((o) => sundayTimes.includes(o.m)).map((o) => o.l.toLowerCase()).join(' / ')}${extraMonday ? ' + Monday leftovers' : ''}` : ''}`,
              `${budget} a week${storeBrands ? ' · store brands' : ''}`,
              `${shopHow === 'store' ? 'Shopping in the store' : 'Ordering online'}${shopDay === 'varies' ? '' : `, usually ${WEEKDAY_LABEL[shopDay]}`}`,
              people.some((p) => p.phone.replace(/\D/g, '').length >= 10) ? `Family votes by text on ${WEEKDAY_LABEL[voteDay]}s` : 'Texting: add numbers anytime in Settings',
            ].filter(Boolean).map((x) => <li key={x} className="bg-white border rounded-lg px-3 py-2">✓ {x}</li>)}
          </ul>
          <button type="button" onClick={save} disabled={saving} className="mt-6 w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60">
            {saving ? 'Building your week…' : 'Show my dinners →'}
          </button>
        </div>
      )}
    </div>
  )
}
