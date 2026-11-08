'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquareText, X } from 'lucide-react'

/**
 * Dashboard card: set up family texting in one step (phone numbers → texting on → opt-in texts).
 * Shows once a family has a plan and nobody has a number yet; dismissable for 14 days.
 * ?texting=1 (from emails) opens it even if dismissed.
 */
export default function TextingNudge({ forceOpen = false }: { forceOpen?: boolean }) {
  const [show, setShow] = useState(false)
  const [family, setFamily] = useState(false)
  const [hasMine, setHasMine] = useState(false)
  const [mine, setMine] = useState('')
  const [rows, setRows] = useState([{ name: '', phone: '' }, { name: '', phone: '' }])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [needsFamily, setNeedsFamily] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let dismissed = false
    try { const t = Number(localStorage.getItem('dd_texting_nudge_dismissed') || 0); dismissed = Date.now() - t < 14 * 86400000 } catch { /* ignore */ }
    if (dismissed && !forceOpen) return
    fetch('/api/texting/quick-setup').then((r) => r.json()).then((j) => { setShow(!!j.show || forceOpen); setFamily(!!j.family); setHasMine(!!j.hasOwnerPhone) }).catch(() => {})
  }, [forceOpen])

  function dismiss() { try { localStorage.setItem('dd_texting_nudge_dismissed', String(Date.now())) } catch { /* ignore */ } setShow(false) }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/texting/quick-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerPhone: mine, members: rows.filter((x) => x.phone.trim()) }) })
      const j = await r.json()
      if (!r.ok) { setErr(j.error || 'Something went wrong'); return }
      if (j.familyRequired) { setNeedsFamily(true); return }
      setDone(j.sent ? `Done. ${j.sent === 1 ? 'They get' : `${j.sent} people get`} a text now. As soon as someone replies YES, the family's first dinner vote goes out.` : 'Saved. Texts go out as soon as texting is switched on.')
    } catch { setErr('Something went wrong') } finally { setBusy(false) }
  }

  if (!show) return null
  return (
    // In the iOS app, families without Family access never see this card: it would point at a plan the app does not sell.
    <div className={`mb-6 rounded-2xl border border-primary/20 bg-secondary/40 p-5 relative ${family ? '' : 'web-only'}`}>
      <button onClick={dismiss} aria-label="Not now" className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><MessageSquareText className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-foreground text-lg">Add your family. They pick dinner by text.</p>
          <p className="text-sm text-muted-foreground mt-0.5">Add their numbers and DinnerDrop texts everyone dinner ideas to vote on. The first vote goes out as soon as someone replies YES, not next week. Anyone can text <span className="font-semibold text-foreground">ADD milk</span> to put it on the list.</p>
          {done ? (
            <p className="mt-3 text-sm font-medium text-primary">{done}</p>
          ) : needsFamily ? (
            <div className="mt-3">
              <p className="text-sm text-foreground">Numbers saved. Family texting is part of the Family plan — start the free 14-day trial and the texts go out right away.</p>
              <Link href="/subscribe?auto=1" className="web-only inline-block mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Start my free trial →</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-3 grid sm:grid-cols-3 gap-2">
              {!hasMine && <input value={mine} onChange={(e) => setMine(e.target.value)} inputMode="tel" placeholder="Your mobile number" className="px-3 py-2 rounded-lg border border-border bg-background text-sm" />}
              {rows.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input value={r.name} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name" className="w-2/5 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  <input value={r.phone} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} inputMode="tel" placeholder="Mobile number" className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                </div>
              ))}
              <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? 'Setting up…' : 'Text my family'}</button>
                <span className="text-xs text-muted-foreground">{family ? 'Each person gets one text asking them to reply YES.' : 'Included with Family — 14 days free, cancel anytime.'}</span>
                {err && <span className="text-xs text-red-600">{err}</span>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
