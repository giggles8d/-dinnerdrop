'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MessageSquareText, Loader2, X } from 'lucide-react'
import type { LastCallStatus } from '@/lib/last-call'

/**
 * "Ask the family first" — texts everyone a last call before the planner orders, then shows a
 * countdown and what came in. Replies land on the list through the normal ADD / photo texting path.
 */
export default function LastCallCard({ onItems }: { onItems?: () => void }) {
  const [status, setStatus] = useState<LastCallStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [store, setStore] = useState('')
  const [minutes, setMinutes] = useState(20)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const seenItems = useRef(0)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/last-call', { cache: 'no-store' })
      if (!r.ok) return
      const j = await r.json() as LastCallStatus
      setStatus(j)
      if (j.call && j.call.items.length !== seenItems.current) { seenItems.current = j.call.items.length; onItems?.() }
    } catch { /* keep last status */ }
  }, [onItems])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    if (!status) return
    if (!store && !message) { setStore(status.defaults.store); setMinutes(status.defaults.minutes); setMessage(status.defaults.message) }
  }, [status, store, message])
  // While a call is open: poll every 10s and tick the countdown every second.
  useEffect(() => {
    if (!status?.call?.open) return
    const poll = setInterval(refresh, 10000)
    const sec = setInterval(() => setTick((t) => t + 1), 1000)
    return () => { clearInterval(poll); clearInterval(sec) }
  }, [status?.call?.open, refresh])

  if (!status) return null
  const call = status.call
  const preview = message.replace(/\{name\}/g, status.defaults.name).replace(/\{minutes\}/g, String(minutes)).replace(/\{store\}/g, store.trim() || 'the store')

  async function start() {
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/last-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', store, minutes, message }) })
      const j = await r.json()
      if (!r.ok) { setError(j?.error || 'Could not send.'); return }
      seenItems.current = 0
      setStatus(j); setOpen(false)
    } catch { setError('Could not send. Try again.') } finally { setBusy(false) }
  }
  async function close() {
    setBusy(true)
    try { const r = await fetch('/api/last-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close' }) }); if (r.ok) setStatus(await r.json()) } finally { setBusy(false) }
  }

  // ---- an open call: countdown + what came in
  if (call?.open) {
    const left = Math.max(0, call.secondsLeft - tick)
    const mm = Math.floor(left / 60), ss = left % 60
    const pct = Math.max(0, Math.min(100, (left / (call.minutes * 60)) * 100))
    return (
      <div className="mb-4 p-4 rounded-xl border border-primary/30 bg-primary/5 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-primary" /> Family has <span className="tabular-nums">{mm}:{String(ss).padStart(2, '0')}</span> to reply</p>
          <span className="text-xs text-muted-foreground">texted {call.sent_to}{call.skipped ? ` · ${call.skipped} at their weekly limit` : ''}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-[width] duration-1000" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-sm text-muted-foreground">
          {call.items.length === 0 ? 'Nothing yet — anything they text lands on the list below.' : <><b className="text-foreground">{call.items.length} added so far</b> — {call.items.map((i) => `${i.added_by ?? 'someone'}: ${i.name}`).join(' · ')}</>}
        </p>
        <button type="button" onClick={close} disabled={busy} className="mt-3 px-3 py-1.5 rounded-md bg-foreground text-primary-foreground text-xs font-semibold disabled:opacity-60">{busy ? 'Closing…' : 'Done waiting — order now'}</button>
      </div>
    )
  }

  // ---- a call that just closed: one-time summary
  if (call && !dismissed) {
    return (
      <div className="mb-4 p-4 rounded-xl border border-border bg-card print:hidden">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-foreground"><b>Last call closed</b>{call.closed_reason === 'expired' ? ' (time ran out)' : ''} — {call.items.length ? <>{call.items.length} item{call.items.length === 1 ? '' : 's'} added: {call.items.map((i) => `${i.name}${i.added_by ? ` (${i.added_by})` : ''}`).join(', ')}.</> : 'nobody needed anything.'} Your list is ready to order.</p>
          <button type="button" onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      </div>
    )
  }

  // ---- not eligible: show nothing (or a quiet-hours note so the button's absence isn't confusing)
  if (!status.eligible) {
    if (status.reason === 'quiet_hours') return <p className="mb-3 text-xs text-muted-foreground print:hidden">Family texts are in quiet hours right now — the last call comes back in the morning.</p>
    if (status.reason === 'no_members' && status.members.length) return <p className="mb-3 text-xs text-muted-foreground print:hidden">Ask the family first works once someone has replied YES to the opt-in text (<Link href="/settings" className="underline">Settings → Family texting</Link>).</p>
    return null
  }

  // ---- the button and the sheet
  return (
    <div className="mb-4 print:hidden">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary/5">
          <MessageSquareText className="w-4 h-4" /> Ask the family first
        </button>
      ) : (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-semibold text-foreground">Text the family a last call</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">Store
              <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Aldi, Wegmans…" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">They have
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                {[10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} minutes</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs text-muted-foreground">Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
            <span className="block mt-1 text-[11px]">Placeholders: {'{name}'} {'{store}'} {'{minutes}'} · Change the default in Settings → Family texting.</span>
          </label>
          <div className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground"><span className="text-xs text-muted-foreground">They&rsquo;ll get: </span>{preview}</div>
          <p className="text-xs text-muted-foreground">Goes to: {status.members.filter((m) => m.ok).map((m) => m.name).join(', ')}{status.members.some((m) => !m.ok) ? ` (not ${status.members.filter((m) => !m.ok).map((m) => m.name).join(', ')} — not opted in)` : ''}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={start} disabled={busy || !message.trim()} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">{busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send the text'}</button>
            <button type="button" onClick={() => { setOpen(false); setError(null) }} disabled={busy} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
