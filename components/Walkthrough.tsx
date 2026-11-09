'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { trackOnce } from '@/lib/activation'
import { FOOD_STYLES } from '@/lib/styles'
import { takePickedStyle, clearPickedStyle } from '@/lib/picked-style'
import { GOALS, type Goal } from '@/lib/onboarding'
import { MIX_GROUPS, MIX_EVERY, type MixKey } from '@/lib/protein-mix'
import { WEEKDAY_LABEL, type Weekday } from '@/lib/settings'
import type { QuickSetupAnswers } from '@/components/QuickSetup'

/**
 * First-time walkthrough (Sarah, Nov 7 2026): eight short screens after sign-up so a new family's first week fits
 * them and they find the settings that make DinnerDrop theirs. Replaces the 4-step QuickSetup (kept for rollback).
 *   1 goal · 2 who's at the table · 3 styles + diets · 4 likes / no-thanks per person · 5 weekly mix + how often
 *   6 cook nights + Sunday family dinner · 7 budget + store brands · 8 family texting · then a summary.
 * Every screen has "Skip the rest · plan my week now", which saves what's set so far. One POST to
 * /api/onboarding/walkthrough. `demo` renders without saving (/preview/onboarding).
 */

type Role = 'adult' | 'kid'
interface Person { name: string; role: Role; likes: string[]; dislikes: string[]; allergies: string[]; phone: string }

