'use client'

import { useEffect, useState } from 'react'

const CLOSE = new Date('2026-10-21T04:00:00Z')   // Oct 21, 2026, midnight Eastern

/** Countdown banner for /mealime: how long is left to copy favorites out of Mealime. Disappears after the shutdown. */
export default function MealimeDeadline() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t) }, [])
  if (!now) return null
  const ms = CLOSE.getTime() - now.getTime()
  if (ms <= 0) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
        <strong>Mealime has closed.</strong> If you saved your favorites&apos; names anywhere — a note, a screenshot, memory — paste them below and DinnerDrop rebuilds them.
      </div>
    )
  }
  const days = Math.floor(ms / 86_400_000), hours = Math.floor((ms % 86_400_000) / 3_600_000)
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-bold">⏳ {days > 0 ? `${days} day${days === 1 ? '' : 's'} ${hours} hr` : `${hours} hour${hours === 1 ? '' : 's'}`} until Mealime closes.</span>
      <span>Open Mealime now, copy your favorites&apos; names, and paste them below — that is the only step that can&apos;t be done after October 21.</span>
    </div>
  )
}
