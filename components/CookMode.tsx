'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Timer, Volume2, VolumeX, Mic, MicOff } from 'lucide-react'
import type { Meal } from '@/types'

/**
 * Full-screen, big-type, one-step-at-a-time view for the stove. Keeps the
 * screen awake (Wake Lock API where supported), ingredient checklist up top,
 * and a timer when a step mentions minutes. Hands-free: reads each step aloud,
 * and (where the browser can listen) takes voice commands — "next", "back",
 * "repeat", "start timer", "stop timer". Swipe left/right also turns the page.
 */

type Recognizer = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null }

function getRecognizer(): Recognizer | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer }
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return C ? new C() : null
}

/** What a heard phrase asks for, if anything. */
export function voiceCommand(heard: string): 'next' | 'back' | 'repeat' | 'timer' | 'stoptimer' | 'ingredients' | null {
  const t = heard.toLowerCase()
  if (/\b(stop|cancel|clear)\b.*\btimer\b/.test(t)) return 'stoptimer'
  if (/\b(start|set)\b.*\btimer\b|\btimer\b.*\b(start|go)\b/.test(t)) return 'timer'
  if (/\b(repeat|again|say that|what was that|read it)\b/.test(t)) return 'repeat'
  if (/\b(back|previous|go back|last step)\b/.test(t)) return 'back'
  if (/\b(ingredients|what do i need)\b/.test(t)) return 'ingredients'
  if (/\b(next|continue|done|okay next|ok next|go on|forward)\b/.test(t)) return 'next'
  return null
}
export default function CookMode({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const [step, setStep] = useState(-1) // -1 = ingredients overview
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [timer, setTimer] = useState<number | null>(null)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)
  const [speak, setSpeak] = useState(false)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [canListen, setCanListen] = useState(false)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  const rec = useRef<Recognizer | null>(null)
  const wantListen = useRef(false)
  const touchX = useRef<number | null>(null)
  const quietUntil = useRef(0)
  const act = useRef<(c: ReturnType<typeof voiceCommand>) => void>(() => {})

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

  useEffect(() => { setCanListen(!!getRecognizer()) }, [])
  useEffect(() => () => { wantListen.current = false; try { rec.current?.stop() } catch { /* ignore */ } ; if (canSpeak) window.speechSynthesis.cancel() }, [canSpeak])

  function say(text: string) {
    if (!canSpeak || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.onend = () => { quietUntil.current = Date.now() + 700 }
    window.speechSynthesis.speak(u)
  }

  function startListening() {
    const r = getRecognizer()
    if (!r) return
    r.continuous = true
    r.interimResults = false
    r.lang = 'en-US'
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue
        const text = (e.results[i][0]?.transcript ?? '').trim()
        // Ignore our own voice reading a step aloud, and long chatter — commands are a few words.
        if ((canSpeak && window.speechSynthesis.speaking) || Date.now() < quietUntil.current || text.split(/\s+/).length > 5) continue
        setHeard(text)
        act.current(voiceCommand(text))
      }
    }
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { wantListen.current = false; setListening(false) } }
    // Browsers stop listening after a pause; keep going while hands-free is on.
    r.onend = () => { if (wantListen.current) { try { r.start() } catch { /* already started */ } } else setListening(false) }
    rec.current = r
    wantListen.current = true
    try { r.start(); setListening(true) } catch { setListening(false) }
  }
  function stopListening() {
    wantListen.current = false
    try { rec.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }

  function startTimer(minutes: number) {
    if (tick.current) { clearInterval(tick.current); tick.current = null }
    setTimer(minutes * 60)
  }

  const steps = meal.steps ?? []
  const current = step >= 0 ? steps[step] : null
  const minutesInStep = current ? Number((current.match(/(\d+)\s*(?:-\s*\d+\s*)?min/i) ?? [])[1]) : NaN
  const mm = timer !== null ? String(Math.floor(timer / 60)).padStart(2, '0') : ''
  const ss = timer !== null ? String(timer % 60).padStart(2, '0') : ''

  const ingredientsText = `You'll need: ${meal.ingredients.map((i) => [i.quantity, i.unit, i.name].filter(Boolean).join(' ')).join(', ')}.`
  const stepText = (n: number) => (n < 0 ? ingredientsText : `Step ${n + 1}. ${steps[n] ?? ''}`)

  // Read the step aloud whenever it changes (when read-aloud is on).
  useEffect(() => { if (speak || listening) say(stepText(step)) }, [step, speak]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (timer === 0 && (speak || listening)) say("Time's up.") }, [timer]) // eslint-disable-line react-hooks/exhaustive-deps

  act.current = (c) => {
    if (c === 'next') { if (step < steps.length - 1) setStep(step + 1); else say("That's the last step. Enjoy dinner!") }
    else if (c === 'back') setStep(Math.max(-1, step - 1))
    else if (c === 'repeat') say(stepText(step))
    else if (c === 'ingredients') say(ingredientsText)
    else if (c === 'timer') { if (!Number.isNaN(minutesInStep) && minutesInStep > 0) { startTimer(minutesInStep); say(`Timer started for ${minutesInStep} minutes.`) } else say("This step doesn't have a time.") }
    else if (c === 'stoptimer') { if (tick.current) clearInterval(tick.current); tick.current = null; setTimer(null); say('Timer cleared.') }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest">Cook mode · screen stays on</p>
          <h2 className="font-heading font-bold text-lg truncate">{meal.name}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canSpeak && (
            <button onClick={() => { const on = !speak; setSpeak(on); if (on) say(stepText(step)); else window.speechSynthesis.cancel() }} aria-label={speak ? 'Stop reading aloud' : 'Read steps aloud'} title={speak ? 'Stop reading aloud' : 'Read steps aloud'} className={`p-2 rounded-full ${speak ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
              {speak ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>
          )}
          {canListen && (
            <button onClick={() => (listening ? stopListening() : (startListening(), setSpeak(true), say('Hands-free is on. Say next, back, repeat, or start timer.')))} aria-label={listening ? 'Turn off hands-free' : 'Hands-free voice control'} title={listening ? 'Turn off hands-free' : 'Hands-free: say next, back, repeat, start timer'} className={`p-2 rounded-full ${listening ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
              {listening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          )}
          <button onClick={onClose} aria-label="Exit cook mode" className="p-2 rounded-full hover:bg-muted"><X className="w-6 h-6" /></button>
        </div>
      </div>
      {listening && (
        <div className="px-5 py-2 bg-primary/5 border-b border-primary/20 text-sm text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Listening — say <b>next</b>, <b>back</b>, <b>repeat</b>, <b>start timer</b>{heard ? <span className="ml-auto text-muted-foreground truncate">heard: “{heard}”</span> : null}
        </div>
      )}
      {!listening && step < 0 && (canSpeak || canListen) && (
        <p className="px-5 pt-3 text-xs text-muted-foreground">{canListen ? 'Messy hands? Tap the mic and just say “next”. Steps are read aloud.' : 'Tap the speaker to have each step read aloud.'} You can also swipe left and right.</p>
      )}

      <div
        className="flex-1 overflow-y-auto px-5 py-6"
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null }}
        onTouchEnd={(e) => {
          const x0 = touchX.current; touchX.current = null
          const x1 = e.changedTouches[0]?.clientX
          if (x0 == null || x1 == null || Math.abs(x1 - x0) < 70) return
          if (x1 < x0) setStep((s) => Math.min(steps.length - 1, s + 1)); else setStep((s) => Math.max(-1, s - 1))
        }}
      >
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