const STEPS = 8
const BUDGETS = ['$75', '$100', '$150', '$200', '$250+']
const DIETS = ['Gluten-free', 'Dairy-free', 'Nut-free', 'Vegetarian', 'Pescatarian', 'Halal']
const LIKES = ['Pasta', 'Tacos', 'Pizza', 'Chicken', 'Burgers', 'Steak', 'Soup', 'Rice bowls', 'Mac and cheese', 'Stir-fry', 'Potatoes', 'Broccoli']
const DISLIKES = ['Mushrooms', 'Onions', 'Beans', 'Seafood', 'Spicy food', 'Olives', 'Cilantro', 'Tomatoes', 'Bell peppers', 'Avocado', 'Eggplant', 'Anything mixed together']
const ALLERGIES = ['Peanuts', 'Tree nuts', 'Dairy', 'Eggs', 'Gluten', 'Soy', 'Shellfish', 'Fish', 'Sesame']
const NIGHTS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const BUSY = [20, 30, 45, 60]
const SUNDAY = [{ m: 60, l: '1 hour' }, { m: 120, l: '2 hours' }, { m: 240, l: 'All afternoon' }]
const VOTE_DAYS: Weekday[] = ['fri', 'sat', 'sun']

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-sm transition-colors ${on ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/60 hover:text-foreground'}`}>
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
  const [budget, setBudget] = useState('$150')
  const [storeBrands, setStoreBrands] = useState(false)
  const [voteDay, setVoteDay] = useState<Weekday>('sat')
  const [saving, setSaving] = useState(false)

  const named = people.map((p, i) => ({ ...p, i })).filter((p) => p.name.trim())
  const familySize = Math.max(people.length, 1)
  const dinners = nights.length + (sunday ? 1 : 0)
  const perDinner = Math.round((Number(budget.replace(/[^0-9.]/g, '')) || 0) / Math.max(dinners, 1))
  const mixTotal = mix ? Object.values(mix).reduce((s, n) => s + (Number(n) || 0), 0) : 0
  const styleNames = FOOD_STYLES.filter((s) => styles.includes(s.key)).map((s) => `${s.emoji} ${s.name}`)

  const setPerson = (i: number, p: Partial<Person>) => setPeople((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const next = () => setStep((s) => Math.min(s + 1, STEPS))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  async function save() {
    setSaving(true)
    clearPickedStyle()
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
          }),
        })
      } catch {
        // Never block the first plan on a profile write; defaults still work.
      }
      trackOnce('quick_setup_done', { walkthrough: true, step })
    }
    onDone(answers)
  }

  const nextBtn = (label = 'Next →') => (
    <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <button type="button" onClick={next} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm">{label}</button>
      <button type="button" onClick={save} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-40">Skip the rest · plan my week now</button>
    </div>
  )
  const head = (title: string, sub: string) => (
    <>
      <h2 className="text-2xl font-heading font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </>
  )

  return (
    <div className="mb-8 p-5 sm:p-7 rounded-2xl border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={back} disabled={step === 0} aria-label="Back" className="p-1.5 -ml-1.5 rounded-full text-muted-foreground hover:bg-muted disabled:opacity-0"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex items-center gap-1.5" aria-label={`Step ${Math.min(step + 1, STEPS)} of ${STEPS}`}>
          {Array.from({ length: STEPS }).map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary w-5' : 'bg-muted w-2.5'}`} />)}
        </div>
        <span className="text-xs text-muted-foreground w-12 text-right">{step < STEPS ? `${step + 1} of ${STEPS}` : 'Done'}</span>
      </div>

      {step === 0 && (
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

      {step === 1 && (
        <div>
          {head('Who’s at the table?', 'Portions and the grocery list are sized to your table. Names let everyone vote by text and keep their own no-list.')}
          <div className="mt-5 space-y-2">
            {people.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 bg-white border rounded-xl px-3 py-2">
                <input value={p.name} onChange={(e) => setPerson(i, { name: e.target.value.slice(0, 40) })} placeholder={i === 0 ? 'Your first name' : `Person ${i + 1} (optional)`}
                  className="flex-1 min-w-[8rem] px-2 py-1.5 text-sm rounded-md border border-input bg-background" />
                <Pick on={p.role === 'adult'} onClick={() => setPerson(i, { role: 'adult' })}>Adult</Pick>
                <Pick on={p.role === 'kid'} onClick={() => setPerson(i, { role: 'kid' })}>Kid</Pick>
                {i > 0 && <button type="button" aria-label="Remove" onClick={() => setPeople((xs) => xs.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-700 text-lg px-1">×</button>}
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

      {step === 2 && (
        <div>
          {head('Your style', 'Pick up to 3 that matter most, most important first. Health needs like Diabetic-friendly always come first. You can change these anytime in Settings.')}
          <div className="flex flex-wrap gap-2 mt-5">
            {FOOD_STYLES.map((s) => {
              const rank = styles.indexOf(s.key)
              const full = rank < 0 && styles.length >= 3
              return <Pick key={s.key} on={rank >= 0} onClick={() => { if (!full) setStyles((xs) => toggle(xs, s.key)) }}>{rank >= 0 ? `${rank + 1} · ` : ''}{s.emoji} {s.name}</Pick>
            })}
          </div>
          {styleNames.length ? <p className="text-xs mt-2 text-primary font-medium">✓ In order: {styles.map((k) => { const st = FOOD_STYLES.find((x) => x.key === k); return st ? `${st.emoji} ${st.name}` : k }).join(' → ')}{styles.length >= 3 ? ' (that’s 3: tap one to swap it out)' : ''}</p> : <p className="text-xs mt-2 text-amber-700">Nothing picked yet: you’ll get a mix of family-friendly dinners.</p>}
          <Label>Any diet for the whole table? <span className="font-normal text-muted-foreground">(skip if not)</span></Label>
          <div className="flex flex-wrap gap-2">{DIETS.map((d) => <Pick key={d} on={diets.includes(d)} onClick={() => setDiets((xs) => toggle(xs, d))}>{d}</Pick>)}</div>
          {nextBtn()}
        </div>
      )}

      {step === 3 && (
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
                <Label>Allergies</Label>
                <div className="flex flex-wrap gap-2">{ALLERGIES.map((x) => <Pick key={x} on={p.allergies.includes(x)} onClick={() => setPerson(cur.i, { allergies: toggle(p.allergies, x) })}>{x}</Pick>)}</div>
              </>
            )
          })()}
          {nextBtn()}
        </div>
      )}

      {step === 4 && (
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
                          <button type="button" aria-label={`Fewer ${g.label}`} onClick={() => set(n - 1)} disabled={!n} className="w-7 h-7 rounded-full border border-border disabled:opacity-30">−</button>
                          <span className="w-4 text-center text-sm font-semibold tabular-nums">{n}</span>
                          <button type="button" aria-label={`More ${g.label}`} onClick={() => set(n + 1)} className="w-7 h-7 rounded-full border border-border">+</button>
                        </span>
                      </div>
                      {n > 0 && (
                        <select aria-label={`How often ${g.label}`} value={every[g.key] ?? 1} onChange={(e) => setEvery((x) => ({ ...x, [g.key]: Number(e.target.value) as 1 | 2 | 4 }))} className="mt-1.5 w-full text-xs rounded-md border border-border bg-white px-2 py-1">
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

      {step === 5 && (
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

      {step === 6 && (
        <div>
          {head('Budget', 'Every week is built to fit it.')}
          <Label>{`What do you want to spend on ${nights.length} weeknight dinners${sunday ? ' + Sunday dinner' : ''}?`}</Label>
          <div className="flex flex-wrap gap-2">{BUDGETS.map((b) => <Pick key={b} on={budget === b} onClick={() => setBudget(b)}>{b}</Pick>)}</div>
          <p className="text-xs text-muted-foreground mt-2">About ${perDinner}{budget.endsWith('+') ? '+' : ''} per dinner for {familySize} {familySize === 1 ? 'person' : 'people'}.</p>
          <Label>Prefer store brands when they match?</Label>
          <div className="flex flex-wrap gap-2">
            <Pick on={storeBrands} onClick={() => setStoreBrands(true)}>Yes</Pick>
            <Pick on={!storeBrands} onClick={() => setStoreBrands(false)}>No preference</Pick>
          </div>
          {nextBtn()}
        </div>
      )}

      {step === 7 && (
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

      {step === STEPS && (
        <div>
          <div className="text-3xl">🎉</div>
          {head('Here’s what we’ll plan around', 'Change any of it in Settings. Each section shows what’s set.')}
          <ul className="mt-4 space-y-1.5 text-sm">
            {[
              `${familySize} at dinner${named.length ? ` · ${named.map((p) => p.name.trim()).join(', ')}` : ''}`,
              styleNames.length ? styleNames.join(' · ') : 'A mix of family-friendly dinners',
              diets.length ? `Diet: ${diets.join(', ')}` : '',
              mix ? MIX_GROUPS.filter((g) => Number(mix[g.key]) > 0).map((g) => `${g.label} ${mix[g.key]}${(every[g.key] ?? 1) > 1 ? ` (${MIX_EVERY.find((o) => o.v === every[g.key])?.label.toLowerCase()})` : ''}`).join(' · ') : 'Any mix of proteins',
              `${nights.map((d) => WEEKDAY_LABEL[d].slice(0, 3)).join(', ')} · ${busy} min a night${sunday ? ` · Sunday dinner, ${SUNDAY.filter((o) => sundayTimes.includes(o.m)).map((o) => o.l.toLowerCase()).join(' / ')}${extraMonday ? ' + Monday leftovers' : ''}` : ''}`,
              `${budget} a week${storeBrands ? ' · store brands' : ''}`,
              people.some((p) => p.phone.replace(/\D/g, '').length >= 10) ? `Family votes by text on ${WEEKDAY_LABEL[voteDay]}s` : 'No texting for now',
            ].filter(Boolean).map((x) => <li key={x} className="bg-white border rounded-lg px-3 py-2">✓ {x}</li>)}
          </ul>
          <button type="button" onClick={save} disabled={saving} className="mt-6 w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60">
            {saving ? 'Building your week…' : 'Build my week →'}
          </button>
        </div>
      )}
    </div>
  )
}
