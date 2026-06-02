'use client'

import { useEffect, useState } from 'react'

interface Entry {
  initial: string
  createdAt: string
  familySize: number | null
}

// Renders a small "live" social-proof ticker showing recent beta signups.
// Rotates every 8s. Falls back silently to nothing if the feed is empty
// (e.g. very early beta) so we never display "0 families joined" — which
// would be social proof in the wrong direction.
export default function RecentSignupsTicker() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [index, setIndex] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // Fetch entries on mount + every 5 minutes.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/stats/signups-ticker', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data?.entries)) setEntries(data.entries)
      } catch {
        // Silent failure — ticker just hides
      }
    }
    load()
    const fetchInterval = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(fetchInterval)
    }
  }, [])

  // Rotate the displayed entry every 8s and refresh "X min ago" timestamp every 60s.
  useEffect(() => {
    if (entries.length <= 1) return
    const rotation = setInterval(() => {
      setIndex((i) => (i + 1) % entries.length)
    }, 8000)
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      clearInterval(rotation)
      clearInterval(tick)
    }
  }, [entries.length])

  if (entries.length === 0) return null

  const current = entries[index] ?? entries[0]
  const ago = relativeTime(current.createdAt, now)
  const family = current.familySize && current.familySize > 1
    ? `family of ${current.familySize}`
    : 'family'

  return (
    <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border w-fit mx-auto" style={{ borderColor: '#1a5c38', backgroundColor: '#f0f9f4', color: '#1a5c38' }}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#22c55e' }} />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#22c55e' }} />
      </span>
      <span>
        <strong>{current.initial}.</strong> &middot; {family} joined {ago}
      </span>
    </div>
  )
}

function relativeTime(iso: string, now: number): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'just now'
  const diff = Math.max(0, Math.floor((now - then) / 1000))
  if (diff < 60) return 'just now'
  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return 'this week'
}
