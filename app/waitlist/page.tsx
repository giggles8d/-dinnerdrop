'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Something went wrong — please try again.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg('Connection error — please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
        </div>

        {status === 'success' ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">&#10003;</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-foreground">You&apos;re on the list!</h1>
            <p className="text-muted-foreground">
              We&apos;ll email you the moment a spot opens. DinnerDrop is worth the wait.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-sm text-primary hover:underline"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs font-semibold text-accent">
                All 100 beta spots claimed
              </div>
              <h1 className="text-3xl font-heading font-bold text-foreground">
                You just missed the beta
              </h1>
              <p className="text-muted-foreground">
                All 100 founding member spots are taken. Join the waitlist and we&apos;ll reach out the moment more open up.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <p className="text-sm font-semibold text-foreground">Waitlist spots open soon</p>
              <div className="text-left space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">&rsaquo;</span>
                  <span>6 months free — same deal as founding members</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">&rsaquo;</span>
                  <span>5 AI-planned dinners every week</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">&rsaquo;</span>
                  <span>One-tap grocery handoff to any store</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {status === 'loading' ? 'Joining...' : 'Join the waitlist'}
              </button>
              <p className="text-xs text-muted-foreground">No spam. Email only when a spot opens.</p>
            </form>

            <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              &larr; Back to DinnerDrop
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
