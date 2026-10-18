'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Candidate { name: string; cookTime?: number; votes: number; by: string[] }
interface Round { id: string; week_start: string; picks_needed: number; created_at: string; candidates: Candidate[] }
interface Person { name: string; status: string }

/** Dashboard card: the family vote in progress — who's answered, running tally, close now. */
export default function FamilyVoteCard({ onClosed }: { onClosed?: () => void }) {
  const [round, setRound] = useState<Round | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/vote-round', { cache: 'no-store' })
      const j = await r.json()
      setRound(j.round ?? null); setPeople(j.people ?? [])
    } catch { /* ignore */ } finally { setLoaded(true) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t) }, [load])

  if (!loaded || !round) return null
  const answered = people.filter((p) => p.status === 'answered').length
  const waiting = people.filter((p) => p.status === 'sent, waiting' || p.status === 'waiting for YES')
  const max = Math.max(1, ...round.candidates.map((c) => Math.max(0, c.votes)))
  const ranked = [...round.candidates].map((c, i) => ({ ...c, i })).sort((a, b) => b.votes - a.votes || a.i - b.i)
  const cutoff = ranked[round.picks_needed - 1]?.votes ?? 0

  async function closeNow() {
    if (!confirm(`Set the week from the votes so far? ${waiting.length ? `${waiting.map((p) => p.name).join(', ')} haven't answered yet.` : ''}`)) return
    setBusy(true)
    try { await fetch('/api/vote-round', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close' }) }); await load(); onClosed?.() } finally { setBusy(false) }
  }

  return (
    <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Family vote in progress</p>
          <h2 className="text-xl font-heading font-bold text-foreground mt-1">Week of {new Date(round.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {answered} of {people.filter((p) => p.status !== 'opted out' && p.status !== 'no vote').length} answered</h2>
          <p className="text-xs text-muted-foreground mt-1">The top {round.picks_needed} become the week when everyone&apos;s in (or after 24h). You&apos;ll get a text.</p>
        </div>
        <button onClick={closeNow} disabled={busy} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 whitespace-nowrap">{busy ? 'Setting the week…' : 'Close the vote & set the week'}</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {people.map((p) => (
          <span key={p.name} className={`text-xs px-2.5 py-1 rounded-full border ${p.status === 'answered' ? 'bg-primary text-primary-foreground border-primary' : p.status === 'opted out' ? 'bg-muted text-muted-foreground border-border line-through' : 'bg-white text-foreground border-border'}`}>
            {p.name} · {p.status}
          </span>
        ))}
      </div>
      <ol className="space-y-1.5">
        {round.candidates.map((c, i) => {
          const inTop = c.votes >= cutoff && ranked.findIndex((r) => r.name === c.name) < round.picks_needed
          return (
            <li key={c.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-sm">
              <span className="text-muted-foreground">{i + 1}.</span>
              <div className="min-w-0">
                <div className={`truncate ${inTop ? 'font-semibold text-foreground' : 'text-foreground'}`}>{c.name}{c.cookTime ? <span className="text-xs text-muted-foreground"> · {c.cookTime} min</span> : null}</div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden"><div className={`h-full ${inTop ? 'bg-primary' : 'bg-muted-foreground/40'}`} style={{ width: `${(Math.max(0, c.votes) / max) * 100}%` }} /></div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap" title={c.by.join(', ')}>{c.votes} {c.votes === 1 ? 'vote' : 'votes'}{c.by.length ? ` · ${c.by.join(', ')}` : ''}</span>
            </li>
          )
        })}
      </ol>
      <p className="text-[11px] text-muted-foreground mt-3">Add numbers yourself under <Link href="/settings" className="underline">Settings → Family texting</Link>, or text the family again from there.</p>
    </div>
  )
}
