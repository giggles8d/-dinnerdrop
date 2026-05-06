'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid')
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!uid) { setStatus('error'); return }
    fetch('/api/email/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    })
      .then(() => setStatus('done'))
      .catch(() => setStatus('done'))
  }, [uid])

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
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground">You&apos;re unsubscribed</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You won&apos;t receive any more trial emails from DinnerDrop.
              Your account and meal plans are still active.
            </p>
            <a href="/" className="inline-block mt-2 text-sm font-medium text-primary hover:underline">
              ← Back to DinnerDrop
            </a>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-heading font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              This unsubscribe link may be invalid. Email us at{' '}
              <a href="mailto:info@dinnerdrop.app" className="text-primary underline">info@dinnerdrop.app</a>
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
