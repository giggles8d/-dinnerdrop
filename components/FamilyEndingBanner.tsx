'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Shown in the last 5 days of a free Family plan (family_until), to families who aren't paying (lib/family-ending
 * sends the matching email 3 days out). Web only: the iOS app never sells the subscription. Hide for today with ×.
 */
export default function FamilyEndingBanner({ familyUntil }: { familyUntil: string }) {
  const end = new Date(familyUntil)
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000)
  const key = `dd_family_ending_hidden_${new Date().toISOString().slice(0, 10)}`
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === '1' } catch { return false } })
  if (hidden || days < 0 || days > 5) return null
  const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `on ${end.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
  return (
    <div className="web-only relative mb-6 rounded-xl border-2 border-primary/30 bg-secondary px-5 py-4 pr-10">
      <p className="text-sm font-semibold text-foreground">Your free Family plan ends {when}.</p>
      <p className="text-xs text-muted-foreground mt-1">Family dinner votes by text, the shared list and everyone&apos;s preferences stop then. Your weekly plan and Instacart cart stay free.</p>
      <Link href="/subscribe?utm_source=app&utm_medium=banner&utm_campaign=family_ending" className="mt-3 inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
        Keep Family: $4.99/mo, $0 today
      </Link>
      <button type="button" aria-label="Hide for today" onClick={() => { try { localStorage.setItem(key, '1') } catch { /* ignore */ } setHidden(true) }}
        className="absolute top-2 right-3 text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
    </div>
  )
}
