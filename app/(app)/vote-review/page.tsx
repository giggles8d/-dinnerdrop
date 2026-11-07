'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, X, Repeat, Plus } from 'lucide-react'
import type { Meal } from '@/types'

interface Draft { candidates: Meal[]; picksNeeded: number; sendAt: string; weekStart: string }
type Fav = { name: string; meal: Meal }

/** Check the dinner vote before the family gets it: drop, swap (a favorite or anything typed), add, send. */
export default function VoteReviewPage() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [favs, setFavs] = useState<Fav[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState<number | 'add' | null>(null)
  const [dish, setDish] = useState('')
  const [fav, setFav] = useState('')
  const [sent, setSent] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await (await fetch('/api/vote/draft', { cache: 'no-store' })).json()
      setDraft(d.draft); setFavs(d.favorites ?? [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key); setMsg('')
    try {
      const r = await fetch('/api/vote/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setMsg(d.error || 'That didn\'t work.'); return }
      if (body.action === 'send') { setSent(d.sent ?? 0); setDraft(null); return }
      setDraft((cur) => (cur ? { ...cur, candidates: d.candidates } : cur))
      setEditing(null); setDish(''); setFav('')
    } finally { setBusy('') }
  }

  const sendAt = draft ? new Date(draft.sendAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : ''

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-heading font-bold text-foreground">Check the vote</h1>
        {sent !== null ? (
          <p className="mt-4 text-foreground">✅ Sent to {sent} {sent === 1 ? 'person' : 'people'}. Follow along on <Link href="/texts" className="underline">Texts</Link>.</p>
        ) : !draft ? (
          <div className="mt-4 space-y-2 text-muted-foreground">
            <p>There&apos;s no vote waiting for you right now.</p>
            <p className="text-sm">To check each week&apos;s dinners before the family sees them, turn on <b>&quot;Let me check the vote before the family gets it&quot;</b> in <Link href="/settings" className="underline">Settings → Family texting</Link>.</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mt-1">The family hasn&apos;t seen this yet. Change anything you like, then send it. If you don&apos;t, it goes out {sendAt}.</p>
            <p className="text-xs text-muted-foreground mt-1">They&apos;ll pick {draft.picksNeeded} of these.</p>
            {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
            <ol className="mt-5 space-y-2">
              {draft.candidates.map((m, i) => (
                <li key={`${m.name}-${i}`} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{(m.prepTime ?? 0) + (m.cookTime ?? 0)} min{m.familyRecipe ? ' · family recipe' : ''}{m.ideaBy ? ` · ${m.ideaBy}'s idea` : ''}</p>
                    </div>
                    <button onClick={() => { setEditing(editing === i ? null : i); setDish(''); setFav('') }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted/40"><Repeat className="w-3.5 h-3.5" />Swap</button>
                    <button onClick={() => post({ action: 'drop', n: i + 1 }, `drop${i}`)} disabled={!!busy} aria-label={`Remove ${m.name}`} className="p-1.5 rounded-md border border-border hover:bg-muted/40 disabled:opacity-50">
                      {busy === `drop${i}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {editing === i && <Picker favs={favs} dish={dish} setDish={setDish} fav={fav} setFav={setFav} busy={busy === `swap${i}`} label="Swap in"
                    onGo={() => post({ action: 'swap', n: i + 1, ...(fav ? { favorite: fav } : { dish }) }, `swap${i}`)} />}
                </li>
              ))}
            </ol>
            <div className="mt-3">
              {editing === 'add' ? (
                <div className="rounded-xl border border-dashed border-border p-3"><Picker favs={favs} dish={dish} setDish={setDish} fav={fav} setFav={setFav} busy={busy === 'add'} label="Add"
                  onGo={() => post({ action: 'add', ...(fav ? { favorite: fav } : { dish }) }, 'add')} /></div>
              ) : (
                <button onClick={() => { setEditing('add'); setDish(''); setFav('') }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Plus className="w-4 h-4" />Add a dinner</button>
              )}
            </div>
            <button onClick={() => post({ action: 'send' }, 'send')} disabled={!!busy} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send to the family
            </button>
            <p className="mt-3 text-xs text-muted-foreground">You can also do this by text: reply SEND, DROP 3, SWAP 3 FOR tacos, or ADD DINNER chili.</p>
          </>
        )}
      </div>
    </div>
  )
}

function Picker({ favs, dish, setDish, fav, setFav, busy, label, onGo }: { favs: Fav[]; dish: string; setDish: (v: string) => void; fav: string; setFav: (v: string) => void; busy: boolean; label: string; onGo: () => void }) {
  return (
    <div className="mt-3 flex flex-col sm:flex-row gap-2">
      {favs.length > 0 && (
        <select value={fav} onChange={(e) => { setFav(e.target.value); if (e.target.value) setDish('') }} className="rounded-md border border-input bg-background px-2 py-2 text-sm sm:w-56">
          <option value="">Pick a favorite…</option>
          {favs.map((f) => <option key={f.name} value={f.name}>{f.meal?.familyRecipe ? '★ ' : ''}{f.name}</option>)}
        </select>
      )}
      <input value={dish} onChange={(e) => { setDish(e.target.value); if (e.target.value) setFav('') }} maxLength={80} placeholder="…or type any dinner (e.g. tacos)" className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <button onClick={onGo} disabled={busy || (!dish.trim() && !fav)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}{label}
      </button>
    </div>
  )
}
