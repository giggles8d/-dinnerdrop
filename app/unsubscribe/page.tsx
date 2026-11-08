'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const REASONS = [
  { id: 'too_many', label: 'Too many emails' },
  { id: 'not_useful', label: "The emails weren't useful to me" },
  { id: 'not_using', label: "I don't use DinnerDrop anymore" },
  { id: 'never_signed_up', label: "I didn't sign up for this" },
  { id: 'other', label: 'Something else' },
]

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid')
  const email = searchParams.get('email')
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [resub, setResub] = useState<'' | 'sending' | 'done'>('')

  async function sendReason(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) return
    setSending(true)
    try {
      await fetch('/api/email/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(uid ? { uid } : { email }), action: 'reason', reason, note: note.trim() }) })
    } catch { /* thanks either way */ }
    setSent(true); setSending(false)
  }

  async function resubscribe() {
    if (!uid) return
    setResub('sending')
    try {
      const r = await fetch('/api/email/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, action: 'resubscribe' }) })
      setResub(r.ok ? 'done' : '')
    } catch { setResub('') }
  }

  useEffect(() => {
    if (!uid && !email) { setStatus('error'); return }
    fetch('/api/email/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uid ? { uid } : { email }),
    })
      .then(() => setStatus('done'))
      .catch(() => setStatus('done'))
  }, [uid, email])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
        </div>
        {status === 'loading' && (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Unsubscribing...</p>
          </div>
        )}
        {status === 'done' && (
          <div className="space-y-5">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {resub === 'done' ? (
              <>
                <h1 className="text-2xl font-heading font-bold text-foreground">You&apos;re back on the list</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">Your weekly email will keep coming. Thanks for sticking with us.</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-heading font-bold text-foreground">Sorry to see you go</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You won&apos;t get any more emails from DinnerDrop.
                  {uid ? ' Your account and meal plans are still here whenever you want them.' : ''}
                </p>
              </>
            )}

            {resub !== 'done' && (sent ? (
              <div className="rounded-xl bg-secondary/60 px-4 py-4 text-sm text-foreground">
                Thank you. That really helps a small team like ours. — Sarah
              </div>
            ) : (
              <form onSubmit={sendReason} className="text-left rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">If you have a second, why are you leaving? <span className="text-muted-foreground font-normal">(optional)</span></p>
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label key={r.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm cursor-pointer ${reason === r.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-[hsl(var(--primary))]" />
                      {r.label}
                    </label>
                  ))}
                </div>
                {reason && (
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
                    placeholder={reason === 'other' ? 'Tell us what happened' : 'Anything we could do better? (optional)'}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
                )}
                <button type="submit" disabled={!reason || sending} className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-40">
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            ))}

            {uid && resub !== 'done' && (
              <p className="text-xs text-muted-foreground">
                Unsubscribed by mistake?{' '}
                <button type="button" onClick={resubscribe} disabled={resub === 'sending'} className="text-primary underline">
                  {resub === 'sending' ? 'Turning emails back on…' : 'Turn my emails back on'}
                </button>
              </p>
            )}
            <a href="/" className="inline-block text-sm font-medium text-primary hover:underline">
              ← Back to DinnerDrop
            </a>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-heading font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              This unsubscribe link may be invalid. Email us at{' '}
              <a href="mailto:sarah@dinnerdrop.app" className="text-primary underline">sarah@dinnerdrop.app</a>
              {' '}and we&apos;ll remove you immediately.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
