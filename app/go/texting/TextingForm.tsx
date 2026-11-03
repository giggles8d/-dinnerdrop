'use client'
import { useState } from 'react'

const input = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base'

export default function TextingForm({ u, s }: { u: string; s: string }) {
  const [mine, setMine] = useState('')
  const [rows, setRows] = useState([{ name: '', phone: '' }, { name: '', phone: '' }, { name: '', phone: '' }])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/go/texting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u, s, ownerPhone: mine, members: rows.filter((r) => r.phone.trim()) }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error || 'Something went wrong. Try again.'); return }
      if (j.familyRequired) setDone('Numbers saved. Family texting is part of the Family plan — sign in to DinnerDrop to turn it on.')
      else setDone(j.sent ? `Done! ${j.sent} invite${j.sent === 1 ? '' : 's'} sent. Each person replies YES to join, then they’ll get this week’s dinners to vote on.` : 'Numbers saved. Texting is on.')
    } catch { setErr('Something went wrong. Try again.') } finally { setBusy(false) }
  }

  if (done) return <div className="rounded-xl border border-primary/30 bg-secondary/40 p-5 text-foreground">{done}</div>
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-foreground">Your mobile number</span>
        <input value={mine} onChange={(e) => setMine(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" className={`${input} mt-1`} />
      </label>
      <div>
        <span className="text-sm font-semibold text-foreground">Family members</span>
        <div className="mt-1 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input value={r.name} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={i === 0 ? 'Partner' : 'Kid / grandparent'} className={`${input} w-2/5`} />
              <input value={r.phone} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} inputMode="tel" placeholder="Mobile number" className={`${input} flex-1`} />
            </div>
          ))}
        </div>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Setting up…' : 'Text them the invite'}</button>
    </form>
  )
}
