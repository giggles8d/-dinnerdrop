'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * "Enter the 6-digit code we emailed you" — the sign-in path inside the phone app,
 * where a magic link would open Safari instead of the app.
 */
export default function EmailCodeSignIn({ email, onBack, onDone }: { email: string; onBack: () => void; onDone: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  const supabase = createClient()

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    const token = code.replace(/\D/g, '')
    if (token.length < 6) { setError('Enter the 6-digit code from the email.'); return }
    setBusy(true); setError('')
    let { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (err) ({ error: err } = await supabase.auth.verifyOtp({ email, token, type: 'magiclink' }))
    if (err) { setError('That code didn’t work. Check the newest email, or send a new code.'); setBusy(false); return }
    onDone()
  }

  async function resend() {
    setError(''); setResent(false)
    const r = await fetch('/api/auth/email-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Could not send a new code.')
    else setResent(true)
  }

  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="text-6xl">📩</div>
      <h1 className="text-3xl font-heading font-bold text-foreground">Check your email</h1>
      <p className="text-muted-foreground leading-relaxed">
        We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Type it here to sign in.
      </p>
      {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-left">{error}</div>}
      <form onSubmit={verify} className="space-y-4">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className="block w-full rounded-md border border-input bg-background px-3 py-3 text-center text-2xl tracking-[0.4em] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-3 text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-xs text-muted-foreground">
        {resent ? 'New code sent. ' : 'No email? Check spam, '}
        <button onClick={resend} className="text-primary hover:underline font-medium">send a new code</button>
        {', or '}
        <button onClick={onBack} className="text-primary hover:underline font-medium">use a different email</button>.
      </p>
    </div>
  )
}
