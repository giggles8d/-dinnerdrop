'use client'

import { useEffect, useState } from 'react'

// Maple's site says Dec 31 2026; its in-app notice reportedly says Nov 30. Count down to the earlier one first.
const IN_APP = new Date('2026-12-01T05:00:00Z')   // end of Nov 30, Eastern
const SITE = new Date('2027-01-01T05:00:00Z')     // end of Dec 31, Eastern

/** Countdown banner for /maple: time left to copy dinners out of Maple. */
export default function MapleDeadline() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t) }, [])
  if (!now) return null
  if (now >= SITE) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
        <strong>Maple has closed.</strong> If you saved your dinners anywhere — a note, a screenshot, memory — paste the names below and DinnerDrop brings them in.
      </div>
    )
  }
  const target = now < IN_APP ? IN_APP : SITE
  const ms = target.getTime() - now.getTime()
  const days = Math.floor(ms / 86_400_000), hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const left = days > 0 ? `${days} day${days === 1 ? '' : 's'} ${hours} hr` : `${hours} hour${hours === 1 ? '' : 's'}`
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-bold">⏳ {left} until {target === IN_APP ? 'November 30' : 'Maple closes on December 31'}.</span>
      <span>{target === IN_APP
        ? 'Maple’s site says December 31, but some families say the app’s own notice says November 30. Copy your dinners out before then to be safe.'
        : 'After that, Maple deletes everything with no way to get it back. Copy your dinners’ names now.'}</span>
    </div>
  )
}
