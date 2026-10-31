'use client'

import { useEffect } from 'react'

// Replaces Next's bare "Application error" page: reports the exception to the
// server log and gives the family a way back.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      fetch('/api/client-error', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ message: error?.message, stack: error?.stack, digest: error?.digest, url: location.href, ua: navigator.userAgent }),
      }).catch(() => {})
    } catch { /* ignore */ }
  }, [error])
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-sm">We hit a snag loading this page. It&apos;s been reported — try again, or head back to your dinners.</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => reset()} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Try again</button>
        <a href="/dashboard" className="px-4 py-2 rounded-md border border-border text-sm font-medium">My dinners</a>
      </div>
      {error?.digest && <p className="text-[11px] text-muted-foreground">ref {error.digest}</p>}
    </div>
  )
}
