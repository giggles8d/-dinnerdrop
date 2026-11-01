'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { trackOnce } from '@/lib/activation'
import { FOOD_STYLES } from '@/lib/styles'
import { GOALS, type Goal } from '@/lib/onboarding'

/**
 * A brand-new family's first visit: four tap-first screens before their first week is built.
 *   1  What matters most (goal)       2  Who's eating (size, the picky one)
 *   3  Budget and food (budget, style, avoid)      4  Your cell (texting; optional)
 * Everything is preselected to a typical family, so each screen is one tap. "Skip" from any
 * screen keeps the instant path (defaults). Saved in one POST to /api/onboarding/quick.
 * `demo` renders the screens without saving (the /preview/onboarding page).
 */
const SIZES = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5+', value: 5 },
]
const BUDGETS = ['$75', '$100', '$150', '$200', '$250+']
const AVOID = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Low-carb', 'Keto', 'Paleo', 'Halal']
export const DEFAULT_FAMILY_SIZE = 4
export const DEFAULT_BUDGET = '$150'
const STEPS = 4

export interface QuickSetupAnswers {
  familySize: number
  weeklyBudget: string
  dietaryNeeds: string[]
  style?: string | null
  goal?: Goal | null
  picky?: string
  phone?: string
}

function Chip({ on, onClick, children, big }: { on: boolean; onClick: () => void; children: React.ReactNode; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`${big ? 'w-full text-left px-4 py-3.5 rounded-2xl' : 'min-w-[3.25rem] px-4 py-2.5 rounded-full'} border text-sm font-medium transition-colors ${
        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-input hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  )
}

function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS}`}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary w-6' : 'bg-muted w-3'}`} />
      ))}
    </div>
  )
}

