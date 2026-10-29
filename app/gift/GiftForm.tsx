'use client'
import { useState } from 'react'
import { GIFT_PLAN_OPTIONS } from './plans'

export default function GiftForm() {
  const [plan, setPlan] = useState<'3' | '6' | '12'>('3')
  const [f, setF] = useState({ buyerName: '', buyerEmail: '', recipientName: '', recipientEmail: '', message: '' })
  const [deliver, setDeliver] = useState<'now' | 'me'>('now')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function go(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/gift/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, ...f, deliver: f.recipientEmail ? deliver : 'me' }) })
      const j = await r.json()
      if (j.url) { window.location.href = j.url; return }
      setErr(j.error || 'Something went wrong — please try again.')
    } catch { setErr('Something went wrong — please try again.') }
    setBusy(false)
  }

  const input = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  return (
    <form onSubmit={go} className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Choose a gift</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {GIFT_PLAN_OPTIONS.map((p) => (
            <button type="button" key={p.id} onClick={() => setPlan(p.id)} aria-pressed={plan === p.id}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${plan === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <p className="font-heading font-bold text-lg text-foreground">{p.label}</p>
              <p className="text-2xl font-bold text-primary">{p.price}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.note}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm space-y-1"><span className="font-medium text-foreground">Their name</span><input className={input} value={f.recipientName} onChange={set('recipientName')} placeholder="The Garcia family" maxLength={80} required /></label>
        <label className="text-sm space-y-1"><span className="font-medium text-foreground">Their email <span className="text-muted-foreground font-normal">(optional)</span></span><input className={input} type="email" value={f.recipientEmail} onChange={set('recipientEmail')} placeholder="maria@example.com" maxLength={200} /></label>
        <label className="text-sm space-y-1"><span className="font-medium text-foreground">Your name</span><input className={input} value={f.buyerName} onChange={set('buyerName')} placeholder="Aunt Jen" maxLength={80} required /></label>
        <label className="text-sm space-y-1"><span className="font-medium text-foreground">Your email <span className="text-muted-foreground font-normal">(for your receipt and the code)</span></span><input className={input} type="email" value={f.buyerEmail} onChange={set('buyerEmail')} placeholder="you@example.com" maxLength={200} required /></label>
      </div>
      <label className="block text-sm space-y-1"><span className="font-medium text-foreground">A note <span className="text-muted-foreground font-normal">(optional)</span></span><textarea className={input} rows={3} value={f.message} onChange={set('message')} maxLength={300} placeholder="Congrats on the new baby — dinner's handled! ❤️" /></label>
      {f.recipientEmail && (
        <fieldset className="text-sm space-y-1.5">
          <legend className="font-medium text-foreground mb-1">How should they get it?</legend>
          <label className="flex items-center gap-2"><input type="radio" checked={deliver === 'now'} onChange={() => setDeliver('now')} className="accent-[#1a5c38]" /> Email it to them right after checkout</label>
          <label className="flex items-center gap-2"><input type="radio" checked={deliver === 'me'} onChange={() => setDeliver('me')} className="accent-[#1a5c38]" /> Send it to me — I&apos;ll give it to them (printable card included)</label>
        </fieldset>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button type="submit" disabled={busy} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 shadow-sm">
        {busy ? 'Opening checkout…' : `Continue to payment — ${GIFT_PLAN_OPTIONS.find((p) => p.id === plan)!.price}`}
      </button>
      <p className="text-xs text-muted-foreground">Secure checkout by Stripe. One-time payment — no subscription for you or them.</p>
    </form>
  )
}
