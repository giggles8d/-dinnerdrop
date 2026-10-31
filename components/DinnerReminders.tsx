'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff } from 'lucide-react'
import type { Meal } from '@/types'
import { cancelDinnerReminders, isNativeApp, listenForNotificationTaps, nativePrefGet, nativePrefSet, requestReminderPermission, scheduleDinnerReminders, tapHaptic } from '@/lib/native'

const KEY = 'dd.reminders'
type Prefs = { on: boolean; hour: number; minute: number }
const DEFAULT: Prefs = { on: false, hour: 16, minute: 30 }

const TIMES: Array<{ label: string; hour: number; minute: number }> = [
  { label: '3:00 PM', hour: 15, minute: 0 }, { label: '3:30 PM', hour: 15, minute: 30 }, { label: '4:00 PM', hour: 16, minute: 0 },
  { label: '4:30 PM', hour: 16, minute: 30 }, { label: '5:00 PM', hour: 17, minute: 0 }, { label: '5:30 PM', hour: 17, minute: 30 }, { label: '6:00 PM', hour: 18, minute: 0 },
]

/**
 * Native app only: on-device "Tonight: <dinner>" reminders built from this
 * week's plan. Scheduled locally with the phone's notification system — the
 * server never sends anything. Renders nothing on the website.
 */
export default function DinnerReminders({ meals }: { meals: Meal[] }) {
  const router = useRouter()
  const [native, setNative] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT)
  const [loaded, setLoaded] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!isNativeApp()) return
    setNative(true)
    listenForNotificationTaps((url) => router.push(url))
    nativePrefGet(KEY).then((v) => { if (v) { try { setPrefs({ ...DEFAULT, ...JSON.parse(v) }) } catch { /* keep default */ } } setLoaded(true) })
  }, [router])

  // Re-schedule whenever the plan or the chosen time changes.
  useEffect(() => {
    if (!native || !loaded) return
    if (!prefs.on) { cancelDinnerReminders(); return }
    if (!meals.length) return
    scheduleDinnerReminders(meals.map((m) => ({ id: m.day.toLowerCase(), name: m.name, day: m.day, prepTime: m.prepTime })), { hour: prefs.hour, minute: prefs.minute })
  }, [native, loaded, prefs, meals])

  async function save(next: Prefs) {
    setPrefs(next)
    await nativePrefSet(KEY, JSON.stringify(next))
  }

  async function toggle() {
    tapHaptic()
    if (prefs.on) { await save({ ...prefs, on: false }); return }
    const ok = await requestReminderPermission()
    if (!ok) { setDenied(true); return }
    setDenied(false)
    await save({ ...prefs, on: true })
  }

  if (!native || !loaded) return null
  const timeIdx = TIMES.findIndex((t) => t.hour === prefs.hour && t.minute === prefs.minute)

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${prefs.on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        {prefs.on ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className="font-semibold text-foreground">Dinner reminders</div>
        <div className="text-sm text-muted-foreground">
          {prefs.on ? `"Tonight: …" on your phone at ${TIMES[timeIdx]?.label ?? '4:30 PM'} each dinner night.` : 'A nudge each dinner night with what’s cooking, so 5 PM never sneaks up.'}
          {denied && <span className="text-destructive"> Notifications are off for DinnerDrop in Settings — turn them on to use reminders.</span>}
        </div>
      </div>
      {prefs.on && (
        <select value={timeIdx < 0 ? 3 : timeIdx} onChange={(e) => { const t = TIMES[Number(e.target.value)]; save({ ...prefs, hour: t.hour, minute: t.minute }) }} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" aria-label="Reminder time">
          {TIMES.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
        </select>
      )}
      <button type="button" onClick={toggle} className={`px-3 py-1.5 rounded-md text-sm font-medium ${prefs.on ? 'border border-border bg-background hover:bg-muted' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
        {prefs.on ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  )
}