export default function QuickSetup({ onDone, demo = false, initialStep = 0 }: { onDone: (a: QuickSetupAnswers) => void; demo?: boolean; initialStep?: number }) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), STEPS - 1))
  const [goal, setGoal] = useState<Goal | null>(null)
  const [familySize, setFamilySize] = useState(DEFAULT_FAMILY_SIZE)
  const [picky, setPicky] = useState('')
  const [weeklyBudget, setWeeklyBudget] = useState(DEFAULT_BUDGET)
  const [avoid, setAvoid] = useState<string[]>([])
  const [style, setStyle] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [partnerPhone, setPartnerPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const perDinner = Math.round((Number(weeklyBudget.replace(/[^0-9.]/g, '')) || 0) / 5)
  const phoneOk = phone.replace(/\D/g, '').length >= 10

  async function save(skipped: boolean, withPhone: boolean) {
    setSaving(true)
    const answers: QuickSetupAnswers = skipped
      ? { familySize: DEFAULT_FAMILY_SIZE, weeklyBudget: DEFAULT_BUDGET, dietaryNeeds: [] }
      : { familySize, weeklyBudget, dietaryNeeds: avoid, style, goal, picky: picky.trim() || undefined, phone: withPhone && phoneOk ? phone : undefined }
    if (!demo) {
      try {
        await fetch('/api/onboarding/quick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skipped,
            goal: answers.goal ?? null,
            familySize: answers.familySize,
            weeklyBudget: answers.weeklyBudget,
            dietaryNeeds: answers.dietaryNeeds,
            style: skipped ? null : style,
            picky: skipped ? '' : answers.picky ?? '',
            ownerPhone: answers.phone ?? '',
            partnerPhone: withPhone && !skipped ? partnerPhone : '',
          }),
        })
      } catch {
        // Never block the first plan on a profile write; defaults still work.
      }
      trackOnce(skipped ? 'quick_setup_skipped' : 'quick_setup_done')
    }
    onDone(answers)
  }

  const next = () => setStep((s) => Math.min(s + 1, STEPS - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="mb-8 p-5 sm:p-7 rounded-2xl border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={back} disabled={step === 0} aria-label="Back" className="p-1.5 -ml-1.5 rounded-full text-muted-foreground hover:bg-muted disabled:opacity-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Dots step={step} />
        <button type="button" onClick={() => save(true, false)} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-30">
          Skip
        </button>
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">What would make dinner easier?</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Pick the one that sounds most like your house. We build the week around it.</p>
          <div className="grid gap-2 mb-6">
            {GOALS.map((g) => (
              <Chip key={g.key} big on={goal === g.key} onClick={() => { setGoal(g.key); setTimeout(next, 180) }}>
                <span className="text-lg mr-2 align-middle">{g.emoji}</span>
                <span className="font-semibold">{g.label}</span>
                <span className={`block text-xs mt-0.5 ${goal === g.key ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{g.blurb}</span>
              </Chip>
            ))}
          </div>
          <button type="button" onClick={next} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">A bit of everything →</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Who&apos;s eating?</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Portions, cost and the grocery list are sized to your table.</p>
          <p className="text-sm font-semibold text-foreground mb-2">How many people at dinner?</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {SIZES.map((s) => <Chip key={s.label} on={familySize === s.value} onClick={() => setFamilySize(s.value)}>{s.label}</Chip>)}
          </div>
          <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="qs-picky">Anyone picky? <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input
            id="qs-picky"
            value={picky}
            onChange={(e) => setPicky(e.target.value)}
            placeholder="Their first name — we'll keep their no-list"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm mb-6"
            maxLength={40}
          />
          <button type="button" onClick={next} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Budget and food</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Every week is built to fit the number you pick.</p>
          <p className="text-sm font-semibold text-foreground mb-2">What do you want to spend on 5 dinners?</p>
          <div className="flex flex-wrap gap-2 mb-1">
            {BUDGETS.map((b) => <Chip key={b} on={weeklyBudget === b} onClick={() => setWeeklyBudget(b)}>{b}</Chip>)}
          </div>
          <p className="text-xs text-muted-foreground mb-5">About ${perDinner}{weeklyBudget.endsWith('+') ? '+' : ''} per dinner, for the whole table.</p>
          <p className="text-sm font-semibold text-foreground mb-2">What kind of week? <span className="font-normal text-muted-foreground">(optional)</span></p>
          <div className="flex flex-wrap gap-2 mb-5">
            {FOOD_STYLES.map((s) => (
              <Chip key={s.key} on={style === s.key} onClick={() => setStyle(style === s.key ? null : s.key)}>{s.emoji} {s.name}</Chip>
            ))}
          </div>
          <p className="text-sm font-semibold text-foreground mb-2">Anything to avoid? <span className="font-normal text-muted-foreground">(optional)</span></p>
          <div className="flex flex-wrap gap-2 mb-6">
            {AVOID.map((d) => (
              <Chip key={d} on={avoid.includes(d)} onClick={() => setAvoid((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]))}>{d}</Chip>
            ))}
          </div>
          <button type="button" onClick={next} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            Next →
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Want a text when it&apos;s ready?</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            We&apos;ll text you the week&apos;s dinners the moment they&apos;re built, your family can vote by reply, and anyone can text <span className="font-semibold text-foreground">ADD milk</span> to put it on the list.
          </p>
          <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="qs-phone">Your cell</label>
          <input
            id="qs-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 555-1234"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-base mb-3"
          />
          <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="qs-partner">Partner&apos;s cell <span className="font-normal text-muted-foreground">(optional — they get one text asking to join)</span></label>
          <input
            id="qs-partner"
            value={partnerPhone}
            onChange={(e) => setPartnerPhone(e.target.value)}
            inputMode="tel"
            placeholder="(555) 555-5678"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-base mb-4"
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={() => save(false, true)}
              disabled={saving || !phoneOk}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Building your dinners…' : 'Text me and build my week →'}
            </button>
            <button type="button" onClick={() => save(false, false)} disabled={saving} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-30">
              No texts, just build my week
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-4">
            By tapping &ldquo;Text me,&rdquo; you agree to receive automated texts from DinnerDrop about your dinners and grocery list at the number above (a few a week, never ads). Msg &amp; data rates may apply. Reply STOP to stop, HELP for help. Included free for your first 14 days of Family.
          </p>
        </div>
      )}
    </div>
  )
}
