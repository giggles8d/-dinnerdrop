'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function HelpForm() {
  const [email, setEmail] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')
  useEffect(() => { createClient().auth.getUser().then(({ data }) => { if (data.user?.email) { setEmail(data.user.email); setSignedIn(true) } }).catch(() => {}) }, [])
  async function send(e: React.FormEvent) {
    e.preventDefault(); setState('sending'); setErr('')
    try {
      const r = await fetch('/api/help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, email, page: document.referrer || '' }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not send')
      setState('sent')
    } catch (x) { setErr(x instanceof Error ? x.message : 'Could not send'); setState('error') }
  }
  if (state === 'sent') return <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm text-foreground">Got it — Sarah reads every message and replies to <b>{email}</b>, usually within a day.</div>
  return (
    <form onSubmit={send} className="space-y-3">
      {!signedIn && <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />}
      <textarea required minLength={5} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, or what do you need? Screenshots can go to sarah@dinnerdrop.app." className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
      {signedIn && <p className="text-xs text-muted-foreground">We&apos;ll reply to {email} and can see your account, so no need to describe your setup.</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button disabled={state === 'sending'} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{state === 'sending' ? 'Sending…' : 'Send to Sarah'}</button>
    </form>
  )
}
