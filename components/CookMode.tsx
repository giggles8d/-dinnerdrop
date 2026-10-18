'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import type { Meal } from '@/types'

/**
 * Full-screen, big-type, one-step-at-a-time view for the stove. Keeps the
 * screen awake (Wake Lock API where supported), ingredient checklist up top,
 * and a timer when a step mentions minutes.
 */
export default function CookMode({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const [step, setStep] = useState(-1) // -1 = ingredients overview
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [timer, setTimer] = useState<number | null>(null)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function keepAwake() {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
        if (nav.wakeLock && !cancelled) lock.current = await nav.wakeLock.request('screen')
      } catch { /* unsupported or denied */ }
    }
    keepAwake()
    const onVis = () => { if (document.visibilityState === 'visible') keepAwake() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      lock.current?.release().catch(() => {})
      if (tick.current) clearInterval(tick.current)
    }
  }, [])

  useEffect(() => {
    if (timer === null) return
    if (timer <= 0) {
      if (tick.current) clearInterval(tick.current)
      tick.current = null
      try { navigator.vibrate?.([200, 100, 200, 100, 400]) } catch { /* ignore */ }
      return
    }
    if (!tick.current) tick.current = setInterval(() => setTimer((t) => (t === null ? null : t - 1)), 1000)
    return () => { if (tick.current && timer <= 1) { clearInterval(tick.current); tick.current = null } }
  }, [timer])

  function startTimer(minutes: number) {
    if (tick.current) { clearInterval(tick.current); tick.current = null }
    setTimer(minutes * 60)
  }

  const steps = meal.steps ?? []
  const current = step >= 0 ? steps[step] : null
  const minutesInStep = current ? Number((current.match(/(\d+)\s*(?:-\s*\d+\s*)?min/i) ?? [])[1]) : NaN
  const mm = timer !== null ? String(Math.floor(timer / 60)).padStart(2, '0') : ''
  const ss = timer !== null ? String(timer % 60).padStart(2, '0') : ''

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest">Cook mode · screen stays on</p>
          <h2 className="font-heading font-bold text-lg truncate">{meal.name}</h2>
        </div>
        <button onClick={onClose} aria-label="Exit cook mode" className="p-2 rounded-full hover:bg-muted"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {step < 0 ? (
          <div className="max-w-xl mx-auto">
            <h3 className="text-2xl font-heading font-bold mb-1">Get everything out</h3>
            <p className="text-muted-foreground mb-5">Tap each as you set it on the counter.</p>
            <ul className="space-y-2">
              {meal.ingredients.map((ing, i) => (
                <li key={i}>
                  <button onClick={() => setChecked((c) => { const n = new Set(c); if (n.has(i)) n.delete(i); else n.add(i); return n })} className={`w-full flex items-center gap-4 rounded-xl border px-4 py-4 text-left text-lg ${checked.has(i) ? 'bg-muted/60 border-border text-muted-foreground line-through' : 'border-border'}`}>
                    <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${checked.has(i) ? 'bg-primary border-primary' : 'border-border'}`}>{checked.has(i) && <span className="text-primary-foreground text-sm">✓</span>}</span>
                    <span className="flex-1">{ing.name}</span>
                    <span className="text-base text-muted-foreground">{ing.quantity} {ing.unit}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <p className="text-sm font-semibold text-primary mb-3">Step {step + 1} of {steps.length}</p>
            <p className="text-2xl sm:text-3xl leading-snug font-medium">{current}</p>
            {!Number.isNaN(minutesInStep) && minutesInStep > 0 && timer === null && (
              <button onClick={() => startTimer(minutesInStep)} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-primary/30 text-primary font-semibold text-lg">
                <Timer className="w-5 h-5" /> Start {minutesInStep}-minute timer
              </button>
            )}
            {timer !== null && (
              <div className={`mt-6 rounded-2xl p-5 text-center ${timer <= 0 ? 'bg-accent/20' : 'bg-muted'}`}>
                <p className="text-5xl font-heading font-bold tabular-nums">{timer <= 0 ? 'Done!' : `${mm}:${ss}`}</p>
                <button onClick={() => { if (tick.current) clearInterval(tick.current); tick.current = null; setTimer(null) }} className="mt-2 text-sm text-muted-foreground underline">clear</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button onClick={() => setStep((s) => Math.max(-1, s - 1))} disabled={step < 0} className="inline-flex items-center gap-1 px-4 py-3 rounded-xl border border-border font-semibold disabled:opacity-40"><ChevronLeft className="w-5 h-5" /> Back</button>
        {step < steps.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg">{step < 0 ? 'Start cooking' : 'Next'} <ChevronRight className="w-5 h-5" /></button>
        ) : (
          <button onClick={onClose} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-lg">Dinner&apos;s ready 🎉</button>
        )}
      </div>
    </div>
  )
}
